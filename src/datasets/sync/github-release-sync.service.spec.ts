import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { DatasetReleaseManifest } from '../contracts/dataset-release-manifest.schema';
import { GitHubReleaseSyncService } from './github-release-sync.service';

const source = {
  owner: 'Open-Syria',
  repository: 'data-geography',
  tag: 'v0.1.5',
};

const release = {
  tag_name: 'v0.1.5',
  assets: [
    {
      name: 'release-manifest.json',
      browser_download_url:
        'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/release-manifest.json',
      size: 512,
    },
  ],
};

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
    version: 'v0.1.5',
    status: 'released',
    publishedAt: '2026-06-27T00:00:00.000Z',
  },
  artifacts: [],
  sources: [
    {
      id: 'fixture-source',
      title: 'OpenSyria test fixture',
      license: 'CC0-1.0',
    },
  ],
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json',
    },
    status: 200,
  });
}

function createFetchMock() {
  const fetchMock = jest.fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>();
  global.fetch = fetchMock as typeof fetch;

  return fetchMock;
}

describe('GitHubReleaseSyncService', () => {
  const originalFetch = global.fetch;
  let releasesDirectory: string;

  beforeEach(async () => {
    releasesDirectory = await mkdtemp(path.join(tmpdir(), 'opensyria-release-sync-'));
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    await rm(releasesDirectory, { force: true, recursive: true });
  });

  it('retries transient fetch failures while syncing a release', async () => {
    const fetchMock = createFetchMock();

    fetchMock
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(jsonResponse(release))
      .mockResolvedValueOnce(jsonResponse(manifest));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
      fetchMaxAttempts: 2,
      fetchRetryDelayMs: 0,
      fetchTimeoutMs: 1_000,
    });

    const [result] = await service.syncSources([source]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      source: 'Open-Syria/data-geography@v0.1.5',
      artifactsDownloaded: 0,
      artifactsSkipped: 0,
    });
    expect(result?.manifestPath).toContain('release-manifest.json');
  });

  it('includes the release URL and network cause when GitHub fetch fails', async () => {
    const fetchMock = createFetchMock();
    const cause = Object.assign(new Error('getaddrinfo ENOTFOUND api.github.com'), {
      code: 'ENOTFOUND',
      hostname: 'api.github.com',
    });

    fetchMock.mockRejectedValue(new Error('fetch failed', { cause }));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
      fetchMaxAttempts: 1,
      fetchRetryDelayMs: 0,
      fetchTimeoutMs: 1_000,
    });

    await expect(service.syncSources([source])).rejects.toThrow(
      /https:\/\/api\.github\.com\/repos\/Open-Syria\/data-geography\/releases\/tags\/v0\.1\.5/,
    );
    await expect(service.syncSources([source])).rejects.toThrow(/ENOTFOUND/);
  });
});
