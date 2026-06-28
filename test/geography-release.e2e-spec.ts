import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ConfigService } from '@nestjs/config';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import type { GlobalConfig } from '../src/config/config.type';
import type { DatasetReleaseManifest } from '../src/datasets/contracts/dataset-release-manifest.schema';

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

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function createArtifact<TRecord>(records: TRecord[]) {
  const buffer = Buffer.from(JSON.stringify(records, null, 2));

  return {
    buffer,
    sha256: sha256(buffer),
    sizeBytes: buffer.byteLength,
    recordCount: records.length,
  };
}

async function writeJsonArtifact(releaseDirectory: string, name: string, buffer: Buffer) {
  const artifactPath = path.join(releaseDirectory, 'artifacts', `${name}.json`);

  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, buffer);
}

async function createFixtureRelease(releaseDirectory: string) {
  const governorates = createArtifact([
    {
      id: 'sy-damascus',
      name: {
        en: 'Damascus',
        ar: 'دمشق',
      },
      iso31662: 'SY-DI',
      centroid: {
        latitude: 33.5138,
        longitude: 36.2765,
      },
      sourceStatus: 'released',
    },
  ]);
  const districts = createArtifact([
    {
      id: 'sy-damascus-damascus',
      governorateId: 'sy-damascus',
      name: {
        en: 'Damascus',
        ar: 'دمشق',
      },
      centroid: {
        latitude: 33.5138,
        longitude: 36.2765,
      },
      sourceStatus: 'released',
    },
  ]);
  const subdistricts = createArtifact([
    {
      id: 'sy-damascus-damascus-damascus',
      governorateId: 'sy-damascus',
      districtId: 'sy-damascus-damascus',
      name: {
        en: 'Damascus',
        ar: 'دمشق',
      },
      centroid: {
        latitude: 33.5138,
        longitude: 36.2765,
      },
      sourceStatus: 'released',
    },
  ]);
  const localities = createArtifact([
    {
      id: 'sy-damascus-damascus-damascus-damascus',
      governorateId: 'sy-damascus',
      districtId: 'sy-damascus-damascus',
      subdistrictId: 'sy-damascus-damascus-damascus',
      kind: 'city',
      name: {
        en: 'Damascus',
        ar: 'دمشق',
      },
      aliases: [
        {
          value: 'Dimashq',
          language: 'en',
          type: 'alternate_spelling',
        },
      ],
      centroid: {
        latitude: 33.5138,
        longitude: 36.2765,
      },
      externalIds: {
        geonames: '170654',
        ochaPcode: 'C1000',
      },
      sourceIds: ['fixture-source'],
      sourceStatus: 'released',
    },
  ]);
  const artifacts = {
    governorates,
    districts,
    subdistricts,
    localities,
  };

  for (const [name, artifact] of Object.entries(artifacts)) {
    await writeJsonArtifact(releaseDirectory, name, artifact.buffer);
  }

  const manifest: DatasetReleaseManifest = {
    schemaVersion: '1.0',
    generatedAt: '2026-06-27T00:00:00.000Z',
    dataset: {
      id: 'opensyria-geography',
      slug: 'geography',
      repository: 'data-geography',
      category: 'geography',
      title: {
        en: 'Administrative Geography',
      },
    },
    release: {
      version: 'v0.1.0',
      status: 'released',
      publishedAt: '2026-06-27T00:00:00.000Z',
      notes: 'Tiny geography fixture release.',
    },
    artifacts: Object.entries(artifacts).map(([name, artifact]) => ({
      name,
      format: 'json',
      path: `artifacts/${name}.json`,
      sha256: artifact.sha256,
      sizeBytes: artifact.sizeBytes,
      recordCount: artifact.recordCount,
      mediaType: 'application/json',
    })),
    sources: [
      {
        id: 'fixture-source',
        title: 'OpenSyria test fixture',
        license: 'CC0-1.0',
        fields: ['names', 'coordinates', 'hierarchy'],
      },
    ],
  };

  await writeFile(path.join(releaseDirectory, 'release-manifest.json'), JSON.stringify(manifest));
}

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
