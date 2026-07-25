import { createRequire } from 'node:module';
import type { Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { publicDatasetEndpointContracts } from '../api/public-dataset-endpoints';
import { setupApp } from '../app.setup';
import type { GlobalConfig } from '../config/config.type';

const requireFromSmokeScript = createRequire(__filename);

type HealthResponseBody = {
  data: {
    datasetReleases: {
      status: string;
      count: number;
      expectedCount: number;
      missing: string[];
    };
  };
};

type DatasetDiscoveryResponseBody = {
  data: {
    items: Array<{
      id: string;
      repository: string;
      version: string | null;
      apiEndpoints: string[];
    }>;
  };
};

type ListResponseBody = {
  data: {
    dataset: {
      id: string;
      repository: string;
      status: string;
    };
    release: {
      version: string;
    } | null;
    pagination: {
      totalRecords: number;
    };
  };
};

type OpenApiResponseBody = {
  paths: Record<string, unknown>;
};

async function createApp(appModule: Type<unknown>) {
  const app = await NestFactory.create<NestFastifyApplication>(appModule, new FastifyAdapter(), {
    logger: false,
  });

  await setupApp(app, app.get(ConfigService<GlobalConfig>));
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return app;
}

async function assertReadiness(app: NestFastifyApplication, expectedCount: number) {
  const response = await app.inject({
    method: 'GET',
    url: '/health/ready',
  });

  if (response.statusCode !== 200) {
    throw new Error(`readiness returned HTTP ${response.statusCode}: ${response.body}`);
  }

  const releases = response.json<HealthResponseBody>().data.datasetReleases;

  if (
    releases.status !== 'loaded' ||
    releases.count !== expectedCount ||
    releases.expectedCount !== expectedCount ||
    releases.missing.length > 0
  ) {
    throw new Error(
      `dataset release readiness mismatch: ${JSON.stringify(releases)}, expected ${expectedCount} loaded releases`,
    );
  }
}

async function assertDataset(
  app: NestFastifyApplication,
  contract: (typeof publicDatasetEndpointContracts)[number],
  expectedVersion: string,
) {
  const discoveryResponse = await app.inject({
    method: 'GET',
    url: `/api/v1/datasets?q=${encodeURIComponent(contract.repository)}`,
  });

  if (discoveryResponse.statusCode !== 200) {
    throw new Error(
      `${contract.repository} discovery returned HTTP ${discoveryResponse.statusCode}: ${discoveryResponse.body}`,
    );
  }

  const discovered = discoveryResponse
    .json<DatasetDiscoveryResponseBody>()
    .data.items.find(({ id }) => id === contract.datasetId);

  if (
    !discovered ||
    discovered.repository !== contract.repository ||
    discovered.version !== expectedVersion
  ) {
    throw new Error(
      `${contract.repository} discovery does not expose configured version ${expectedVersion}`,
    );
  }

  for (const route of contract.routes) {
    if (!discovered.apiEndpoints.includes(route)) {
      throw new Error(`${contract.repository} discovery is missing endpoint ${route}`);
    }
  }

  for (const route of contract.routes.filter((candidate) => !candidate.includes('{'))) {
    const response = await app.inject({
      method: 'GET',
      url: `${route}?limit=ten`,
    });

    if (response.statusCode !== 200) {
      throw new Error(`${route} returned HTTP ${response.statusCode}: ${response.body}`);
    }

    const body = response.json<ListResponseBody>();

    if (
      body.data.dataset.id !== contract.datasetId ||
      body.data.dataset.repository !== contract.repository ||
      body.data.dataset.status !== 'released' ||
      body.data.release?.version !== expectedVersion
    ) {
      throw new Error(`${route} returned unexpected dataset or release metadata`);
    }

    if (body.data.pagination.totalRecords <= 0) {
      throw new Error(`${route} returned no records`);
    }
  }

  const openApiResponse = await app.inject({
    method: 'GET',
    url: contract.openApiDocumentPath,
  });

  if (openApiResponse.statusCode !== 200) {
    throw new Error(
      `${contract.repository} OpenAPI returned HTTP ${openApiResponse.statusCode}: ${openApiResponse.body}`,
    );
  }

  const openApi = openApiResponse.json<OpenApiResponseBody>();

  for (const route of contract.routes) {
    if (!(route in openApi.paths)) {
      throw new Error(`${contract.repository} OpenAPI is missing path ${route}`);
    }
  }
}

async function main() {
  process.env.NODE_ENV = 'test';
  process.env.APP_DOCS_ENABLED = 'true';
  process.env.DATASETS_REQUIRE_RELEASES = 'true';
  process.env.DATABASE_ENABLED = 'false';
  process.env.DATABASE_REQUIRED = 'false';
  process.env.REDIS_ENABLED = 'false';
  process.env.REDIS_REQUIRED = 'false';

  const { AppModule } = requireFromSmokeScript('../app.module') as { AppModule: Type<unknown> };
  const app = await createApp(AppModule);

  try {
    const datasetsConfig = app.get(ConfigService<GlobalConfig>).getOrThrow('datasets', {
      infer: true,
    });
    const expectedVersions = new Map(
      datasetsConfig.releaseSources.map((source) => [source.repository, source.tag]),
    );

    if (expectedVersions.size !== publicDatasetEndpointContracts.length) {
      throw new Error(
        `Configured ${expectedVersions.size} dataset releases, expected ${publicDatasetEndpointContracts.length}`,
      );
    }

    await assertReadiness(app, expectedVersions.size);

    for (const contract of publicDatasetEndpointContracts) {
      const expectedVersion = expectedVersions.get(contract.repository);

      if (!expectedVersion) {
        throw new Error(`No configured release for ${contract.repository}`);
      }

      await assertDataset(app, contract, expectedVersion);
    }

    console.log(
      `Verified ${expectedVersions.size} exact dataset releases, all collection endpoints, and filtered OpenAPI documents.`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
