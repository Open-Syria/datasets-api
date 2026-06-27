import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
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
  assets: z.array(githubReleaseAssetSchema),
});

type GitHubReleaseAsset = z.infer<typeof githubReleaseAssetSchema>;
type GitHubRelease = z.infer<typeof githubReleaseSchema>;

export type GitHubReleaseSyncOptions = {
  releasesDirectory: string;
  githubToken?: string;
  downloadArtifacts: boolean;
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
    const manifestBuffer = await this.downloadAsset(manifestAsset.browser_download_url);
    const manifest = datasetReleaseManifestSchema.parse(
      JSON.parse(manifestBuffer.toString('utf8')),
    );
    const releaseDirectory = resolveDatasetReleaseDirectory(
      this.options.releasesDirectory,
      manifest,
    );
    const manifestPath = safeResolveDatasetReleasePath(releaseDirectory, RELEASE_MANIFEST_FILE);

    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    if (!this.options.downloadArtifacts) {
      return {
        source: formatDatasetReleaseSource(source),
        manifestPath,
        artifactsDownloaded: 0,
        artifactsSkipped: manifest.artifacts.length,
      };
    }

    const artifactsDownloaded = await this.downloadArtifacts(release, manifest, releaseDirectory);

    return {
      source: formatDatasetReleaseSource(source),
      manifestPath,
      artifactsDownloaded,
      artifactsSkipped: manifest.artifacts.length - artifactsDownloaded,
    };
  }

  private async downloadArtifacts(
    release: GitHubRelease,
    manifest: DatasetReleaseManifest,
    releaseDirectory: string,
  ) {
    let downloaded = 0;

    for (const artifact of manifest.artifacts) {
      const assetName = getArtifactAssetName(artifact);
      const asset = this.getRequiredAsset(release, assetName, {
        owner: manifest.dataset.repository,
        repository: manifest.dataset.repository,
        tag: manifest.release.version,
      });
      const artifactBuffer = await this.downloadAsset(asset.browser_download_url);
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

  private async fetchRelease(source: DatasetReleaseSource): Promise<GitHubRelease> {
    const response = await fetch(
      `https://api.github.com/repos/${source.owner}/${source.repository}/releases/tags/${source.tag}`,
      {
        headers: this.getHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch ${formatDatasetReleaseSource(source)}: ${response.status} ${response.statusText}`,
      );
    }

    return githubReleaseSchema.parse(await response.json());
  }

  private async downloadAsset(url: string): Promise<Buffer> {
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
    }

    return Buffer.from(await response.arrayBuffer());
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
