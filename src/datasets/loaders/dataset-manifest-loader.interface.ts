import type { DatasetReleaseManifest } from '../contracts/dataset-release-manifest.schema';

export type DatasetManifestLoader = {
  listManifests(): Promise<DatasetReleaseManifest[]>;
};
