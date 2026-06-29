import { DEFAULT_CURRENT_PAGE, DEFAULT_PAGE_LIMIT } from '../../constants/app.constants';
import type { OffsetPagination, OffsetPaginationQuery } from '../schemas/pagination.schema';

type OffsetListQuery = Pick<OffsetPaginationQuery, 'page' | 'limit'>;

export function paginateOffsetItems<TItem>(items: readonly TItem[], query: OffsetListQuery) {
  const start = (query.page - 1) * query.limit;

  return items.slice(start, start + query.limit);
}

export function buildOffsetPagination(
  totalRecords: number,
  query: Partial<OffsetListQuery> | undefined,
  pageRecords: number,
): OffsetPagination {
  const currentPage = query?.page ?? DEFAULT_CURRENT_PAGE;
  const limit = query?.limit ?? DEFAULT_PAGE_LIMIT;
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  const hasNextPage = totalPages > 0 && currentPage < totalPages;
  const hasPreviousPage = currentPage > 1 && currentPage <= totalPages;

  return {
    limit,
    currentPage,
    pageRecords,
    totalRecords,
    totalPages,
    nextPage: hasNextPage ? currentPage + 1 : null,
    previousPage: hasPreviousPage ? currentPage - 1 : null,
  };
}

export function sortByString<TItem>(
  items: readonly TItem[],
  getValue: (item: TItem) => string,
  order: 'asc' | 'desc',
) {
  return [...items].sort((first, second) => {
    const comparison = getValue(first).localeCompare(getValue(second));

    return order === 'asc' ? comparison : -comparison;
  });
}

export function matchesSearchValues(values: unknown[], search: string | undefined) {
  const normalizedSearch = search?.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return values
    .flatMap((value) => flattenSearchValues(value))
    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

function flattenSearchValues(value: unknown): unknown[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSearchValues(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      flattenSearchValues(item),
    );
  }

  return [value];
}
