import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { GlobalConfig } from '../../config/config.type';
import type { DatasetReleaseManifest } from '../contracts/dataset-release-manifest.schema';
import type { DatasetReleaseRegistryService } from '../dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from './local-dataset-artifact-reader.service';

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function createConfigService(releasesDirectory: string) {
  return {
    getOrThrow: jest.fn().mockReturnValue({
      releasesDirectory,
    }),
  } as unknown as ConfigService<GlobalConfig>;
}

function createRegistryService(manifest?: DatasetReleaseManifest) {
  return {
    getManifestByDatasetId: jest.fn().mockReturnValue(manifest),
  } as unknown as DatasetReleaseRegistryService;
}

function createManifest(overrides: { sha256: string; sizeBytes: number }): DatasetReleaseManifest {
  return {
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
      notes: null,
    },
    artifacts: [
      {
        name: 'governorates',
        format: 'json',
        path: 'artifacts/governorates.json',
        sha256: overrides.sha256,
        sizeBytes: overrides.sizeBytes,
        recordCount: 1,
        mediaType: 'application/json',
      },
    ],
    sources: [
      {
        id: 'source-1',
        title: 'Example source',
        license: 'CC0-1.0',
      },
    ],
  };
}

describe('LocalDatasetArtifactReaderService', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-datasets-'));
  });

  afterEach(async () => {
    await rm(tempDirectory, { force: true, recursive: true });
  });

  it('returns null when the dataset has no registered manifest', async () => {
    const service = new LocalDatasetArtifactReaderService(
      createConfigService(tempDirectory),
      createRegistryService(),
    );

    await expect(
      service.readJsonArtifact({
        datasetId: 'opensyria-geography',
        artifactName: 'governorates',
        schema: z.array(z.object({ id: z.string() })),
      }),
    ).resolves.toBeNull();
  });

  it('reads and validates a local JSON artifact from the release directory', async () => {
    const artifactBuffer = Buffer.from(JSON.stringify([{ id: 'sy-hl' }]));
    const manifest = createManifest({
      sha256: sha256(artifactBuffer),
      sizeBytes: artifactBuffer.byteLength,
    });
    const artifactDirectory = path.join(tempDirectory, 'geography', 'v0.1.0', 'artifacts');

    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(path.join(artifactDirectory, 'governorates.json'), artifactBuffer);

    const service = new LocalDatasetArtifactReaderService(
      createConfigService(tempDirectory),
      createRegistryService(manifest),
    );
    const result = await service.readJsonArtifact({
      datasetId: 'opensyria-geography',
      artifactName: 'governorates',
      schema: z.array(z.object({ id: z.string() })),
    });

    expect(result?.manifest).toBe(manifest);
    expect(result?.artifact.name).toBe('governorates');
    expect(result?.data).toEqual([{ id: 'sy-hl' }]);
  });

  it('rejects artifacts that fail checksum verification', async () => {
    const artifactBuffer = Buffer.from(JSON.stringify([{ id: 'sy-hl' }]));
    const manifest = createManifest({
      sha256: '0'.repeat(64),
      sizeBytes: artifactBuffer.byteLength,
    });
    const artifactDirectory = path.join(tempDirectory, 'geography', 'v0.1.0', 'artifacts');

    await mkdir(artifactDirectory, { recursive: true });
    await writeFile(path.join(artifactDirectory, 'governorates.json'), artifactBuffer);

    const service = new LocalDatasetArtifactReaderService(
      createConfigService(tempDirectory),
      createRegistryService(manifest),
    );

    await expect(
      service.readJsonArtifact({
        datasetId: 'opensyria-geography',
        artifactName: 'governorates',
        schema: z.array(z.object({ id: z.string() })),
      }),
    ).rejects.toThrow('failed checksum verification');
  });
});
