import type { SourceAttribution } from '../../common/dto/source-attribution.dto';
import type {
  DatasetReleaseManifest,
  DatasetReleaseStatus,
} from '../../datasets/contracts/dataset-release-manifest.schema';

export const TRANSPORT_DATASET_ID = 'opensyria-transport';
export const TRANSPORT_REPOSITORY = 'data-transport';

type TransportDatasetStatus = DatasetReleaseStatus | 'pending_release';

export type TransportDatasetContext = {
  id: typeof TRANSPORT_DATASET_ID;
  repository: typeof TRANSPORT_REPOSITORY;
  status: TransportDatasetStatus;
};

export type TransportReleaseContext = {
  version: string;
  releasedAt: string;
} | null;

export function buildTransportDatasetContext(
  manifest?: DatasetReleaseManifest,
): TransportDatasetContext {
  return {
    id: TRANSPORT_DATASET_ID,
    repository: TRANSPORT_REPOSITORY,
    status: manifest?.release.status ?? 'pending_release',
  };
}

export function buildTransportReleaseContext(
  manifest?: DatasetReleaseManifest,
): TransportReleaseContext {
  const releaseVersion = manifest?.release.version;
  const releasedAt = manifest?.release.publishedAt;

  return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
}

export function mapTransportSources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
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
