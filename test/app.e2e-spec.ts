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
    count: number;
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
  paths: Record<string, unknown>;
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

function getPathParameters(pathItem: unknown): OpenApiParameterObject[] {
  return ((pathItem as OpenApiPathItem).get?.parameters ?? []).filter(
    (parameter) => parameter.in === 'path',
  );
}

describe('AppController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    process.env.APP_DOCS_ENABLED = 'true';

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
      count: 0,
      pagination: {
        currentPage: 1,
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
      count: 0,
      pagination: {
        currentPage: 1,
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
      count: 0,
      pagination: {
        currentPage: 1,
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
      count: 0,
      pagination: {
        currentPage: 1,
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
    const coreDocument = coreResponse.json<OpenApiResponseBody>();
    const geographyDocument = geographyResponse.json<OpenApiResponseBody>();
    const educationDocument = educationResponse.json<OpenApiResponseBody>();

    expect(defaultResponse.json<OpenApiResponseBody>().paths).toHaveProperty('/api/v1/datasets');
    expect(coreDocument.paths).toHaveProperty('/api/v1/datasets');
    expect(coreDocument.paths).toHaveProperty('/api/v1/releases');
    expect(coreDocument.paths).toHaveProperty('/health/live');
    expect(coreDocument.paths).toHaveProperty('/health/ready');
    expect(geographyResponse.statusCode).toBe(200);
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
    expect(
      getQueryParameters(geographyDocument.paths['/api/v1/geography/governorates']).map(
        (parameter) => parameter.name,
      ),
    ).toEqual(expect.arrayContaining(['page', 'limit', 'q', 'order', 'sourceStatus']));
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
    expect(educationResponse.statusCode).toBe(200);
    expect(educationDocument.paths).toHaveProperty('/health');
  });

  it('serves Scalar documentation', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/docs',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/html');
  });

  it('serves Swagger UI fallback', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/swagger-ui',
    });

    expect([200, 302]).toContain(response.statusCode);
  });

  afterEach(async () => {
    await app.close();
    delete process.env.APP_DOCS_ENABLED;
  });
});
