import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import { PrismaService } from '../src/database/prisma.service';
import { GeographyReadModelImportService } from '../src/read-model/geography/geography-read-model-import.service';
import { createFixtureRelease } from './support/geography-fixture-release';

type ListResponseBody = {
  data: {
    items: unknown[];
    pagination: {
      pageRecords: number;
      totalRecords: number;
    };
    dataset: {
      status: string;
    };
    release: {
      version: string;
    } | null;
  };
};

const GEOGRAPHY_DATASET_ID = 'opensyria-geography';
const TEST_RELEASE_VERSION = 'v999.0.0-read-model-test';
const TEST_RELEASE_ID = `${GEOGRAPHY_DATASET_ID}:${TEST_RELEASE_VERSION}`;

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}

describe('geography read model database integration', () => {
  let app: NestFastifyApplication | undefined;
  let moduleFixture: TestingModule | undefined;
  let importReleaseDirectory: string;
  let runtimeReleaseDirectory: string;
  const originalEnv = {
    appDocsEnabled: process.env.APP_DOCS_ENABLED,
    datasetsReleasesDirectory: process.env.DATASETS_RELEASES_DIR,
    datasetsRequireReleases: process.env.DATASETS_REQUIRE_RELEASES,
    databaseEnabled: process.env.DATABASE_ENABLED,
    databaseRequired: process.env.DATABASE_REQUIRED,
    redisEnabled: process.env.REDIS_ENABLED,
  };

  beforeEach(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for geography read-model integration tests.');
    }

    importReleaseDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-import-release-'));
    runtimeReleaseDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-runtime-release-'));
    await createFixtureRelease(importReleaseDirectory, {
      version: TEST_RELEASE_VERSION,
      generatedAt: '2099-01-01T00:00:00.000Z',
      publishedAt: '2099-01-01T00:00:00.000Z',
    });

    process.env.APP_DOCS_ENABLED = 'false';
    process.env.DATABASE_ENABLED = 'true';
    process.env.DATABASE_REQUIRED = 'true';
    process.env.REDIS_ENABLED = 'false';
    process.env.DATASETS_RELEASES_DIR = importReleaseDirectory;
    process.env.DATASETS_REQUIRE_RELEASES = 'true';

    const importModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    await importModule.init();

    await importModule.get(GeographyReadModelImportService).importLatestRelease();
    await importModule.close();

    await rm(importReleaseDirectory, { force: true, recursive: true });
    process.env.DATASETS_RELEASES_DIR = runtimeReleaseDirectory;
    process.env.DATASETS_REQUIRE_RELEASES = 'false';

    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await setupApp(app, app.get(ConfigService<GlobalConfig>));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    const prismaService = moduleFixture?.get(PrismaService, { strict: false });

    await prismaService?.getClient().datasetRelease.deleteMany({
      where: {
        id: TEST_RELEASE_ID,
      },
    });
    await app?.close();
    await moduleFixture?.close();
    await rm(importReleaseDirectory, { force: true, recursive: true });
    await rm(runtimeReleaseDirectory, { force: true, recursive: true });

    setEnv('APP_DOCS_ENABLED', originalEnv.appDocsEnabled);
    setEnv('DATASETS_RELEASES_DIR', originalEnv.datasetsReleasesDirectory);
    setEnv('DATASETS_REQUIRE_RELEASES', originalEnv.datasetsRequireReleases);
    setEnv('DATABASE_ENABLED', originalEnv.databaseEnabled);
    setEnv('DATABASE_REQUIRED', originalEnv.databaseRequired);
    setEnv('REDIS_ENABLED', originalEnv.redisEnabled);
  });

  it('serves geography endpoints from PostgreSQL when release artifacts are absent', async () => {
    if (!app) {
      throw new Error('Test application was not initialized.');
    }

    const localitiesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities?kind=city&q=dimashq',
    });
    const governoratesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?q=dimashq',
    });
    const localityDetailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities/sy-damascus-damascus-damascus-damascus',
    });
    const readinessResponse = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(localitiesResponse.statusCode).toBe(200);
    expect(governoratesResponse.statusCode).toBe(200);
    expect(localitiesResponse.json<ListResponseBody>().data).toMatchObject({
      pagination: {
        pageRecords: 1,
        totalRecords: 1,
      },
      dataset: {
        status: 'released',
      },
      release: {
        version: TEST_RELEASE_VERSION,
      },
    });
    expect(localityDetailResponse.statusCode).toBe(200);
    expect(localityDetailResponse.json()).toMatchObject({
      data: {
        item: {
          id: 'sy-damascus-damascus-damascus-damascus',
          aliases: [
            {
              value: 'Dimashq',
            },
          ],
        },
      },
    });
    expect(governoratesResponse.json()).toMatchObject({
      data: {
        items: [
          {
            id: 'sy-damascus',
            aliases: [
              {
                value: 'Dimashq',
              },
            ],
            population: {
              value: 1796000,
              year: 2016,
            },
            externalIds: {
              geonames: '170654',
            },
            sourceIds: ['fixture-source'],
          },
        ],
      },
    });
    expect(readinessResponse.statusCode).toBe(200);
    expect(readinessResponse.json()).toMatchObject({
      data: {
        database: {
          status: 'up',
          required: true,
        },
        datasetReleases: {
          status: 'not_required',
          count: 0,
        },
      },
    });
  });
});
