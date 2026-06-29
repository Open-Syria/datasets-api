import { access } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
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

type HealthResponseBody = {
  data: {
    datasetReleases: {
      status: string;
      count: number;
    };
  };
};

const expectedTotals = [
  {
    label: 'governorates',
    url: '/api/v1/geography/governorates?limit=ten',
    totalRecords: 14,
  },
  {
    label: 'districts',
    url: '/api/v1/geography/districts?limit=ten',
    totalRecords: 62,
  },
  {
    label: 'subdistricts',
    url: '/api/v1/geography/subdistricts?limit=ten',
    totalRecords: 272,
  },
  {
    label: 'localities',
    url: '/api/v1/geography/localities?limit=ten',
    totalRecords: 7605,
  },
];

async function assertDirectoryExists(directory: string) {
  try {
    await access(path.join(directory, 'release-manifest.json'));
  } catch {
    throw new Error(
      `No release-manifest.json found in ${directory}. Run the data-geography release build first, or set GEOGRAPHY_RELEASE_DIR.`,
    );
  }
}

async function createApp(appModule: Type<unknown>) {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [appModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

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
    process.env.GEOGRAPHY_RELEASE_DIR ?? '../data-geography/dist/release',
  );

  await assertDirectoryExists(releaseDirectory);

  process.env.NODE_ENV = 'test';
  process.env.APP_DOCS_ENABLED = 'false';
  process.env.DATASETS_RELEASES_DIR = releaseDirectory;
  process.env.DATASETS_REQUIRE_RELEASES = 'true';

  const { AppModule } = requireFromSmokeScript('../app.module') as { AppModule: Type<unknown> };
  const app = await createApp(AppModule);

  try {
    await assertReadiness(app);

    for (const item of expectedTotals) {
      await assertEndpointTotal(app, item);
    }
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
