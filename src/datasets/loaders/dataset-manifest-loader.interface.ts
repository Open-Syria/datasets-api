import type { DatasetReleaseManifest } from '../contracts/dataset-release-manifest.schema';

export type LoadedDatasetReleaseManifest = {
  manifest: DatasetReleaseManifest;
  manifestPath: string;
  releaseDirectory: string;
};

export type DatasetManifestLoader = {
  listManifests(): Promise<LoadedDatasetReleaseManifest[]>;
};
