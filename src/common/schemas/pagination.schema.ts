import { z } from 'zod';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_ORDER,
  MAX_PAGE_LIMIT,
  SORT_ORDERS,
} from '../../constants/app.constants';

export const offsetPaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(DEFAULT_CURRENT_PAGE),
  limit: z.coerce.number().int().positive().max(MAX_PAGE_LIMIT).default(DEFAULT_PAGE_LIMIT),
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
