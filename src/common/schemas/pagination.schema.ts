import { z } from 'zod';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT_OPTION,
  DEFAULT_SORT_ORDER,
  PAGE_LIMIT_OPTIONS,
  PAGE_LIMIT_VALUES,
  SORT_ORDERS,
} from '../../constants/app.constants';

export const offsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_CURRENT_PAGE),
  limit: z
    .enum(PAGE_LIMIT_OPTIONS)
    .default(DEFAULT_PAGE_LIMIT_OPTION)
    .transform((limit) => PAGE_LIMIT_VALUES[limit]),
  q: z.string().trim().min(1).optional(),
  order: z.enum(SORT_ORDERS).default(DEFAULT_SORT_ORDER),
});

export const offsetPaginationSchema = z.object({
  limit: z.number().int().positive(),
  currentPage: z.number().int().positive(),
  totalRecords: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  nextPage: z.number().int().positive().nullable(),
  previousPage: z.number().int().positive().nullable(),
});

export type OffsetPaginationQuery = z.infer<typeof offsetPaginationQuerySchema>;
export type OffsetPagination = z.infer<typeof offsetPaginationSchema>;
