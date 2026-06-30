import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DatasetReleaseManifest } from '../../src/datasets/contracts/dataset-release-manifest.schema';

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

export async function createUniversitiesFixtureRelease(releaseDirectory: string) {
  const version = 'v0.2.0';
  const generatedAt = '2026-06-30T00:00:00.000Z';
  const publishedAt = '2026-06-30T00:46:15.000Z';
  const universities = createArtifact([
    {
      id: 'sy-damascus-university',
      name: {
        en: 'Damascus University',
        ar: '\u062c\u0627\u0645\u0639\u0629 \u062f\u0645\u0634\u0642',
      },
      aliases: [],
      institutionType: 'public',
      operationalStatus: 'unknown',
      foundedYear: 1923,
      website: 'https://damascusuniversity.edu.sy/',
      location: {
        governorate: {
          en: 'Damascus',
          ar: '\u062f\u0645\u0634\u0642',
        },
        locality: {
          en: 'Damascus',
        },
        centroid: {
          latitude: 33.5102,
          longitude: 36.2925,
        },
      },
      externalIds: {
        wikidata: 'Q821075',
        website: 'https://damascusuniversity.edu.sy/',
      },
      sourceIds: ['fixture-source'],
      sourceStatus: 'released',
    },
    {
      id: 'sy-higher-institute-of-dramatic-arts',
      name: {
        en: 'Higher Institute of Dramatic Arts',
        ar: '\u0627\u0644\u0645\u0639\u0647\u062f \u0627\u0644\u0639\u0627\u0644\u064a \u0644\u0644\u0641\u0646\u0648\u0646 \u0627\u0644\u0645\u0633\u0631\u062d\u064a\u0629',
      },
      aliases: [],
      institutionType: 'technical',
      operationalStatus: 'unknown',
      foundedYear: 1977,
      website: null,
      location: {
        governorate: {
          en: 'Damascus',
          ar: '\u062f\u0645\u0634\u0642',
        },
        locality: {
          en: 'Damascus',
        },
      },
      externalIds: {},
      sourceIds: ['fixture-source'],
      sourceStatus: 'released',
    },
  ]);
  const assets = createArtifact([
    {
      id: 'sy-damascus-university-logo',
      universityId: 'sy-damascus-university',
      assetType: 'image',
      assetRole: 'logo',
      title: {
        en: 'Damascus University logo',
        ar: '\u0634\u0639\u0627\u0631 \u062c\u0627\u0645\u0639\u0629 \u062f\u0645\u0634\u0642',
      },
      variants: [
        {
          url: 'https://cdn.opensyria.org/universities/sy-damascus-university/logo-v1/w256.webp',
          key: 'universities/sy-damascus-university/logo-v1/w256.webp',
          format: 'webp',
          contentType: 'image/webp',
          width: 256,
          height: 256,
          sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          sizeBytes: 12345,
        },
      ],
      attribution: {
        sourceProvider: 'Official university website',
        sourceTitle: 'Damascus University official logo',
        sourceUrl: 'https://damascusuniversity.edu.sy/',
        creator: 'Damascus University',
        license: 'Official institutional logo; trademark rights may apply',
        licenseUrl: 'https://damascusuniversity.edu.sy/',
        attributionRequired: false,
      },
      sourceIds: ['fixture-source'],
      sourceStatus: 'released',
    },
  ]);
  const rankings = createArtifact([
    {
      id: 'sy-damascus-university-ranking-national-2025',
      universityId: 'sy-damascus-university',
      rankingSystem: 'Fixture Ranking',
      rankScope: 'national',
      year: 2025,
      rank: 1,
      rankDisplay: '1',
      sourceUrl: 'https://example.org/rankings',
      retrievedAt: '2026-06-30T00:00:00.000Z',
      sourceIds: ['fixture-source'],
      sourceStatus: 'released',
    },
  ]);
  const artifacts = {
    universities,
    assets,
    rankings,
  };

  for (const [name, artifact] of Object.entries(artifacts)) {
    await writeJsonArtifact(releaseDirectory, name, artifact.buffer);
  }

  const manifest: DatasetReleaseManifest = {
    schemaVersion: '1.0',
    generatedAt,
    dataset: {
      id: 'opensyria-universities',
      slug: 'universities',
      repository: 'data-universities',
      category: 'education',
      title: {
        en: 'Universities',
        ar: '\u0627\u0644\u062c\u0627\u0645\u0639\u0627\u062a',
      },
    },
    release: {
      version,
      status: 'released',
      publishedAt,
      notes: 'Tiny universities fixture release.',
    },
    readiness: {
      level: 'profile_ready',
      publicApi: {
        status: 'approved',
        minimumLevel: 'profile_ready',
        reason: 'Fixture university profiles are approved for API tests.',
      },
      checks: [],
      domains: [],
      blockers: [],
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
        title: 'OpenSyria university test fixture',
        license: 'CC0-1.0',
        fields: ['identity', 'location', 'logos', 'rankings'],
      },
    ],
  };

  await writeFile(path.join(releaseDirectory, 'release-manifest.json'), JSON.stringify(manifest));
}
