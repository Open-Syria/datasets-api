import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sourceAttributionSchema } from '../../../common/dto/source-attribution.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../../common/schemas/pagination.schema';

export const subdistrictGeographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const subdistrictSummarySchema = z.object({
  id: z.string().min(1),
  governorateId: z.string().min(1),
  districtId: z.string().min(1),
  name: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  }),
  centroid: subdistrictGeographicPointSchema.nullable(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']),
});

export const subdistrictsArtifactSchema = z
  .union([
    z.array(subdistrictSummarySchema),
    z.object({
      items: z.array(subdistrictSummarySchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.items));

export const subdistrictListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']).optional(),
});

export const subdistrictDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const subdistrictReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const subdistrictListSchema = z.object({
  items: z.array(subdistrictSummarySchema),
  count: z.number().int().nonnegative(),
  pagination: offsetPaginationSchema,
  dataset: subdistrictDatasetContextSchema,
  release: subdistrictReleaseContextSchema,
});

export const subdistrictDetailSchema = z.object({
  item: subdistrictSummarySchema,
  dataset: subdistrictDatasetContextSchema,
  release: subdistrictReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class SubdistrictSummaryDto extends createZodDto(subdistrictSummarySchema) {}
export class SubdistrictListQueryDto extends createZodDto(subdistrictListQuerySchema) {}
export class SubdistrictListDto extends createZodDto(subdistrictListSchema) {}
export class SubdistrictDetailDto extends createZodDto(subdistrictDetailSchema) {}

export type SubdistrictSummary = z.infer<typeof subdistrictSummarySchema>;
export type SubdistrictListQuery = z.infer<typeof subdistrictListQuerySchema>;
export type SubdistrictList = z.infer<typeof subdistrictListSchema>;
export type SubdistrictDetail = z.infer<typeof subdistrictDetailSchema>;
