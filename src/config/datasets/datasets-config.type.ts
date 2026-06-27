import type { DatasetReleaseSource } from '../../datasets/sync/dataset-release-source.utils';

export type DatasetsConfig = {
  releasesDirectory: string;
  requireReleases: boolean;
  releaseSources: DatasetReleaseSource[];
  syncDownloadArtifacts: boolean;
  githubToken?: string;
};
