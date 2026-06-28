import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import { createFixtureRelease } from './support/geography-fixture-release';

type ListResponseBody = {
  data: {
    items: unknown[];
    count: number;
    pagination: {
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

describe('geography release loading (e2e)', () => {
  let app: NestFastifyApplication;
  let tempDirectory: string;
  const originalDatasetsReleasesDirectory = process.env.DATASETS_RELEASES_DIR;
  const originalDatasetsRequireReleases = process.env.DATASETS_REQUIRE_RELEASES;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-geography-release-'));
    await createFixtureRelease(tempDirectory);

    process.env.APP_DOCS_ENABLED = 'true';
    process.env.DATASETS_RELEASES_DIR = tempDirectory;
    process.env.DATASETS_REQUIRE_RELEASES = 'true';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await setupApp(app, app.get(ConfigService<GlobalConfig>));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
    await rm(tempDirectory, { force: true, recursive: true });

    if (originalDatasetsReleasesDirectory) {
      process.env.DATASETS_RELEASES_DIR = originalDatasetsReleasesDirectory;
    } else {
      delete process.env.DATASETS_RELEASES_DIR;
    }

    if (originalDatasetsRequireReleases) {
      process.env.DATASETS_REQUIRE_RELEASES = originalDatasetsRequireReleases;
    } else {
      delete process.env.DATASETS_REQUIRE_RELEASES;
    }

    delete process.env.APP_DOCS_ENABLED;
  });

  it('serves geography endpoints from a verified local release fixture', async () => {
    const governoratesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates',
    });
    const districtsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/districts?governorateId=sy-damascus',
    });
    const subdistrictsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/subdistricts?districtId=sy-damascus-damascus',
    });
    const localitiesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities?kind=city&q=dimashq',
    });
    const localityDetailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities/sy-damascus-damascus-damascus-damascus',
    });
    const readinessResponse = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    for (const response of [
      governoratesResponse,
      districtsResponse,
      subdistrictsResponse,
      localitiesResponse,
      localityDetailResponse,
      readinessResponse,
    ]) {
      expect(response.statusCode).toBe(200);
    }

    for (const response of [
      governoratesResponse,
      districtsResponse,
      subdistrictsResponse,
      localitiesResponse,
    ]) {
      expect(response.json<ListResponseBody>().data).toMatchObject({
        count: 1,
        pagination: {
          totalRecords: 1,
        },
        dataset: {
          status: 'released',
        },
        release: {
          version: 'v0.1.0',
        },
      });
    }

    expect(localityDetailResponse.json()).toMatchObject({
      data: {
        item: {
          id: 'sy-damascus-damascus-damascus-damascus',
          aliases: [
            {
              value: 'Dimashq',
            },
          ],
          externalIds: {
            geonames: '170654',
          },
        },
        sources: [
          {
            id: 'fixture-source',
          },
        ],
      },
    });
    expect(readinessResponse.json()).toMatchObject({
      data: {
        datasetReleases: {
          status: 'loaded',
          required: true,
          count: 1,
        },
      },
    });
  });
});
