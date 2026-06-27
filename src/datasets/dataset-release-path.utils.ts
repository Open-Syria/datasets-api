import path from 'node:path';
import type { DatasetReleaseManifest } from './contracts/dataset-release-manifest.schema';

export const RELEASE_MANIFEST_FILE = 'release-manifest.json';

export function sanitizeDatasetReleasePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function resolveDatasetReleaseDirectory(
  releasesDirectory: string,
  manifest: DatasetReleaseManifest,
) {
  return path.resolve(
    releasesDirectory,
    sanitizeDatasetReleasePathSegment(manifest.dataset.slug),
    sanitizeDatasetReleasePathSegment(manifest.release.version),
  );
}

export function safeResolveDatasetReleasePath(baseDirectory: string, relativePath: string) {
  const targetPath = path.resolve(baseDirectory, relativePath);
  const normalizedBase = path.resolve(baseDirectory);

  if (targetPath !== normalizedBase && !targetPath.startsWith(`${normalizedBase}${path.sep}`)) {
    throw new Error(`Refusing to access outside release directory: ${relativePath}`);
  }

  return targetPath;
}
