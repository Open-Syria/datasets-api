import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import { createUniversitiesFixtureRelease } from './support/universities-fixture-release';

type UniversityListResponseBody = {
  data: {
    items: Array<{
      id: string;
      logo: null | {
        id: string;
        variants: Array<{
          url: string;
        }>;
      };
      rankings: Array<{
        rankingSystem: string;
        rankScope: string;
        year: number;
        rank: number | null;
      }>;
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

type OpenApiResponseBody = {
  paths: Record<string, unknown>;
  tags?: Array<{
    name: string;
  }>;
};

describe('universities release loading (e2e)', () => {
  let app: NestFastifyApplication;
  let tempDirectory: string;
  const originalDatasetsReleasesDirectory = process.env.DATASETS_RELEASES_DIR;
  const originalDatasetsRequireReleases = process.env.DATASETS_REQUIRE_RELEASES;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-universities-release-'));
    await createUniversitiesFixtureRelease(tempDirectory);

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

  it('serves university profile endpoints from a verified local release fixture', async () => {
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/universities?q=damascus&institutionType=public',
    });
    const withoutWebsiteResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/universities?hasWebsite=false',
    });
    const detailResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/universities/sy-damascus-university',
    });
    const notFoundResponse = await app.inject({
      method: 'GET',
      url: '/api/v1/universities/not-a-university',
    });
    const openApiResponse = await app.inject({
      method: 'GET',
      url: '/openapi/universities.json',
    });

    expect(listResponse.statusCode).toBe(200);
    expect(withoutWebsiteResponse.statusCode).toBe(200);
    expect(detailResponse.statusCode).toBe(200);
    expect(notFoundResponse.statusCode).toBe(404);
    expect(openApiResponse.statusCode).toBe(200);

    expect(listResponse.json<UniversityListResponseBody>().data).toMatchObject({
      pagination: {
        pageRecords: 1,
        totalRecords: 1,
      },
      dataset: {
        status: 'released',
      },
      release: {
        version: 'v0.2.0',
      },
      items: [
        {
          id: 'sy-damascus-university',
          logo: {
            id: 'sy-damascus-university-logo',
          },
          rankings: [
            {
              rankingSystem: 'Fixture Ranking',
              rankScope: 'national',
              year: 2025,
              rank: 1,
            },
          ],
        },
      ],
    });
    expect(withoutWebsiteResponse.json<UniversityListResponseBody>().data.items).toEqual([
      expect.objectContaining({
        id: 'sy-higher-institute-of-dramatic-arts',
        logo: null,
        rankings: [],
      }),
    ]);
    expect(detailResponse.json()).toMatchObject({
      data: {
        item: {
          id: 'sy-damascus-university',
          logo: {
            variants: [
              {
                url: 'https://cdn.opensyria.org/universities/sy-damascus-university/logo-v1/w256.webp',
              },
            ],
          },
          rankings: [
            {
              id: 'sy-damascus-university-ranking-national-2025',
            },
          ],
        },
        sources: [
          {
            id: 'fixture-source',
          },
        ],
      },
    });

    const openApiDocument = openApiResponse.json<OpenApiResponseBody>();

    expect(openApiDocument.tags?.map((tag) => tag.name)).toEqual(['Health', 'Universities']);
    expect(openApiDocument.paths).toHaveProperty('/api/v1/universities');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/universities/{universityId}');
    expect(openApiDocument.paths).not.toHaveProperty('/api/v1/geography/governorates');
  });
});
