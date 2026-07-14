import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import { createTelecomFixtureRelease } from './support/telecom-fixture-release';

type TelecomListResponseBody = {
  data: {
    items: Array<{
      id: string;
      countryCode?: string;
      operatorType?: string;
      areaCode?: string;
      prefix?: string;
      rangeType?: string;
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

describe('telecom release loading (e2e)', () => {
  let app: NestFastifyApplication;
  let tempDirectory: string;
  const originalDatasetsReleasesDirectory = process.env.DATASETS_RELEASES_DIR;
  const originalDatasetsRequireReleases = process.env.DATASETS_REQUIRE_RELEASES;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-telecom-release-'));
    await createTelecomFixtureRelease(tempDirectory);

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

  it('serves telecom endpoints from a verified local release fixture', async () => {
    const countryNumberingPlansResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/country-numbering-plans?countryCode=963',
    });
    const operatorsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/operators?q=syriatel&operatorType=mobile',
    });
    const fixedAreaCodesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/fixed-area-codes?governorateId=sy-damascus&areaCode=11',
    });
    const mobilePrefixesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/mobile-prefixes?operatorId=sy-syriatel&prefix=93',
    });
    const numberRangesResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/number-ranges?rangeType=reserved_mobile_prefix',
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/mobile-prefixes/sy-mobile-prefix-093-syriatel',
    });
    const missingResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/telecom/mobile-prefixes/not-a-prefix',
    });
    const openApiResponse = await app.inject({
      method: 'GET',
      url: '/openapi/telecom.json',
    });
    const datasetsResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/datasets?q=telecom',
    });

    expect(countryNumberingPlansResponse.statusCode).toBe(200);
    expect(operatorsResponse.statusCode).toBe(200);
    expect(fixedAreaCodesResponse.statusCode).toBe(200);
    expect(mobilePrefixesResponse.statusCode).toBe(200);
    expect(numberRangesResponse.statusCode).toBe(200);
    expect(detailResponse.statusCode).toBe(200);
    expect(missingResponse.statusCode).toBe(404);
    expect(openApiResponse.statusCode).toBe(200);
    expect(datasetsResponse.statusCode).toBe(200);

    expect(countryNumberingPlansResponse.json<TelecomListResponseBody>().data).toMatchObject({
      pagination: {
        pageRecords: 1,
        totalRecords: 1,
      },
      dataset: {
        status: 'released',
      },
      release: {
        version: 'v0.1.0',
      },
      items: [
        {
          id: 'sy-national-numbering-plan',
          countryCode: '963',
        },
      ],
    });
    expect(operatorsResponse.json<TelecomListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-syriatel',
        operatorType: 'mobile',
      }),
    ]);
    expect(fixedAreaCodesResponse.json<TelecomListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-fixed-area-code-11-damascus-rif-dimashq',
        areaCode: '11',
      }),
    ]);
    expect(mobilePrefixesResponse.json<TelecomListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-mobile-prefix-093-syriatel',
        prefix: '93',
      }),
    ]);
    expect(numberRangesResponse.json<TelecomListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-mobile-prefix-090-reserved',
        rangeType: 'reserved_mobile_prefix',
      }),
    ]);
    expect(detailResponse.json()).toMatchObject({
      data: {
        item: {
          id: 'sy-mobile-prefix-093-syriatel',
          dialingPrefix: '093',
        },
        sources: [
          {
            id: 'fixture-telecom-source',
          },
        ],
      },
    });

    const openApiDocument = openApiResponse.json<OpenApiResponseBody>();

    expect(openApiDocument.tags?.map((tag) => tag.name)).toEqual(['Health', 'Telecom']);
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/country-numbering-plans');
    expect(openApiDocument.paths).toHaveProperty(
      '/api/v1/telecom/country-numbering-plans/{countryNumberingPlanId}',
    );
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/operators');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/operators/{operatorId}');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/fixed-area-codes');
    expect(openApiDocument.paths).toHaveProperty(
      '/api/v1/telecom/fixed-area-codes/{fixedAreaCodeId}',
    );
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/mobile-prefixes');
    expect(openApiDocument.paths).toHaveProperty(
      '/api/v1/telecom/mobile-prefixes/{mobilePrefixId}',
    );
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/number-ranges');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/telecom/number-ranges/{numberRangeId}');
    expect(openApiDocument.paths).not.toHaveProperty('/api/v1/transport/locations');

    const telecomDataset = datasetsResponse
      .json<DatasetListResponseBody>()
      .data.items.find((item) => item.id === 'opensyria-telecom');

    expect(telecomDataset).toMatchObject({
      status: 'released',
      version: 'v0.1.0',
      apiEndpoints: expect.arrayContaining([
        '/api/v1/telecom/country-numbering-plans',
        '/api/v1/telecom/operators',
        '/api/v1/telecom/fixed-area-codes',
        '/api/v1/telecom/mobile-prefixes',
        '/api/v1/telecom/number-ranges',
      ]),
    });
  });
});
