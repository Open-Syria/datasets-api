import type { SourceAttribution } from '../../common/dto/source-attribution.dto';
import type {
  DatasetReleaseManifest,
  DatasetReleaseStatus,
} from '../../datasets/contracts/dataset-release-manifest.schema';

export const UNIVERSITIES_DATASET_ID = 'opensyria-universities';
export const UNIVERSITIES_REPOSITORY = 'data-universities';

type UniversitiesDatasetStatus = DatasetReleaseStatus | 'pending_release';

export type UniversitiesDatasetContext = {
  id: typeof UNIVERSITIES_DATASET_ID;
  repository: typeof UNIVERSITIES_REPOSITORY;
  status: UniversitiesDatasetStatus;
};

export type UniversitiesReleaseContext = {
  version: string;
  releasedAt: string;
} | null;

export function buildUniversitiesDatasetContext(
  manifest?: DatasetReleaseManifest,
): UniversitiesDatasetContext {
  return {
    id: UNIVERSITIES_DATASET_ID,
    repository: UNIVERSITIES_REPOSITORY,
    status: manifest?.release.status ?? 'pending_release',
  };
}

export function buildUniversitiesReleaseContext(
  manifest?: DatasetReleaseManifest,
): UniversitiesReleaseContext {
  const releaseVersion = manifest?.release.version;
  const releasedAt = manifest?.release.publishedAt;

  return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
}

export function mapUniversitiesSources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
  return (
    manifest?.sources.map((source) => ({
      id: source.id,
      title: source.title,
      url: source.url ?? null,
      license: source.license,
      accessedAt: source.accessedAt ?? null,
      fields: source.fields ?? [],
    })) ?? []
  );
}
