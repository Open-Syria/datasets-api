import type { I18nContext } from 'nestjs-i18n';
import type {
  ApiOffsetPaginatedData,
  ApiOffsetPaginatedResponse,
} from '../dto/offset-pagination/offset-paginated-response.dto';
import type { OffsetPaginationQuery } from '../schemas/pagination.schema';
import { buildResponse } from './build-response';
import { buildOffsetPagination } from './list-query.helpers';

type BuildOffsetPaginatedResponseOptions<TItem, TExtra extends object = Record<string, never>> = {
  items: TItem[];
  totalRecords: number;
  options?: Partial<Pick<OffsetPaginationQuery, 'page' | 'limit'>>;
  extraData?: TExtra;
  message: string;
  fallbackMessage: string;
  i18n?: I18nContext;
  status?: number;
};

export function buildOffsetPaginatedResponse<TItem, TExtra extends object = Record<string, never>>({
  items,
  totalRecords,
  options,
  extraData,
  message,
  fallbackMessage,
  i18n,
  status,
}: BuildOffsetPaginatedResponseOptions<TItem, TExtra>): ApiOffsetPaginatedResponse<TItem, TExtra> {
  const pagination = buildOffsetPagination(totalRecords, options, items.length);
  const data = {
    ...(extraData ?? ({} as TExtra)),
    items,
    pagination,
  } satisfies ApiOffsetPaginatedData<TItem, TExtra>;

  return buildResponse({
    status,
    i18n,
    message,
    fallbackMessage,
    data,
  });
}
