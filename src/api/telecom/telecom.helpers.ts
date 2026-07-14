import type { SourceAttribution } from '../../common/dto/source-attribution.dto';
import type {
  DatasetReleaseManifest,
  DatasetReleaseStatus,
} from '../../datasets/contracts/dataset-release-manifest.schema';

export const TELECOM_DATASET_ID = 'opensyria-telecom';
export const TELECOM_REPOSITORY = 'data-telecom';

type TelecomDatasetStatus = DatasetReleaseStatus | 'pending_release';

export type TelecomDatasetContext = {
  id: typeof TELECOM_DATASET_ID;
  repository: typeof TELECOM_REPOSITORY;
  status: TelecomDatasetStatus;
};

export type TelecomReleaseContext = {
  version: string;
  releasedAt: string;
} | null;

export function buildTelecomDatasetContext(
  manifest?: DatasetReleaseManifest,
): TelecomDatasetContext {
  return {
    id: TELECOM_DATASET_ID,
    repository: TELECOM_REPOSITORY,
    status: manifest?.release.status ?? 'pending_release',
  };
}

export function buildTelecomReleaseContext(
  manifest?: DatasetReleaseManifest,
): TelecomReleaseContext {
  const releaseVersion = manifest?.release.version;
  const releasedAt = manifest?.release.publishedAt;

  return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
}

export function mapTelecomSources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
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
