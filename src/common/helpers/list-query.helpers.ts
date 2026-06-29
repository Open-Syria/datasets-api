import type { OffsetPaginationQuery } from '../schemas/pagination.schema';

type OffsetListQuery = Pick<OffsetPaginationQuery, 'page' | 'limit'>;

export function paginateOffsetItems<TItem>(items: readonly TItem[], query: OffsetListQuery) {
  const start = (query.page - 1) * query.limit;

  return items.slice(start, start + query.limit);
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
