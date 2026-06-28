import type { SourceAttribution } from '../../common/dto/source-attribution.dto';
import type { OffsetPagination } from '../../common/schemas/pagination.schema';
import type {
  DatasetReleaseManifest,
  DatasetReleaseStatus,
} from '../../datasets/contracts/dataset-release-manifest.schema';

export const GEOGRAPHY_DATASET_ID = 'opensyria-geography';
export const GEOGRAPHY_REPOSITORY = 'data-geography';

type GeographyDatasetStatus = DatasetReleaseStatus | 'pending_release';

export type GeographyDatasetContext = {
  id: typeof GEOGRAPHY_DATASET_ID;
  repository: typeof GEOGRAPHY_REPOSITORY;
  status: GeographyDatasetStatus;
};

export type GeographyReleaseContext = {
  version: string;
  releasedAt: string;
} | null;

type PaginationQuery = {
  page: number;
  limit: number;
};

type EnglishNamedRecord = {
  name: {
    en: string;
  };
};

export function buildGeographyDatasetContext(
  manifest?: DatasetReleaseManifest,
): GeographyDatasetContext {
  return {
    id: GEOGRAPHY_DATASET_ID,
    repository: GEOGRAPHY_REPOSITORY,
    status: manifest?.release.status ?? 'pending_release',
  };
}

export function buildGeographyReleaseContext(
  manifest?: DatasetReleaseManifest,
): GeographyReleaseContext {
  const releaseVersion = manifest?.release.version;
  const releasedAt = manifest?.release.publishedAt;

  return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
}

export function mapGeographySources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
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

export function sortByEnglishName<TRecord extends EnglishNamedRecord>(
  items: TRecord[],
  order: 'asc' | 'desc',
) {
  return [...items].sort((first, second) => {
    const comparison = first.name.en.localeCompare(second.name.en);

    return order === 'asc' ? comparison : -comparison;
  });
}

export function paginateRecords<TRecord>(items: TRecord[], query: PaginationQuery) {
  const start = (query.page - 1) * query.limit;

  return items.slice(start, start + query.limit);
}

export function buildOffsetPagination(
  totalRecords: number,
  query: PaginationQuery,
): OffsetPagination {
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.limit);
  const hasNextPage = totalPages > 0 && query.page < totalPages;
  const hasPreviousPage = query.page > 1 && query.page <= totalPages;

  return {
    limit: query.limit,
    currentPage: query.page,
    totalRecords,
    totalPages,
    nextPage: hasNextPage ? query.page + 1 : null,
    previousPage: hasPreviousPage ? query.page - 1 : null,
  };
}
