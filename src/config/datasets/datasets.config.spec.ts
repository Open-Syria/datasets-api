import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { getConfig } from './datasets.config';

const originalCwd = process.cwd();
const originalDatasetReleaseSources = process.env.DATASETS_RELEASE_SOURCES;
const originalDatasetReleaseSourcesFile = process.env.DATASETS_RELEASE_SOURCES_FILE;
const originalDatasetReleaseSourcesOverride = process.env.DATASETS_RELEASE_SOURCES_OVERRIDE;

function setEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

describe('datasets config', () => {
  let tempDirectory: string;

  beforeEach(async () => {
    tempDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-datasets-config-'));
    process.chdir(tempDirectory);
    delete process.env.DATASETS_RELEASE_SOURCES;
    delete process.env.DATASETS_RELEASE_SOURCES_FILE;
    delete process.env.DATASETS_RELEASE_SOURCES_OVERRIDE;
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    setEnv('DATASETS_RELEASE_SOURCES', originalDatasetReleaseSources);
    setEnv('DATASETS_RELEASE_SOURCES_FILE', originalDatasetReleaseSourcesFile);
    setEnv('DATASETS_RELEASE_SOURCES_OVERRIDE', originalDatasetReleaseSourcesOverride);
    await rm(tempDirectory, { force: true, recursive: true });
  });

  it('prefers the tracked release source file over stale environment sources', async () => {
    await writeFile(
      path.join(tempDirectory, 'dataset-releases.json'),
      JSON.stringify({
        sources: [
          {
            owner: 'Open-Syria',
            repository: 'data-geography',
            tag: 'v0.1.3',
          },
        ],
      }),
    );
    process.env.DATASETS_RELEASE_SOURCES = 'Open-Syria/data-geography@v0.1.0';

    expect(getConfig().releaseSources).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.3',
      },
    ]);
  });

  it('falls back to environment sources when the release source file is absent', () => {
    process.env.DATASETS_RELEASE_SOURCES = 'Open-Syria/data-geography@v0.1.3';

    expect(getConfig().releaseSources).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.3',
      },
    ]);
  });

  it('allows an explicit environment override for one-off sync operations', async () => {
    await writeFile(
      path.join(tempDirectory, 'dataset-releases.json'),
      JSON.stringify({
        sources: [
          {
            owner: 'Open-Syria',
            repository: 'data-geography',
            tag: 'v0.1.3',
          },
        ],
      }),
    );
    process.env.DATASETS_RELEASE_SOURCES = 'Open-Syria/data-geography@v0.1.0';
    process.env.DATASETS_RELEASE_SOURCES_OVERRIDE = 'true';

    expect(getConfig().releaseSources).toEqual([
      {
        owner: 'Open-Syria',
        repository: 'data-geography',
        tag: 'v0.1.0',
      },
    ]);
  });
});
