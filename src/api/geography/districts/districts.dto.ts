import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sourceAttributionSchema } from '../../../common/dto/source-attribution.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../../common/schemas/pagination.schema';

export const districtGeographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const districtSummarySchema = z.object({
  id: z.string().min(1),
  governorateId: z.string().min(1),
  name: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  }),
  centroid: districtGeographicPointSchema.nullable(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']),
});

export const districtsArtifactSchema = z
  .union([
    z.array(districtSummarySchema),
    z.object({
      items: z.array(districtSummarySchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.items));

export const districtListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']).optional(),
});

export const districtDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const districtReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const districtListSchema = z.object({
  items: z.array(districtSummarySchema),
  count: z.number().int().nonnegative(),
  pagination: offsetPaginationSchema,
  dataset: districtDatasetContextSchema,
  release: districtReleaseContextSchema,
});

export const districtDetailSchema = z.object({
  item: districtSummarySchema,
  dataset: districtDatasetContextSchema,
  release: districtReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class DistrictSummaryDto extends createZodDto(districtSummarySchema) {}
export class DistrictListQueryDto extends createZodDto(districtListQuerySchema) {}
export class DistrictListDto extends createZodDto(districtListSchema) {}
export class DistrictDetailDto extends createZodDto(districtDetailSchema) {}

export type DistrictSummary = z.infer<typeof districtSummarySchema>;
export type DistrictListQuery = z.infer<typeof districtListQuerySchema>;
export type DistrictList = z.infer<typeof districtListSchema>;
export type DistrictDetail = z.infer<typeof districtDetailSchema>;
