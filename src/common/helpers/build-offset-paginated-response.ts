import type { I18nContext } from 'nestjs-i18n';
import { DEFAULT_CURRENT_PAGE, DEFAULT_PAGE_LIMIT } from '../../constants/app.constants';
import type { ApiOffsetPaginatedResponse } from '../dto/offset-pagination/offset-paginated-response.dto';
import type { OffsetPaginationQuery } from '../schemas/pagination.schema';
import { buildResponse } from './build-response';

type BuildOffsetPaginatedResponseOptions<TItem> = {
  items: TItem[];
  totalRecords: number;
  options?: Partial<Pick<OffsetPaginationQuery, 'page' | 'limit'>>;
  message: string;
  fallbackMessage: string;
  i18n?: I18nContext;
  status?: number;
};

export function buildOffsetPaginatedResponse<TItem>({
  items,
  totalRecords,
  options,
  message,
  fallbackMessage,
  i18n,
  status,
}: BuildOffsetPaginatedResponseOptions<TItem>): ApiOffsetPaginatedResponse<TItem> {
  const currentPage = options?.page ?? DEFAULT_CURRENT_PAGE;
  const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
  const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit);
  const hasNextPage = totalPages > 0 && currentPage < totalPages;
  const hasPreviousPage = currentPage > 1 && currentPage <= totalPages;

  return buildResponse({
    status,
    i18n,
    message,
    fallbackMessage,
    data: {
      items,
      pagination: {
        limit,
        currentPage,
        totalRecords,
        totalPages,
        nextPage: hasNextPage ? currentPage + 1 : null,
        previousPage: hasPreviousPage ? currentPage - 1 : null,
      },
    },
  });
}
