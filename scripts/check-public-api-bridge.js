const { mkdtemp, rm } = require('node:fs/promises');
const { readFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { ConfigService } = require('@nestjs/config');
const { FastifyAdapter } = require('@nestjs/platform-fastify');
const { Test } = require('@nestjs/testing');

const root = process.cwd();

function fail(message) {
  throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
}

function getPinnedReleaseSources() {
  const config = readJson('dataset-releases.json');

  if (!Array.isArray(config.sources)) {
    fail('dataset-releases.json must include a sources array');
  }

  return config.sources;
}

function assertPathExists(document, pathName, label) {
  if (!document.paths?.[pathName]) {
    fail(`${label} is missing ${pathName}`);
  }
}

function assertStatus(response, expectedStatus, pathName) {
  if (response.statusCode !== expectedStatus) {
    fail(`${pathName} returned ${response.statusCode}, expected ${expectedStatus}`);
  }
}

function assertContainsAll(actualValues, expectedValues, label) {
  const actual = new Set(actualValues);

  for (const expectedValue of expectedValues) {
    if (!actual.has(expectedValue)) {
      fail(`${label} is missing ${expectedValue}`);
    }
  }
}

function restoreEnv(originalEnv) {
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

async function getJson(app, pathName) {
  const response = await app.inject({
    method: 'GET',
    url: pathName,
  });

  assertStatus(response, 200, pathName);

  return response.json();
}

async function main() {
  const tempReleasesDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-api-bridge-'));
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    APP_DOCS_ENABLED: process.env.APP_DOCS_ENABLED,
    DATASETS_RELEASES_DIR: process.env.DATASETS_RELEASES_DIR,
    DATASETS_REQUIRE_RELEASES: process.env.DATASETS_REQUIRE_RELEASES,
    DATABASE_ENABLED: process.env.DATABASE_ENABLED,
    DATABASE_REQUIRED: process.env.DATABASE_REQUIRED,
    REDIS_ENABLED: process.env.REDIS_ENABLED,
    REDIS_REQUIRED: process.env.REDIS_REQUIRED,
  };

  process.env.NODE_ENV = 'test';
  process.env.APP_DOCS_ENABLED = 'true';
  process.env.DATASETS_RELEASES_DIR = tempReleasesDirectory;
  process.env.DATASETS_REQUIRE_RELEASES = 'false';
  process.env.DATABASE_ENABLED = 'false';
  process.env.DATABASE_REQUIRED = 'false';
  process.env.REDIS_ENABLED = 'false';
  process.env.REDIS_REQUIRED = 'false';

  const { AppModule } = require('../dist/app.module');
  const { setupApp } = require('../dist/app.setup');
  const {
    findPublicDatasetEndpointContract,
    publicDatasetEndpointContracts,
  } = require('../dist/api/public-dataset-endpoints');

  let app;

  try {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication(new FastifyAdapter());
    await setupApp(app, app.get(ConfigService));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const releaseSources = getPinnedReleaseSources();
    const approvedSources = releaseSources.filter(
      (source) => source.requiredReadiness?.publicApi === 'approved',
    );
    const defaultOpenApiDocument = await getJson(app, '/openapi.json');
    const datasetsResponse = await getJson(app, '/api/v1/datasets?limit=fifty');
    const datasetItems = datasetsResponse.data?.items ?? [];
    const approvedDatasetsChecked = [];

    for (const source of approvedSources) {
      const contract = findPublicDatasetEndpointContract(source.owner, source.repository);

      if (!contract) {
        fail(
          `${source.owner}/${source.repository}@${source.tag} is publicApi approved but has no public endpoint contract`,
        );
      }
    }

    const endpointContractsChecked = [];

    for (const contract of publicDatasetEndpointContracts) {
      for (const route of contract.routes) {
        assertPathExists(defaultOpenApiDocument, route, '/openapi.json');
      }

      const filteredOpenApiDocument = await getJson(app, contract.openApiDocumentPath);

      for (const route of contract.routes) {
        assertPathExists(filteredOpenApiDocument, route, contract.openApiDocumentPath);
      }

      const datasetItem = datasetItems.find((item) => item.id === contract.datasetId);

      if (!datasetItem) {
        fail(`/api/v1/datasets is missing ${contract.datasetId}`);
      }

      assertContainsAll(
        datasetItem.apiEndpoints ?? [],
        contract.routes,
        `/api/v1/datasets ${contract.datasetId}.apiEndpoints`,
      );

      endpointContractsChecked.push({
        datasetId: contract.datasetId,
        repository: contract.repository,
        openApiDocumentPath: contract.openApiDocumentPath,
        routes: contract.routes.length,
      });
    }

    for (const source of approvedSources) {
      const contract = findPublicDatasetEndpointContract(source.owner, source.repository);

      approvedDatasetsChecked.push(contract.datasetId);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          approvedDatasetsChecked,
          endpointContractsChecked,
          endpointContracts: publicDatasetEndpointContracts.length,
        },
        null,
        2,
      ),
    );
  } finally {
    if (app) {
      await app.close();
    }

    restoreEnv(originalEnv);
    await rm(tempReleasesDirectory, { force: true, recursive: true });
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
