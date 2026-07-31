import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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
  draft: false,
  prerelease: false,
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

  it('rejects a release manifest that differs from its pinned checksum', async () => {
    const fetchMock = createFetchMock();

    fetchMock
      .mockResolvedValueOnce(jsonResponse(release))
      .mockResolvedValueOnce(jsonResponse(manifest));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
      fetchMaxAttempts: 1,
      fetchRetryDelayMs: 0,
      fetchTimeoutMs: 1_000,
    });

    await expect(
      service.syncSources([{ ...source, manifestSha256: '0'.repeat(64) }]),
    ).rejects.toThrow(/Checksum mismatch for .* release-manifest\.json/);
  });

  it('refuses to replace a previously synced tag with different manifest content', async () => {
    const fetchMock = createFetchMock();
    const replacementManifest = {
      ...manifest,
      generatedAt: '2026-06-28T00:00:00.000Z',
    };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(release))
      .mockResolvedValueOnce(jsonResponse(manifest))
      .mockResolvedValueOnce(jsonResponse(release))
      .mockResolvedValueOnce(jsonResponse(replacementManifest));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
      fetchMaxAttempts: 1,
      fetchRetryDelayMs: 0,
      fetchTimeoutMs: 1_000,
    });

    await service.syncSources([source]);
    await expect(service.syncSources([source])).rejects.toThrow(
      /publish a new release tag instead of replacing an existing tag/,
    );
  });

  it('verifies and preserves an identical existing release in place', async () => {
    const fetchMock = createFetchMock();
    const artifactBuffer = Buffer.from('[{"id":"governorate-1"}]');
    const releaseWithArtifact = {
      ...release,
      assets: [
        ...release.assets,
        {
          name: 'governorates.json',
          browser_download_url:
            'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.json',
          size: artifactBuffer.byteLength,
        },
      ],
    };
    const manifestWithArtifact: DatasetReleaseManifest = {
      ...manifest,
      artifacts: [
        {
          name: 'governorates',
          format: 'json',
          path: 'artifacts/governorates.json',
          sha256: createHash('sha256').update(artifactBuffer).digest('hex'),
          sizeBytes: artifactBuffer.byteLength,
          recordCount: 1,
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(releaseWithArtifact))
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifact))
      .mockResolvedValueOnce(new Response(artifactBuffer, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(releaseWithArtifact))
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifact));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });

    await service.syncSources([source]);
    const [result] = await service.syncSources([source]);

    expect(result).toMatchObject({
      artifactsDownloaded: 0,
      artifactsSkipped: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(5);
    await expect(
      readFile(path.join(releasesDirectory, 'geography', 'v0.1.5', 'artifacts/governorates.json')),
    ).resolves.toEqual(artifactBuffer);
  });

  it('fails closed when an existing release artifact is corrupt', async () => {
    const fetchMock = createFetchMock();
    const artifactBuffer = Buffer.from('[{"id":"governorate-1"}]');
    const releaseWithArtifact = {
      ...release,
      assets: [
        ...release.assets,
        {
          name: 'governorates.json',
          browser_download_url:
            'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.json',
          size: artifactBuffer.byteLength,
        },
      ],
    };
    const manifestWithArtifact: DatasetReleaseManifest = {
      ...manifest,
      artifacts: [
        {
          name: 'governorates',
          format: 'json',
          path: 'artifacts/governorates.json',
          sha256: createHash('sha256').update(artifactBuffer).digest('hex'),
          sizeBytes: artifactBuffer.byteLength,
          recordCount: 1,
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(releaseWithArtifact))
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifact))
      .mockResolvedValueOnce(new Response(artifactBuffer, { status: 200 }))
      .mockResolvedValueOnce(jsonResponse(releaseWithArtifact))
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifact));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });

    await service.syncSources([source]);
    await writeFile(
      path.join(releasesDirectory, 'geography', 'v0.1.5', 'artifacts/governorates.json'),
      'corrupt',
    );

    await expect(service.syncSources([source])).rejects.toThrow(
      /corrupt local artifact artifacts\/governorates\.json/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('fails closed when an existing release directory has no manifest', async () => {
    const fetchMock = createFetchMock();

    fetchMock
      .mockResolvedValueOnce(jsonResponse(release))
      .mockResolvedValueOnce(jsonResponse(manifest));
    await mkdir(path.join(releasesDirectory, 'geography', 'v0.1.5'), {
      recursive: true,
    });

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });

    await expect(service.syncSources([source])).rejects.toThrow(
      /incomplete local release directory/,
    );
  });

  it('downloads only verified JSON artifacts and stages the manifest last', async () => {
    const fetchMock = createFetchMock();
    const artifactBuffer = Buffer.from('[{"id":"governorate-1"}]');
    const releaseWithArtifacts = {
      ...release,
      assets: [
        ...release.assets,
        {
          name: 'governorates.json',
          browser_download_url:
            'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.json',
          size: artifactBuffer.byteLength,
        },
        {
          name: 'governorates.csv',
          browser_download_url:
            'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.csv',
          size: 20,
        },
      ],
    };
    const manifestWithArtifacts: DatasetReleaseManifest = {
      ...manifest,
      artifacts: [
        {
          name: 'governorates',
          format: 'json',
          path: 'artifacts/governorates.json',
          sha256: createHash('sha256').update(artifactBuffer).digest('hex'),
          sizeBytes: artifactBuffer.byteLength,
          recordCount: 1,
        },
        {
          name: 'governorates',
          format: 'csv',
          path: 'artifacts/governorates.csv',
          sha256: '0'.repeat(64),
          sizeBytes: 20,
          recordCount: 1,
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(jsonResponse(releaseWithArtifacts))
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifacts))
      .mockResolvedValueOnce(new Response(artifactBuffer, { status: 200 }));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });
    const [result] = await service.syncSources([source]);
    const releaseDirectory = path.join(releasesDirectory, 'geography', 'v0.1.5');

    expect(result).toMatchObject({
      artifactsDownloaded: 1,
      artifactsSkipped: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(await readFile(path.join(releaseDirectory, 'artifacts/governorates.json'))).toEqual(
      artifactBuffer,
    );
    await expect(
      access(path.join(releaseDirectory, 'artifacts/governorates.csv')),
    ).rejects.toThrow();
    await expect(
      access(path.join(releaseDirectory, 'release-manifest.json')),
    ).resolves.toBeUndefined();
  });

  it('rejects a manifest that does not match the configured repository', async () => {
    const fetchMock = createFetchMock();

    fetchMock.mockResolvedValueOnce(jsonResponse(release)).mockResolvedValueOnce(
      jsonResponse({
        ...manifest,
        dataset: {
          ...manifest.dataset,
          repository: 'data-telecom',
        },
      }),
    );

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });

    await expect(service.syncSources([source])).rejects.toThrow(
      'manifest repository is data-telecom, expected data-geography',
    );
  });

  it('does not register a manifest when a JSON artifact fails verification', async () => {
    const fetchMock = createFetchMock();
    const artifactBuffer = Buffer.from('[]');
    const manifestWithArtifact: DatasetReleaseManifest = {
      ...manifest,
      artifacts: [
        {
          name: 'governorates',
          format: 'json',
          path: 'artifacts/governorates.json',
          sha256: '0'.repeat(64),
          sizeBytes: artifactBuffer.byteLength,
          recordCount: 0,
        },
      ],
    };

    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          ...release,
          assets: [
            ...release.assets,
            {
              name: 'governorates.json',
              browser_download_url:
                'https://github.com/Open-Syria/data-geography/releases/download/v0.1.5/governorates.json',
              size: artifactBuffer.byteLength,
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse(manifestWithArtifact))
      .mockResolvedValueOnce(new Response(artifactBuffer, { status: 200 }));

    const service = new GitHubReleaseSyncService({
      releasesDirectory,
      downloadArtifacts: true,
    });

    await expect(service.syncSources([source])).rejects.toThrow('Checksum mismatch');
    await expect(
      access(path.join(releasesDirectory, 'geography', 'v0.1.5', 'release-manifest.json')),
    ).rejects.toThrow();
  });
});
