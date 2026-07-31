import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  type DatasetReadinessLevel,
  type DatasetReleaseArtifact,
  type DatasetReleaseManifest,
  datasetReleaseManifestSchema,
} from '../contracts/dataset-release-manifest.schema';
import {
  RELEASE_MANIFEST_FILE,
  resolveDatasetReleaseDirectory,
  safeResolveDatasetReleasePath,
} from '../dataset-release-path.utils';
import {
  type DatasetReleaseSource,
  formatDatasetReleaseSource,
} from './dataset-release-source.utils';

const githubReleaseAssetSchema = z.object({
  name: z.string(),
  browser_download_url: z.string().url(),
  size: z.number().int().nonnegative(),
});

const githubReleaseSchema = z.object({
  tag_name: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  assets: z.array(githubReleaseAssetSchema),
});

type GitHubReleaseAsset = z.infer<typeof githubReleaseAssetSchema>;
type GitHubRelease = z.infer<typeof githubReleaseSchema>;

const defaultFetchMaxAttempts = 4;
const defaultFetchRetryDelayMs = 2_000;
const defaultFetchTimeoutMs = 30_000;
const retryableHttpStatuses = new Set([408, 429, 500, 502, 503, 504]);

const readinessLevelOrder: Record<DatasetReadinessLevel, number> = {
  raw_seed: 0,
  identity_seed_ready: 1,
  public_directory_ready: 2,
  profile_ready: 3,
  api_ready: 4,
};

export type GitHubReleaseSyncOptions = {
  releasesDirectory: string;
  githubToken?: string;
  downloadArtifacts: boolean;
  fetchMaxAttempts?: number;
  fetchRetryDelayMs?: number;
  fetchTimeoutMs?: number;
};

export type GitHubReleaseSyncResult = {
  source: string;
  manifestPath: string;
  artifactsDownloaded: number;
  artifactsSkipped: number;
};

function getArtifactAssetName(artifact: DatasetReleaseArtifact) {
  return path.posix.basename(artifact.path);
}

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function formatUnknownError(error: unknown): string {
  if (error instanceof Error) {
    const cause = error.cause === undefined ? '' : `; cause: ${formatUnknownError(error.cause)}`;

    return `${error.name}: ${error.message}${cause}`;
  }

  if (typeof error === 'object' && error !== null) {
    const details = ['code', 'errno', 'syscall', 'hostname', 'host', 'port', 'address']
      .flatMap((key) => {
        if (!(key in error)) {
          return [];
        }

        const value = error[key as keyof typeof error];

        return value === undefined ? [] : [`${key}=${String(value)}`];
      })
      .join(', ');

    return details || String(error);
  }

  return String(error);
}

function getNodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

function getRetryDelay(attempt: number, baseDelayMs: number) {
  return baseDelayMs * 2 ** (attempt - 1);
}

async function readResponseSnippet(response: Response) {
  try {
    const text = await response.text();

    if (!text) {
      return '';
    }

    return ` Body: ${text.slice(0, 500)}`;
  } catch {
    return '';
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GitHubReleaseSyncService {
  constructor(private readonly options: GitHubReleaseSyncOptions) {}

  async syncSources(sources: DatasetReleaseSource[]): Promise<GitHubReleaseSyncResult[]> {
    const results: GitHubReleaseSyncResult[] = [];

    for (const source of sources) {
      results.push(await this.syncSource(source));
    }

    return results;
  }

  private async syncSource(source: DatasetReleaseSource): Promise<GitHubReleaseSyncResult> {
    const release = await this.fetchRelease(source);
    const manifestAsset = this.getRequiredAsset(release, RELEASE_MANIFEST_FILE, source);
    const sourceLabel = formatDatasetReleaseSource(source);
    const manifestBuffer = await this.downloadAsset(
      manifestAsset.browser_download_url,
      `${sourceLabel} ${RELEASE_MANIFEST_FILE}`,
    );
    const manifestChecksum = sha256(manifestBuffer);

    if (source.manifestSha256 && manifestChecksum !== source.manifestSha256) {
      throw new Error(
        `Checksum mismatch for ${sourceLabel} ${RELEASE_MANIFEST_FILE}: expected ${source.manifestSha256}, got ${manifestChecksum}`,
      );
    }
    const manifest = datasetReleaseManifestSchema.parse(
      JSON.parse(manifestBuffer.toString('utf8')),
    );

    this.assertReleaseIdentity(source, release, manifest);
    this.assertReadiness(source, manifest);

    const releaseDirectory = resolveDatasetReleaseDirectory(
      this.options.releasesDirectory,
      manifest,
    );
    const manifestPath = safeResolveDatasetReleasePath(releaseDirectory, RELEASE_MANIFEST_FILE);
    const releaseAlreadyExists = await this.validateExistingRelease(
      releaseDirectory,
      manifest,
      manifestChecksum,
      sourceLabel,
    );

    if (releaseAlreadyExists) {
      return {
        source: sourceLabel,
        manifestPath,
        artifactsDownloaded: 0,
        artifactsSkipped: manifest.artifacts.length,
      };
    }

    const stagingDirectory = path.join(
      path.dirname(releaseDirectory),
      `.${path.basename(releaseDirectory)}.sync-${randomUUID()}`,
    );

    await mkdir(stagingDirectory, { recursive: true });

    try {
      const artifactsDownloaded = this.options.downloadArtifacts
        ? await this.downloadArtifacts(release, manifest, stagingDirectory)
        : 0;
      const stagingManifestPath = safeResolveDatasetReleasePath(
        stagingDirectory,
        RELEASE_MANIFEST_FILE,
      );

      await writeFile(stagingManifestPath, manifestBuffer);
      await this.replaceReleaseDirectory(stagingDirectory, releaseDirectory);

      return {
        source: sourceLabel,
        manifestPath,
        artifactsDownloaded,
        artifactsSkipped: manifest.artifacts.length - artifactsDownloaded,
      };
    } catch (error) {
      await rm(stagingDirectory, { force: true, recursive: true });
      throw error;
    }
  }

  private async downloadArtifacts(
    release: GitHubRelease,
    manifest: DatasetReleaseManifest,
    releaseDirectory: string,
  ) {
    let downloaded = 0;

    for (const artifact of manifest.artifacts.filter(({ format }) => format === 'json')) {
      const assetName = getArtifactAssetName(artifact);
      const asset = this.getRequiredAsset(release, assetName, {
        owner: manifest.dataset.repository,
        repository: manifest.dataset.repository,
        tag: manifest.release.version,
      });

      if (asset.size !== artifact.sizeBytes) {
        throw new Error(
          `GitHub asset size mismatch for ${assetName}: expected ${artifact.sizeBytes}, got ${asset.size}`,
        );
      }

      const artifactBuffer = await this.downloadAsset(
        asset.browser_download_url,
        `${manifest.dataset.repository}@${manifest.release.version} ${assetName}`,
      );
      const checksum = sha256(artifactBuffer);

      if (checksum !== artifact.sha256) {
        throw new Error(
          `Checksum mismatch for ${assetName}: expected ${artifact.sha256}, got ${checksum}`,
        );
      }

      if (artifact.sizeBytes !== artifactBuffer.byteLength) {
        throw new Error(
          `Size mismatch for ${assetName}: expected ${artifact.sizeBytes}, got ${artifactBuffer.byteLength}`,
        );
      }

      const artifactPath = safeResolveDatasetReleasePath(releaseDirectory, artifact.path);

      await mkdir(path.dirname(artifactPath), { recursive: true });
      await writeFile(artifactPath, artifactBuffer);
      downloaded += 1;
    }

    return downloaded;
  }

  private assertReleaseIdentity(
    source: DatasetReleaseSource,
    release: GitHubRelease,
    manifest: DatasetReleaseManifest,
  ) {
    const sourceLabel = formatDatasetReleaseSource(source);

    if (release.tag_name !== source.tag) {
      throw new Error(
        `${sourceLabel} returned GitHub release tag ${release.tag_name}, expected ${source.tag}`,
      );
    }

    if (release.draft || release.prerelease) {
      throw new Error(`${sourceLabel} must be a published, non-prerelease GitHub release`);
    }

    if (manifest.dataset.repository !== source.repository) {
      throw new Error(
        `${sourceLabel} manifest repository is ${manifest.dataset.repository}, expected ${source.repository}`,
      );
    }

    if (manifest.release.version !== source.tag) {
      throw new Error(
        `${sourceLabel} manifest version is ${manifest.release.version}, expected ${source.tag}`,
      );
    }

    if (manifest.release.status !== 'released') {
      throw new Error(
        `${sourceLabel} manifest status is ${manifest.release.status}, expected released`,
      );
    }
  }

  private async replaceReleaseDirectory(stagingDirectory: string, releaseDirectory: string) {
    const backupDirectory = path.join(
      path.dirname(releaseDirectory),
      `.${path.basename(releaseDirectory)}.backup-${randomUUID()}`,
    );
    let hasBackup = false;

    await mkdir(path.dirname(releaseDirectory), { recursive: true });

    try {
      await rename(releaseDirectory, backupDirectory);
      hasBackup = true;
    } catch (error) {
      if (getNodeErrorCode(error) !== 'ENOENT') {
        throw error;
      }
    }

    try {
      await rename(stagingDirectory, releaseDirectory);
    } catch (error) {
      if (hasBackup) {
        await rename(backupDirectory, releaseDirectory);
      }

      throw error;
    }

    if (hasBackup) {
      await rm(backupDirectory, { force: true, recursive: true });
    }
  }

  private async validateExistingRelease(
    releaseDirectory: string,
    manifest: DatasetReleaseManifest,
    manifestChecksum: string,
    sourceLabel: string,
  ): Promise<boolean> {
    const existingManifestPath = safeResolveDatasetReleasePath(
      releaseDirectory,
      RELEASE_MANIFEST_FILE,
    );

    try {
      const existingManifest = await readFile(existingManifestPath);
      const existingChecksum = sha256(existingManifest);

      if (existingChecksum !== manifestChecksum) {
        throw new Error(
          `${sourceLabel} is already synced with a different release manifest; publish a new release tag instead of replacing an existing tag`,
        );
      }

      if (this.options.downloadArtifacts) {
        await this.validateExistingArtifacts(releaseDirectory, manifest, sourceLabel);
      }

      return true;
    } catch (error) {
      if (getNodeErrorCode(error) !== 'ENOENT') {
        throw error;
      }
    }

    try {
      await lstat(releaseDirectory);
    } catch (error) {
      if (getNodeErrorCode(error) === 'ENOENT') {
        return false;
      }

      throw error;
    }

    throw new Error(
      `${sourceLabel} has an incomplete local release directory; repair it before syncing`,
    );
  }

  private async validateExistingArtifacts(
    releaseDirectory: string,
    manifest: DatasetReleaseManifest,
    sourceLabel: string,
  ) {
    for (const artifact of manifest.artifacts.filter(({ format }) => format === 'json')) {
      const artifactPath = safeResolveDatasetReleasePath(releaseDirectory, artifact.path);
      let artifactBuffer: Buffer;

      try {
        artifactBuffer = await readFile(artifactPath);
      } catch (error) {
        if (getNodeErrorCode(error) === 'ENOENT') {
          throw new Error(
            `${sourceLabel} has a missing local artifact ${artifact.path}; repair it before syncing`,
          );
        }

        throw error;
      }

      if (
        artifactBuffer.byteLength !== artifact.sizeBytes ||
        sha256(artifactBuffer) !== artifact.sha256
      ) {
        throw new Error(
          `${sourceLabel} has a corrupt local artifact ${artifact.path}; repair it before syncing`,
        );
      }
    }
  }

  private assertReadiness(source: DatasetReleaseSource, manifest: DatasetReleaseManifest) {
    const requiredReadiness = source.requiredReadiness;

    if (!requiredReadiness) {
      return;
    }

    const manifestReadiness = manifest.readiness;

    if (!manifestReadiness) {
      throw new Error(
        `${formatDatasetReleaseSource(source)} does not declare release readiness metadata`,
      );
    }

    if (
      requiredReadiness.minimumLevel &&
      readinessLevelOrder[manifestReadiness.level] <
        readinessLevelOrder[requiredReadiness.minimumLevel]
    ) {
      throw new Error(
        `${formatDatasetReleaseSource(source)} readiness level is ${manifestReadiness.level}, expected at least ${requiredReadiness.minimumLevel}`,
      );
    }

    if (
      requiredReadiness.publicApi &&
      manifestReadiness.publicApi.status !== requiredReadiness.publicApi
    ) {
      throw new Error(
        `${formatDatasetReleaseSource(source)} public API readiness is ${manifestReadiness.publicApi.status}, expected ${requiredReadiness.publicApi}`,
      );
    }
  }

  private async fetchRelease(source: DatasetReleaseSource): Promise<GitHubRelease> {
    const sourceLabel = formatDatasetReleaseSource(source);
    const url = `https://api.github.com/repos/${source.owner}/${source.repository}/releases/tags/${source.tag}`;
    const response = await this.fetchWithRetry(url, `fetch GitHub release ${sourceLabel}`);

    if (!response.ok) {
      const body = await readResponseSnippet(response);

      throw new Error(
        `Failed to fetch ${sourceLabel} from ${url}: ${response.status} ${response.statusText}.${body}`,
      );
    }

    return githubReleaseSchema.parse(await response.json());
  }

  private async downloadAsset(url: string, label: string): Promise<Buffer> {
    const response = await this.fetchWithRetry(url, `download GitHub release asset ${label}`);

    if (!response.ok) {
      const body = await readResponseSnippet(response);

      throw new Error(
        `Failed to download ${label} from ${url}: ${response.status} ${response.statusText}.${body}`,
      );
    }

    return Buffer.from(await response.arrayBuffer());
  }

  private async fetchWithRetry(url: string, action: string): Promise<Response> {
    const maxAttempts = this.options.fetchMaxAttempts ?? defaultFetchMaxAttempts;
    const retryDelayMs = this.options.fetchRetryDelayMs ?? defaultFetchRetryDelayMs;
    const timeoutMs = this.options.fetchTimeoutMs ?? defaultFetchTimeoutMs;
    let lastFailure = 'unknown failure';

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(url, {
          headers: this.getHeaders(),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!retryableHttpStatuses.has(response.status) || attempt === maxAttempts) {
          return response;
        }

        lastFailure = `${response.status} ${response.statusText}`;
      } catch (error) {
        lastFailure = formatUnknownError(error);

        if (attempt === maxAttempts) {
          throw new Error(
            `Failed to ${action} from ${url} after ${attempt}/${maxAttempts} attempts: ${lastFailure}`,
            { cause: error },
          );
        }
      }

      await sleep(getRetryDelay(attempt, retryDelayMs));
    }

    throw new Error(`Failed to ${action} from ${url}: ${lastFailure}`);
  }

  private getRequiredAsset(
    release: GitHubRelease,
    assetName: string,
    source: DatasetReleaseSource,
  ): GitHubReleaseAsset {
    const asset = release.assets.find((releaseAsset) => releaseAsset.name === assetName);

    if (!asset) {
      throw new Error(`Missing ${assetName} in ${formatDatasetReleaseSource(source)}`);
    }

    return asset;
  }

  private getHeaders() {
    return {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'OpenSyria-Datasets-API',
      ...(this.options.githubToken ? { Authorization: `Bearer ${this.options.githubToken}` } : {}),
    };
  }
}
