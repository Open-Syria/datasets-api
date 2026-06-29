import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { buildOffsetPaginationQueryParameters } from '../../common/dto/offset-pagination/offset-page-options.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../common/schemas/pagination.schema';
import type { ApiQueryParameter } from '../../decorators/api-request-dto';

export const datasetStatusSchema = z.enum(['planned', 'seed', 'released', 'deprecated']);
export const datasetCategorySchema = z.enum([
  'geography',
  'education',
  'transport',
  'heritage',
  'telecom',
]);

export const localizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const datasetSummarySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: localizedTextSchema,
  description: localizedTextSchema,
  category: datasetCategorySchema,
  repository: z.string().min(1),
  status: datasetStatusSchema,
  apiEndpoints: z.array(z.string().min(1)),
  version: z.string().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const datasetSummaryListSchema = z.object({
  items: z.array(datasetSummarySchema),
  pagination: offsetPaginationSchema,
});

export const datasetSummaryListQuerySchema = offsetPaginationQuerySchema;

export class DatasetSummaryDto extends createZodDto(datasetSummarySchema) {}
export class DatasetSummaryListQueryDto extends createZodDto(datasetSummaryListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] =
    buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against dataset ID, slug, names, descriptions, category, repository, status, API endpoints, version, and updated timestamp.',
      searchExample: 'geography',
      orderDescription: 'Sort order by English dataset name. asc=ascending, desc=descending.',
    });
}
export class DatasetSummaryListDto extends createZodDto(datasetSummaryListSchema) {}

export type DatasetSummary = z.infer<typeof datasetSummarySchema>;
export type DatasetSummaryList = z.infer<typeof datasetSummaryListSchema>;
export type DatasetSummaryListQuery = z.infer<typeof datasetSummaryListQuerySchema>;
