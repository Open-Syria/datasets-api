import { z } from 'zod';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT_OPTION,
  DEFAULT_SORT_ORDER_OPTION,
  PAGE_LIMIT_OPTIONS,
  PAGE_LIMIT_VALUES,
  SORT_ORDER_OPTIONS,
  SORT_ORDER_VALUES,
} from '../../constants/app.constants';

export const offsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_CURRENT_PAGE),
  limit: z
    .enum(PAGE_LIMIT_OPTIONS)
    .default(DEFAULT_PAGE_LIMIT_OPTION)
    .transform((limit) => PAGE_LIMIT_VALUES[limit]),
  q: z.string().trim().min(1).optional(),
  order: z
    .enum(SORT_ORDER_OPTIONS)
    .default(DEFAULT_SORT_ORDER_OPTION)
    .transform((order) => SORT_ORDER_VALUES[order]),
});

export const offsetPaginationSchema = z.object({
  limit: z.number().int().positive(),
  currentPage: z.number().int().positive(),
  pageRecords: z.number().int().nonnegative(),
  totalRecords: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable(),
  previousPage: z.number().int().positive().nullable(),
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationQuerySchema>;
export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;
