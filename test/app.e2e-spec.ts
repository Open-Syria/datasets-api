import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from './../src/config/config.type';

type DatasetListResponseBody = {
  message: string;
  data: {
    items: Array<{
      slug: string;
      repository: string;
    }>;
    count: number;
  };
};

type ReleaseListResponseBody = {
  data: {
    items: Array<{
      id: string;
      datasets: Array<{
        repository: string;
      }>;
    }>;
    count: number;
  };
};

type GovernorateListResponseBody = {
  data: {
    items: unknown[];
    pagination: {
      pageRecords: number;
      totalRecords: number;
    };
    dataset: {
      repository: string;
      status: string;
    };
    release: null | {
      version: string;
    };
  };
};

type DistrictListResponseBody = GovernorateListResponseBody;
type SubdistrictListResponseBody = GovernorateListResponseBody;
type LocalityListResponseBody = GovernorateListResponseBody;

type ErrorResponseBody = {
  success: false;
  status: number;
  error: string;
  message: string;
};

type OpenApiResponseBody = {
  info: {
    title: string;
    description?: string;
  };
  paths: Record<string, unknown>;
  components?: {
    schemas?: Record<
      string,
      {
        properties?: Record<
          string,
          {
            example?: unknown;
          }
        >;
      }
    >;
  };
  tags?: Array<{
    name: string;
  }>;
};

type OpenApiParameterObject = {
  name: string;
  in: string;
  schema?: {
    enum?: string[];
  };
};

type OpenApiPathItem = {
  get?: {
    tags?: string[];
    parameters?: OpenApiParameterObject[];
    responses?: Record<
      string,
      {
        content?: Record<
          string,
          {
            example?: unknown;
          }
        >;
      }
    >;
  };
};

function getQueryParameters(pathItem: unknown): OpenApiParameterObject[] {
  return ((pathItem as OpenApiPathItem).get?.parameters ?? []).filter(
    (parameter) => parameter.in === 'query',
  );
}

function getHeaderParameters(pathItem: unknown): OpenApiParameterObject[] {
  return ((pathItem as OpenApiPathItem).get?.parameters ?? []).filter(
    (parameter) => parameter.in === 'header',
  );
}

function getOperationTags(pathItem: unknown): string[] {
  return (pathItem as OpenApiPathItem).get?.tags ?? [];
}

function getPathParameters(pathItem: unknown): OpenApiParameterObject[] {
  return ((pathItem as OpenApiPathItem).get?.parameters ?? []).filter(
    (parameter) => parameter.in === 'path',
  );
}

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;
  let appTrustProxy = 'false';
  let freeTierDailyLimit = '500';
  const freeTierDailyTtlSeconds = '86400';

  beforeEach(async () => {
    process.env.APP_DOCS_ENABLED = 'true';
    process.env.APP_TRUST_PROXY = appTrustProxy;
    process.env.THROTTLE_FREE_TIER_DAILY_LIMIT = freeTierDailyLimit;
    process.env.THROTTLE_FREE_TIER_DAILY_TTL_SECONDS = freeTierDailyTtlSeconds;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await setupApp(app, app.get(ConfigService<GlobalConfig>));
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('boots the application', () => {
    expect(app).toBeDefined();
  });

  it('returns API health outside the global prefix', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      status: 200,
      data: {
        status: 'ok',
        datasetReleases: {
          status: 'not_required',
        },
      },
    });
  });

  it('returns liveness and readiness health outside the global prefix', async () => {
    const liveResponse = await app.inject({
      method: 'GET',
      url: '/health/live',
    });
    const readyResponse = await app.inject({
      method: 'GET',
      url: '/health/ready',
    });

    expect(liveResponse.statusCode).toBe(200);
    expect(liveResponse.json()).toMatchObject({
      success: true,
      data: {
        status: 'ok',
      },
    });
    expect(readyResponse.statusCode).toBe(200);
    expect(readyResponse.json()).toMatchObject({
      success: true,
      data: {
        status: 'ok',
        datasetReleases: {
          status: 'not_required',
        },
      },
    });
  });

  it('sets security hardening headers', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['referrer-policy']).toBe('no-referrer');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['x-permitted-cross-domain-policies']).toBe('none');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-robots-tag']).toBe('noindex, nofollow');
  });

  it('serves crawler and favicon assets', async () => {
    const robotsResponse = await app.inject({
      method: 'GET',
      url: '/robots.txt',
    });
    const faviconResponse = await app.inject({
      method: 'GET',
      url: '/favicon.ico',
    });
    const manifestResponse = await app.inject({
      method: 'GET',
      url: '/site.webmanifest',
    });

    expect(robotsResponse.statusCode).toBe(200);
    expect(robotsResponse.headers['content-type']).toContain('text/plain');
    expect(robotsResponse.body).toContain('User-agent: *');
    expect(robotsResponse.body).toContain('Disallow: /');
    expect(robotsResponse.headers['x-robots-tag']).toBe('noindex, nofollow');
    expect(faviconResponse.statusCode).toBe(200);
    expect(faviconResponse.headers['content-type']).toContain('image/');
    expect(faviconResponse.body.length).toBeGreaterThan(0);
    expect(manifestResponse.statusCode).toBe(200);
    expect(manifestResponse.json()).toMatchObject({
      name: 'OpenSyria',
      short_name: 'OpenSyria',
    });
  });

  it('allows read-only CORS preflight requests with approved headers', async () => {
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/datasets',
      headers: {
        origin: 'https://example.org',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-lang, content-type',
      },
    });

    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBe('GET, HEAD, OPTIONS');
    expect(response.headers['access-control-allow-headers']).toBe(
      'Content-Type, Authorization, X-Requested-With, X-Lang',
    );
    expect(response.headers['access-control-max-age']).toBe('600');
  });

  it('rejects CORS preflight requests for mutating methods and unknown headers', async () => {
    const postResponse = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/datasets',
      headers: {
        origin: 'https://example.org',
        'access-control-request-method': 'POST',
      },
    });
    const headerResponse = await app.inject({
      method: 'OPTIONS',
      url: '/api/v1/datasets',
      headers: {
        origin: 'https://example.org',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'x-admin-token',
      },
    });

    expect(postResponse.statusCode).toBe(403);
    expect(postResponse.headers.allow).toBe('GET, HEAD, OPTIONS');
    expect(headerResponse.statusCode).toBe(403);
  });

  it('lists dataset metadata through the versioned API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/datasets',
      headers: {
        'x-lang': 'en',
      },
    });
    const body = response.json<DatasetListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      success: true,
      status: 200,
      message: 'Datasets fetched successfully',
      data: {
        count: 5,
      },
    });
    expect(body.data.items[0]).toMatchObject({
      slug: 'geography',
      repository: 'data-geography',
    });
  });

  it('localizes response messages from query language', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/datasets?lang=ar',
    });
    const body = response.json<DatasetListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.message).toBe(
      '\u062a\u0645 \u062c\u0644\u0628 \u0642\u0627\u0626\u0645\u0629 \u0645\u062c\u0645\u0648\u0639\u0627\u062a \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0628\u0646\u062c\u0627\u062d',
    );
  });

  it('lists release metadata', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/releases',
    });
    const body = response.json<ReleaseListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.data.count).toBe(1);
    expect(body.data.items[0]).toMatchObject({
      id: 'opensyria-seed-planning',
    });
    expect(body.data.items[0]?.datasets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          repository: 'data-geography',
        }),
      ]),
    );
  });

  it('serves the governorates placeholder from the geography API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates',
    });
    const body = response.json<GovernorateListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      pagination: {
        currentPage: 1,
        pageRecords: 0,
        totalRecords: 0,
      },
      dataset: {
        repository: 'data-geography',
        status: 'pending_release',
      },
      release: null,
    });
    expect(body.data.items).toEqual([]);
  });

  it('serves the districts placeholder from the geography API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/districts',
    });
    const body = response.json<DistrictListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      pagination: {
        currentPage: 1,
        pageRecords: 0,
        totalRecords: 0,
      },
      dataset: {
        repository: 'data-geography',
        status: 'pending_release',
      },
      release: null,
    });
    expect(body.data.items).toEqual([]);
  });

  it('serves the subdistricts placeholder from the geography API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/subdistricts',
    });
    const body = response.json<SubdistrictListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      pagination: {
        currentPage: 1,
        pageRecords: 0,
        totalRecords: 0,
      },
      dataset: {
        repository: 'data-geography',
        status: 'pending_release',
      },
      release: null,
    });
    expect(body.data.items).toEqual([]);
  });

  it('serves the localities placeholder from the geography API', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities',
    });
    const body = response.json<LocalityListResponseBody>();

    expect(response.statusCode).toBe(200);
    expect(body.data).toMatchObject({
      pagination: {
        currentPage: 1,
        pageRecords: 0,
        totalRecords: 0,
      },
      dataset: {
        repository: 'data-geography',
        status: 'pending_release',
      },
      release: null,
    });
    expect(body.data.items).toEqual([]);
  });

  it('maps named page limit options to numeric pagination limits', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?limit=THIRTY_FIVE',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      data: {
        pagination: {
          limit: 35,
        },
      },
    });
  });

  it('accepts named sort order options', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?order=DESC',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        pagination: {
          currentPage: 1,
        },
      },
    });
  });

  it('accepts named source status options', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?sourceStatus=RELEASED',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      success: true,
      data: {
        pagination: {
          currentPage: 1,
        },
      },
    });
  });

  it('validates governorate list query parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?limit=abc',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('rejects lower-case source status query values', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates?sourceStatus=released',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('validates district list query parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/districts?limit=abc',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('validates subdistrict list query parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/subdistricts?limit=abc',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('validates locality list query parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities?kind=settlement',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('validates geography path parameters', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates/%20',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(400);
    expect(body).toMatchObject({
      success: false,
      status: 400,
      error: 'ValidationError',
    });
  });

  it('returns not found for missing governorate details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/governorates/sy-missing',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      success: false,
      status: 404,
      message: 'Governorate not found',
    });
  });

  it('returns not found for missing district details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/districts/sy-missing',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      success: false,
      status: 404,
      message: 'District not found',
    });
  });

  it('returns not found for missing subdistrict details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/subdistricts/sy-missing',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      success: false,
      status: 404,
      message: 'Subdistrict not found',
    });
  });

  it('returns not found for missing locality details', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/geography/localities/sy-missing',
    });
    const body = response.json<ErrorResponseBody>();

    expect(response.statusCode).toBe(404);
    expect(body).toMatchObject({
      success: false,
      status: 404,
      message: 'Locality not found',
    });
  });

  it('serves generated OpenAPI documents', async () => {
    const defaultResponse = await app.inject({
      method: 'GET',
      url: '/openapi.json',
    });
    const coreResponse = await app.inject({
      method: 'GET',
      url: '/openapi/core.json',
    });
    const geographyResponse = await app.inject({
      method: 'GET',
      url: '/openapi/geography.json',
    });
    const educationResponse = await app.inject({
      method: 'GET',
      url: '/openapi/education.json',
    });

    expect(defaultResponse.statusCode).toBe(200);
    expect(coreResponse.statusCode).toBe(200);
    const defaultDocument = defaultResponse.json<OpenApiResponseBody>();
    const coreDocument = coreResponse.json<OpenApiResponseBody>();
    const geographyDocument = geographyResponse.json<OpenApiResponseBody>();

    expect(defaultDocument.tags?.map((tag) => tag.name)).toEqual([
      'Health',
      'Dataset Discovery',
      'Releases',
      'Geography',
    ]);
    expect(defaultDocument.info).toMatchObject({
      title: 'OpenSyria Datasets API',
    });
    expect(defaultDocument.info.description).toContain(
      'Public read-only API for stable, versioned OpenSyria reference datasets.',
    );
    expect(defaultDocument.tags?.map((tag) => tag.name)).not.toEqual(
      expect.arrayContaining(['Universities', 'Transport', 'Heritage', 'Telecom']),
    );
    for (const pathItem of Object.values(defaultDocument.paths)) {
      const operationTags = getOperationTags(pathItem);

      expect(operationTags).toEqual([...new Set(operationTags)]);
      expect(operationTags).not.toEqual(
        expect.arrayContaining([
          'Datasets',
          'Governorates',
          'Districts',
          'Subdistricts',
          'Localities',
        ]),
      );
    }
    expect(getOperationTags(defaultDocument.paths['/health'])).toEqual(['Health']);
    expect(getOperationTags(defaultDocument.paths['/api/v1/releases'])).toEqual(['Releases']);
    expect(getOperationTags(defaultDocument.paths['/api/v1/geography/governorates'])).toEqual([
      'Geography',
    ]);
    expect(defaultDocument.paths).toHaveProperty('/health');
    expect(defaultDocument.paths).toHaveProperty('/health/live');
    expect(defaultDocument.paths).toHaveProperty('/health/ready');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/datasets');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/releases');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/geography/governorates');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/geography/districts');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/geography/subdistricts');
    expect(defaultDocument.paths).toHaveProperty('/api/v1/geography/localities');
    expect(
      defaultDocument.components?.schemas?.DatasetSummaryListResponse_Output?.properties?.status
        ?.example,
    ).toBe(200);
    expect(defaultDocument.components?.schemas?.ErrorResponseDto?.properties?.status?.example).toBe(
      400,
    );
    const datasetHeaderParameters = getHeaderParameters(defaultDocument.paths['/api/v1/datasets']);
    expect(datasetHeaderParameters.map((parameter) => parameter.name)).toEqual(['X-Lang']);
    expect(datasetHeaderParameters[0]?.schema).toMatchObject({
      enum: ['en', 'ar'],
      default: 'en',
    });
    expect(coreDocument.tags?.map((tag) => tag.name)).toEqual([
      'Health',
      'Dataset Discovery',
      'Releases',
    ]);
    expect(coreDocument.paths).toHaveProperty('/api/v1/datasets');
    expect(coreDocument.paths).toHaveProperty('/api/v1/releases');
    expect(coreDocument.paths).toHaveProperty('/health/live');
    expect(coreDocument.paths).toHaveProperty('/health/ready');
    expect(geographyResponse.statusCode).toBe(200);
    expect(geographyDocument.tags?.map((tag) => tag.name)).toEqual(['Health', 'Geography']);
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/governorates');
    expect(geographyDocument.paths).toHaveProperty(
      '/api/v1/geography/governorates/{governorateId}',
    );
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/districts');
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/districts/{districtId}');
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/subdistricts');
    expect(geographyDocument.paths).toHaveProperty(
      '/api/v1/geography/subdistricts/{subdistrictId}',
    );
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/localities');
    expect(geographyDocument.paths).toHaveProperty('/api/v1/geography/localities/{localityId}');
    expect(
      getPathParameters(
        geographyDocument.paths['/api/v1/geography/governorates/{governorateId}'],
      ).map((parameter) => parameter.name),
    ).toEqual(['governorateId']);
    expect(
      getPathParameters(geographyDocument.paths['/api/v1/geography/districts/{districtId}']).map(
        (parameter) => parameter.name,
      ),
    ).toEqual(['districtId']);
    expect(
      getPathParameters(
        geographyDocument.paths['/api/v1/geography/subdistricts/{subdistrictId}'],
      ).map((parameter) => parameter.name),
    ).toEqual(['subdistrictId']);
    expect(
      getPathParameters(geographyDocument.paths['/api/v1/geography/localities/{localityId}']).map(
        (parameter) => parameter.name,
      ),
    ).toEqual(['localityId']);
    const governorateQueryParameters = getQueryParameters(
      geographyDocument.paths['/api/v1/geography/governorates'],
    );
    expect(governorateQueryParameters.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining(['page', 'limit', 'q', 'order', 'sourceStatus']),
    );
    expect(
      governorateQueryParameters.find((parameter) => parameter.name === 'limit')?.schema,
    ).toMatchObject({
      enum: ['TEN', 'THIRTY_FIVE', 'FIFTY'],
    });
    expect(
      governorateQueryParameters.find((parameter) => parameter.name === 'order')?.schema,
    ).toMatchObject({
      enum: ['ASC', 'DESC'],
    });
    expect(
      governorateQueryParameters.find((parameter) => parameter.name === 'sourceStatus')?.schema,
    ).toMatchObject({
      enum: ['PENDING_RELEASE', 'SEED', 'RELEASED', 'DEPRECATED'],
    });
    expect(
      getQueryParameters(geographyDocument.paths['/api/v1/geography/districts']).map(
        (parameter) => parameter.name,
      ),
    ).toEqual(
      expect.arrayContaining(['page', 'limit', 'q', 'order', 'governorateId', 'sourceStatus']),
    );
    expect(
      getQueryParameters(geographyDocument.paths['/api/v1/geography/subdistricts']).map(
        (parameter) => parameter.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'q',
        'order',
        'governorateId',
        'districtId',
        'sourceStatus',
      ]),
    );
    const localityQueryParameters = getQueryParameters(
      geographyDocument.paths['/api/v1/geography/localities'],
    );
    expect(localityQueryParameters.map((parameter) => parameter.name)).toEqual(
      expect.arrayContaining([
        'page',
        'limit',
        'q',
        'order',
        'governorateId',
        'districtId',
        'subdistrictId',
        'kind',
        'sourceStatus',
      ]),
    );
    expect(
      localityQueryParameters.find((parameter) => parameter.name === 'kind')?.schema,
    ).toMatchObject({
      enum: ['city', 'town', 'locality'],
    });
    expect(
      (geographyDocument.paths['/api/v1/geography/localities'] as OpenApiPathItem).get?.responses?.[
        '200'
      ]?.content?.['application/json']?.example,
    ).toMatchObject({
      data: {
        items: [
          {
            id: 'sy-damascus-damascus-damascus-damascus',
            kind: 'city',
          },
        ],
      },
    });
    expect(geographyDocument.paths).not.toHaveProperty('/api/v1/datasets');
    expect(educationResponse.statusCode).toBe(404);
  });

  it('serves Scalar documentation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
    expect(response.body).toContain('<title>OpenSyria Datasets API Reference</title>');
  });

  it('serves Swagger UI fallback', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/swagger-ui',
    });

    expect([200, 302]).toContain(response.statusCode);
  });

  describe('free tier rate limiting', () => {
    beforeAll(() => {
      appTrustProxy = 'true';
      freeTierDailyLimit = '2';
    });

    afterAll(() => {
      appTrustProxy = 'false';
      freeTierDailyLimit = '500';
    });

    it('limits data API requests by trusted client across routes', async () => {
      const clientHeaders = {
        'cf-connecting-ip': '203.0.113.10',
      };

      const healthResponse = await app.inject({
        method: 'GET',
        url: '/health',
        headers: clientHeaders,
      });
      const openApiResponse = await app.inject({
        method: 'GET',
        url: '/openapi.json',
        headers: clientHeaders,
      });
      const firstApiResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/datasets',
        headers: clientHeaders,
      });
      const secondApiResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/releases',
        headers: clientHeaders,
      });
      const thirdApiResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/geography/governorates',
        headers: clientHeaders,
      });
      const otherClientResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/geography/governorates',
        headers: {
          'cf-connecting-ip': '203.0.113.11',
        },
      });

      expect(healthResponse.statusCode).toBe(200);
      expect(openApiResponse.statusCode).toBe(200);
      expect(firstApiResponse.statusCode).toBe(200);
      expect(secondApiResponse.statusCode).toBe(200);
      expect(secondApiResponse.headers['x-ratelimit-limit-free-tier-daily']).toBe('2');
      expect(thirdApiResponse.statusCode).toBe(429);
      expect(thirdApiResponse.json<ErrorResponseBody>()).toMatchObject({
        success: false,
        status: 429,
        error: 'ThrottlerException',
        message:
          'You are out of free API requests for today. Please try again after your quota resets.',
      });
      expect(otherClientResponse.statusCode).toBe(200);
    });
  });

  afterEach(async () => {
    await app.close();
    delete process.env.APP_DOCS_ENABLED;
    delete process.env.APP_TRUST_PROXY;
    delete process.env.THROTTLE_FREE_TIER_DAILY_LIMIT;
    delete process.env.THROTTLE_FREE_TIER_DAILY_TTL_SECONDS;
  });
});
