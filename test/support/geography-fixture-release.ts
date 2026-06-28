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

type FixtureReleaseOptions = {
  version?: string;
  generatedAt?: string;
  publishedAt?: string;
};

export async function createFixtureRelease(
  releaseDirectory: string,
  options: FixtureReleaseOptions = {},
) {
  const version = options.version ?? 'v0.1.0';
  const generatedAt = options.generatedAt ?? '2026-06-27T00:00:00.000Z';
  const publishedAt = options.publishedAt ?? '2026-06-27T00:00:00.000Z';
  const governorates = createArtifact([
    {
      id: 'sy-damascus',
      name: {
        en: 'Damascus',
        ar: '\u062f\u0645\u0634\u0642',
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
        ar: '\u062f\u0645\u0634\u0642',
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
        ar: '\u062f\u0645\u0634\u0642',
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
        ar: '\u062f\u0645\u0634\u0642',
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
    generatedAt,
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
      version,
      status: 'released',
      publishedAt,
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
