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

export async function createTransportFixtureRelease(releaseDirectory: string) {
  const version = 'v0.1.1';
  const generatedAt = '2026-07-08T00:00:00.000Z';
  const publishedAt = '2026-07-08T01:00:00.000Z';
  const locations = createArtifact([
    {
      id: 'sy-damascus-international-airport',
      name: {
        en: 'Damascus International Airport',
      },
      aliases: [],
      locationTypes: ['airport'],
      transportModes: ['air'],
      operationalStatus: 'unknown',
      coordinates: {
        latitude: 33.411499,
        longitude: 36.515598,
      },
      administrativeLocation: {
        governorateId: 'sy-rif-dimashq',
        localityName: {
          en: 'Damascus',
        },
      },
      externalIds: {
        iata: 'DAM',
        icao: 'OSDI',
        unLocode: 'SYDAM',
        wikidata: 'Q175162',
      },
      sourceIds: ['fixture-transport-source'],
      sourceReferences: [
        {
          sourceId: 'fixture-transport-source',
          sourceRecordId: 'OSDI',
          sourceRecordDate: '2026-07-08',
          accessedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      sourceStatus: 'released',
    },
    {
      id: 'sy-nasib-border-crossing',
      name: {
        en: 'Nasib Border Crossing',
      },
      aliases: [
        {
          value: 'Jaber Border Crossing',
          language: 'en',
          type: 'alias',
        },
      ],
      locationTypes: ['border_crossing'],
      transportModes: ['border', 'road'],
      operationalStatus: 'unknown',
      coordinates: {
        latitude: 32.516,
        longitude: 36.215,
      },
      administrativeLocation: {
        governorateId: 'sy-daraa',
      },
      externalIds: {},
      sourceIds: ['fixture-transport-source'],
      sourceReferences: [
        {
          sourceId: 'fixture-transport-source',
          sourceRecordId: 'nasib',
          sourceRecordDate: '2026-07-08',
          accessedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      sourceStatus: 'released',
    },
  ]);
  const statusSnapshots = createArtifact([
    {
      id: 'sy-damascus-international-airport-status-2026-05-21-logistics-cluster',
      locationId: 'sy-damascus-international-airport',
      observedStatus: 'active',
      statusAsOf: '2026-05-21',
      sourceNames: ['Damascus International Airport'],
      statusNote: 'Reported operational with cargo handling capacity.',
      sourceIds: ['fixture-transport-source'],
      sourceReferences: [
        {
          sourceId: 'fixture-transport-source',
          sourceRecordId: '2026-05-21:damascus-airport',
          sourceRecordDate: '2026-05-25',
          accessedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      sourceStatus: 'released',
    },
  ]);
  const routeSnapshots = createArtifact([
    {
      id: 'sy-route-jordan-syria-corridor-status-2026-05-25-logistics-cluster',
      name: {
        en: 'Jordan-Syria Corridor',
      },
      routeType: 'corridor',
      transportModes: ['road'],
      observedStatus: 'active',
      statusAsOf: '2026-05-25',
      origin: {
        en: 'Jordan',
      },
      destination: {
        en: 'Syria',
      },
      transitCountries: [],
      locationIds: ['sy-nasib-border-crossing'],
      sourceNames: ['Nasib/Jaber'],
      indicativeLeadTime: '2 days',
      routeNote: 'Timing depends on border congestion and customs clearance.',
      sourceIds: ['fixture-transport-source'],
      sourceReferences: [
        {
          sourceId: 'fixture-transport-source',
          sourceRecordId: '2026-05-25:jordan-syria',
          sourceRecordDate: '2026-05-25',
          accessedAt: '2026-07-08T00:00:00.000Z',
        },
      ],
      sourceStatus: 'released',
    },
  ]);
  const artifacts = {
    locations,
    'status-snapshots': statusSnapshots,
    'route-snapshots': routeSnapshots,
  };

  for (const [name, artifact] of Object.entries(artifacts)) {
    await writeJsonArtifact(releaseDirectory, name, artifact.buffer);
  }

  const manifest: DatasetReleaseManifest = {
    schemaVersion: '1.0',
    generatedAt,
    dataset: {
      id: 'opensyria-transport',
      slug: 'transport',
      repository: 'data-transport',
      category: 'transport',
      title: {
        en: 'Transport Locations',
        ar: '\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0646\u0642\u0644',
      },
    },
    release: {
      version,
      status: 'released',
      publishedAt,
      notes: 'Tiny transport fixture release.',
    },
    readiness: {
      level: 'public_directory_ready',
      publicApi: {
        status: 'approved',
        minimumLevel: 'public_directory_ready',
        reason: 'Fixture transport records are approved for API tests.',
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
        id: 'fixture-transport-source',
        title: 'OpenSyria transport test fixture',
        license: 'CC0-1.0',
        fields: ['identity', 'coordinates', 'status snapshots', 'route snapshots'],
      },
    ],
  };

  await writeFile(path.join(releaseDirectory, 'release-manifest.json'), JSON.stringify(manifest));
}
