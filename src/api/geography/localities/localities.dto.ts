import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sourceAttributionSchema } from '../../../common/dto/source-attribution.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../../common/schemas/pagination.schema';

export const localityKindSchema = z.enum(['city', 'town', 'locality']);

export const localityGeographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const localityAliasSchema = z.object({
  value: z.string().min(1),
  language: z.string().min(1),
  type: z.enum(['alias', 'alternate_spelling', 'formal']),
});

export const localityExternalIdsSchema = z
  .object({
    geonames: z.string().min(1).optional(),
    ochaPcode: z.string().min(1).optional(),
  })
  .catchall(z.string().min(1));

export const localitySummarySchema = z.object({
  id: z.string().min(1),
  governorateId: z.string().min(1),
  districtId: z.string().min(1),
  subdistrictId: z.string().min(1),
  kind: localityKindSchema,
  name: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  }),
  centroid: localityGeographicPointSchema.nullable(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']),
});

export const localityRecordSchema = localitySummarySchema.extend({
  aliases: z.array(localityAliasSchema),
  externalIds: localityExternalIdsSchema,
  sourceIds: z.array(z.string().min(1)),
});

export const localitiesArtifactSchema = z
  .union([
    z.array(localityRecordSchema),
    z.object({
      items: z.array(localityRecordSchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.items));

export const localityListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  subdistrictId: z.string().trim().min(1).optional(),
  kind: localityKindSchema.optional(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']).optional(),
});

export const localityDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const localityReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const localityListSchema = z.object({
  items: z.array(localitySummarySchema),
  count: z.number().int().nonnegative(),
  pagination: offsetPaginationSchema,
  dataset: localityDatasetContextSchema,
  release: localityReleaseContextSchema,
});

export const localityDetailSchema = z.object({
  item: localityRecordSchema,
  dataset: localityDatasetContextSchema,
  release: localityReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class LocalitySummaryDto extends createZodDto(localitySummarySchema) {}
export class LocalityRecordDto extends createZodDto(localityRecordSchema) {}
export class LocalityListQueryDto extends createZodDto(localityListQuerySchema) {}
export class LocalityListDto extends createZodDto(localityListSchema) {}
export class LocalityDetailDto extends createZodDto(localityDetailSchema) {}

export type LocalitySummary = z.infer<typeof localitySummarySchema>;
export type LocalityRecord = z.infer<typeof localityRecordSchema>;
export type LocalityListQuery = z.infer<typeof localityListQuerySchema>;
export type LocalityList = z.infer<typeof localityListSchema>;
export type LocalityDetail = z.infer<typeof localityDetailSchema>;
