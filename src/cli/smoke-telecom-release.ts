import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { setupApp } from '../app.setup';
import type { GlobalConfig } from '../config/config.type';

const requireFromSmokeScript = createRequire(__filename);

type ListResponseBody = {
  data: {
    pagination: {
      totalRecords: number;
    };
    dataset: {
      status: string;
    };
  };
};

type DatasetDiscoveryResponseBody = {
  data: {
    items: Array<{
      id: string;
      apiEndpoints: string[];
    }>;
  };
};

type HealthResponseBody = {
  data: {
    datasetReleases: {
      status: string;
      count: number;
    };
  };
};

type OpenApiResponseBody = {
  paths: Record<string, unknown>;
};

const expectedTotals = [
  {
    label: 'telecom country numbering plans',
    url: '/api/v1/telecom/country-numbering-plans?limit=ten',
    totalRecords: 1,
  },
  {
    label: 'telecom operators',
    url: '/api/v1/telecom/operators?limit=ten',
    totalRecords: 4,
  },
  {
    label: 'telecom fixed area codes',
    url: '/api/v1/telecom/fixed-area-codes?limit=ten',
    totalRecords: 13,
  },
  {
    label: 'telecom mobile prefixes',
    url: '/api/v1/telecom/mobile-prefixes?limit=ten',
    totalRecords: 8,
  },
  {
    label: 'telecom number ranges',
    url: '/api/v1/telecom/number-ranges?limit=ten',
    totalRecords: 7,
  },
];

const expectedOpenApiPaths = [
  '/api/v1/telecom/country-numbering-plans',
  '/api/v1/telecom/country-numbering-plans/{countryNumberingPlanId}',
  '/api/v1/telecom/operators',
  '/api/v1/telecom/operators/{operatorId}',
  '/api/v1/telecom/fixed-area-codes',
  '/api/v1/telecom/fixed-area-codes/{fixedAreaCodeId}',
  '/api/v1/telecom/mobile-prefixes',
  '/api/v1/telecom/mobile-prefixes/{mobilePrefixId}',
  '/api/v1/telecom/number-ranges',
  '/api/v1/telecom/number-ranges/{numberRangeId}',
];

async function assertDirectoryExists(directory: string) {
  try {
    await access(path.join(directory, 'release-manifest.json'));
  } catch {
    throw new Error(
      `No release-manifest.json found in ${directory}. Run the data-telecom release prepare command first, or set TELECOM_RELEASE_DIR.`,
    );
  }
}

async function createApp(appModule: Type<unknown>) {
  const app = await NestFactory.create<NestFastifyApplication>(appModule, new FastifyAdapter(), {
    logger: false,
  });

  await setupApp(app, app.get(ConfigService<GlobalConfig>));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

async function assertEndpointTotal(
  app: NestFastifyApplication,
  item: (typeof expectedTotals)[number],
) {
  const response = await app.inject({
    method: 'GET',
    url: item.url,
  });

  if (response.statusCode !== 200) {
    throw new Error(`${item.label} returned HTTP ${response.statusCode}: ${response.body}`);
  }

  const body = response.json<ListResponseBody>();
  const totalRecords = body.data.pagination.totalRecords;

  if (totalRecords !== item.totalRecords) {
    throw new Error(
      `${item.label} expected ${item.totalRecords} records, received ${totalRecords}.`,
    );
  }

  if (body.data.dataset.status !== 'seed' && body.data.dataset.status !== 'released') {
    throw new Error(
      `${item.label} returned unexpected dataset status ${body.data.dataset.status}.`,
    );
  }

  console.log(`${item.label}: ${totalRecords}`);
}

async function assertDatasetDiscovery(app: NestFastifyApplication) {
  const response = await app.inject({
    method: 'GET',
    url: '/api/v1/datasets?q=telecom',
  });

  if (response.statusCode !== 200) {
    throw new Error(`dataset discovery returned HTTP ${response.statusCode}: ${response.body}`);
  }

  const body = response.json<DatasetDiscoveryResponseBody>();
  const telecomDataset = body.data.items.find((item) => item.id === 'opensyria-telecom');

  if (!telecomDataset) {
    throw new Error('dataset discovery did not include opensyria-telecom.');
  }

  for (const endpoint of [
    '/api/v1/telecom/country-numbering-plans',
    '/api/v1/telecom/operators',
    '/api/v1/telecom/fixed-area-codes',
    '/api/v1/telecom/mobile-prefixes',
    '/api/v1/telecom/number-ranges',
  ]) {
    if (!telecomDataset.apiEndpoints.includes(endpoint)) {
      throw new Error(`dataset discovery is missing endpoint ${endpoint}.`);
    }
  }

  console.log('dataset discovery: opensyria-telecom');
}

async function assertOpenApi(app: NestFastifyApplication) {
  const response = await app.inject({
    method: 'GET',
    url: '/openapi/telecom.json',
  });

  if (response.statusCode !== 200) {
    throw new Error(`telecom OpenAPI returned HTTP ${response.statusCode}: ${response.body}`);
  }

  const body = response.json<OpenApiResponseBody>();

  for (const expectedPath of expectedOpenApiPaths) {
    if (!(expectedPath in body.paths)) {
      throw new Error(`telecom OpenAPI is missing path ${expectedPath}.`);
    }
  }

  console.log(`telecom OpenAPI paths: ${expectedOpenApiPaths.length}`);
}

async function assertReadiness(app: NestFastifyApplication) {
  const response = await app.inject({
    method: 'GET',
    url: '/health/ready',
  });

  if (response.statusCode !== 200) {
    throw new Error(`readiness returned HTTP ${response.statusCode}: ${response.body}`);
  }

  const body = response.json<HealthResponseBody>();

  if (body.data.datasetReleases.status !== 'loaded') {
    throw new Error(`dataset releases are ${body.data.datasetReleases.status}, expected loaded.`);
  }

  console.log(`dataset releases: ${body.data.datasetReleases.count}`);
}

async function main() {
  const releaseDirectory = path.resolve(
    process.cwd(),
    process.env.TELECOM_RELEASE_DIR ?? '../data-telecom/dist/release',
  );

  await assertDirectoryExists(releaseDirectory);

  process.env.NODE_ENV = 'test';
  process.env.APP_DOCS_ENABLED = 'true';
  process.env.DATASETS_RELEASES_DIR = releaseDirectory;
  process.env.DATASETS_REQUIRE_RELEASES = 'true';
  process.env.DATABASE_ENABLED = 'false';
  process.env.DATABASE_REQUIRED = 'false';
  process.env.REDIS_ENABLED = 'false';
  process.env.REDIS_REQUIRED = 'false';

  const { AppModule } = requireFromSmokeScript('../app.module') as { AppModule: Type<unknown> };
  const app = await createApp(AppModule);

  try {
    await assertReadiness(app);

    for (const item of expectedTotals) {
      await assertEndpointTotal(app, item);
    }

    await assertDatasetDiscovery(app);
    await assertOpenApi(app);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
