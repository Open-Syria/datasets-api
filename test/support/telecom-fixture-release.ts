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

export async function createTelecomFixtureRelease(releaseDirectory: string) {
  const version = 'v0.1.0';
  const generatedAt = '2026-07-14T00:00:00.000Z';
  const publishedAt = '2026-07-14T01:00:00.000Z';
  const sourceReferences = [
    {
      sourceId: 'fixture-telecom-source',
      sourceRecordId: 'fixture-record',
      sourceRecordDate: '2022-08-11',
      accessedAt: generatedAt,
    },
  ];
  const countryNumberingPlans = createArtifact([
    {
      id: 'sy-national-numbering-plan',
      countryCode: '963',
      countryIso2: 'SY',
      countryIso3: 'SYR',
      nationalPrefix: '0',
      internationalPrefix: null,
      planScope: 'fixed_and_mobile',
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
  ]);
  const operators = createArtifact([
    {
      id: 'sy-syrian-telecom',
      name: {
        en: 'Syrian Telecom',
      },
      operatorType: 'fixed',
      numberingRole: 'fixed_operator',
      assignmentStatus: 'assigned',
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
    {
      id: 'sy-syriatel',
      name: {
        en: 'Syriatel',
      },
      operatorType: 'mobile',
      numberingRole: 'mobile_operator',
      assignmentStatus: 'assigned',
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
  ]);
  const fixedAreaCodes = createArtifact([
    {
      id: 'sy-fixed-area-code-11-damascus-rif-dimashq',
      name: {
        en: 'Damascus and Rif Dimashq',
      },
      areaCode: '11',
      dialingPrefix: '011',
      operatorId: 'sy-syrian-telecom',
      governorateIds: ['sy-damascus', 'sy-rif-dimashq'],
      subscriberNumberLength: {
        min: 7,
        max: 7,
      },
      nationalSignificantNumberLength: {
        min: 9,
        max: 9,
      },
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
  ]);
  const mobilePrefixes = createArtifact([
    {
      id: 'sy-mobile-prefix-093-syriatel',
      prefix: '93',
      dialingPrefix: '093',
      operatorId: 'sy-syriatel',
      subscriberNumberLength: 7,
      assignmentStatus: 'assigned',
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
  ]);
  const numberRanges = createArtifact([
    {
      id: 'sy-mobile-prefix-090-reserved',
      name: {
        en: 'Reserved mobile prefix 090',
      },
      rangeType: 'reserved_mobile_prefix',
      ranges: ['090'],
      assignmentStatus: 'reserved',
      sourceIds: ['fixture-telecom-source'],
      sourceReferences,
      sourceStatus: 'released',
    },
  ]);
  const artifacts = {
    'country-numbering-plans': countryNumberingPlans,
    operators,
    'fixed-area-codes': fixedAreaCodes,
    'mobile-prefixes': mobilePrefixes,
    'number-ranges': numberRanges,
  };

  for (const [name, artifact] of Object.entries(artifacts)) {
    await writeJsonArtifact(releaseDirectory, name, artifact.buffer);
  }

  const manifest: DatasetReleaseManifest = {
    schemaVersion: '1.0',
    generatedAt,
    dataset: {
      id: 'opensyria-telecom',
      slug: 'telecom',
      repository: 'data-telecom',
      category: 'telecom',
      title: {
        en: 'Telecom Numbering',
        ar: '\u0628\u064a\u0627\u0646\u0627\u062a \u062a\u0631\u0642\u064a\u0645 \u0627\u0644\u0627\u062a\u0635\u0627\u0644\u0627\u062a',
      },
    },
    release: {
      version,
      status: 'released',
      publishedAt,
      notes: 'Tiny telecom fixture release.',
    },
    readiness: {
      level: 'api_ready',
      publicApi: {
        status: 'approved',
        minimumLevel: 'api_ready',
        reason: 'Fixture telecom records are approved for API tests.',
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
        id: 'fixture-telecom-source',
        title: 'OpenSyria telecom test fixture',
        license: 'CC0-1.0',
        fields: ['country code', 'operators', 'area codes', 'mobile prefixes', 'ranges'],
      },
    ],
  };

  await writeFile(path.join(releaseDirectory, 'release-manifest.json'), JSON.stringify(manifest));
}
