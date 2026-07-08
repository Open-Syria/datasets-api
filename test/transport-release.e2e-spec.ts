import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import { createTransportFixtureRelease } from './support/transport-fixture-release';

type TransportListResponseBody = {
  data: {
    items: Array<{
      id: string;
      locationTypes?: string[];
      transportModes?: string[];
      observedStatus?: string;
      routeType?: string;
    }>;
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

type DatasetListResponseBody = {
  data: {
    items: Array<{
      id: string;
      apiEndpoints: string[];
      status: string;
      version: string | null;
    }>;
  };
};

type OpenApiResponseBody = {
  paths: Record<string, unknown>;
  tags?: Array<{
    name: string;
  }>;
};

describe('transport release loading (e2e)', () => {
  let app: NestFastifyApplication;
  let tempDirectory: string;
  const originalDatasetsReleasesDirectory = process.env.DATASETS_RELEASES_DIR;
  const originalDatasetsRequireReleases = process.env.DATASETS_REQUIRE_RELEASES;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-transport-release-'));
    await createTransportFixtureRelease(tempDirectory);

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

  it('serves transport endpoints from a verified local release fixture', async () => {
    const locationsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/transport/locations?q=damascus&locationType=airport&transportMode=air',
    });
    const locationDetailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/transport/locations/sy-damascus-international-airport',
    });
    const missingLocationResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/transport/locations/not-a-location',
    });
    const statusResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/transport/status-snapshots?locationId=sy-damascus-international-airport&observedStatus=active',
    });
    const routeResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/transport/route-snapshots?locationId=sy-nasib-border-crossing&routeType=corridor',
    });
    const openApiResponse = await app.inject({
      method: 'GET',
      url: '/openapi/transport.json',
    });
    const datasetsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/datasets?q=transport',
    });

    expect(locationsResponse.statusCode).toBe(200);
    expect(locationDetailResponse.statusCode).toBe(200);
    expect(missingLocationResponse.statusCode).toBe(404);
    expect(statusResponse.statusCode).toBe(200);
    expect(routeResponse.statusCode).toBe(200);
    expect(openApiResponse.statusCode).toBe(200);
    expect(datasetsResponse.statusCode).toBe(200);

    expect(locationsResponse.json<TransportListResponseBody>().data).toMatchObject({
      pagination: {
        pageRecords: 1,
        totalRecords: 1,
      },
      dataset: {
        status: 'released',
      },
      release: {
        version: 'v0.1.1',
      },
      items: [
        {
          id: 'sy-damascus-international-airport',
          locationTypes: ['airport'],
          transportModes: ['air'],
        },
      ],
    });
    expect(locationDetailResponse.json()).toMatchObject({
      data: {
        item: {
          id: 'sy-damascus-international-airport',
          externalIds: {
            iata: 'DAM',
          },
        },
        sources: [
          {
            id: 'fixture-transport-source',
          },
        ],
      },
    });
    expect(statusResponse.json<TransportListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-damascus-international-airport-status-2026-05-21-logistics-cluster',
        observedStatus: 'active',
      }),
    ]);
    expect(routeResponse.json<TransportListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-route-jordan-syria-corridor-status-2026-05-25-logistics-cluster',
        routeType: 'corridor',
      }),
    ]);

    const openApiDocument = openApiResponse.json<OpenApiResponseBody>();

    expect(openApiDocument.tags?.map((tag) => tag.name)).toEqual(['Health', 'Transport']);
    expect(openApiDocument.paths).toHaveProperty('/api/v1/transport/locations');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/transport/locations/{locationId}');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/transport/status-snapshots');
    expect(openApiDocument.paths).toHaveProperty(
      '/api/v1/transport/status-snapshots/{statusSnapshotId}',
    );
    expect(openApiDocument.paths).toHaveProperty('/api/v1/transport/route-snapshots');
    expect(openApiDocument.paths).toHaveProperty(
      '/api/v1/transport/route-snapshots/{routeSnapshotId}',
    );
    expect(openApiDocument.paths).not.toHaveProperty('/api/v1/universities');

    const transportDataset = datasetsResponse
      .json<DatasetListResponseBody>()
      .data.items.find((item) => item.id === 'opensyria-transport');

    expect(transportDataset).toMatchObject({
      status: 'released',
      version: 'v0.1.1',
      apiEndpoints: expect.arrayContaining([
        '/api/v1/transport/locations',
        '/api/v1/transport/status-snapshots',
        '/api/v1/transport/route-snapshots',
      ]),
    });
  });
});
