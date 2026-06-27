import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { sourceAttributionSchema } from '../../../common/dto/source-attribution.dto';

export const geographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const governorateSummarySchema = z.object({
  id: z.string().min(1),
  name: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  }),
  iso31662: z.string().nullable(),
  centroid: geographicPointSchema.nullable(),
  sourceStatus: z.enum(['pending_release', 'seed', 'released', 'deprecated']),
});

export const governoratesArtifactSchema = z
  .union([
    z.array(governorateSummarySchema),
    z.object({
      items: z.array(governorateSummarySchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.items));

export const governorateDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const governorateReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const governorateListSchema = z.object({
  items: z.array(governorateSummarySchema),
  count: z.number().int().nonnegative(),
  dataset: governorateDatasetContextSchema,
  release: governorateReleaseContextSchema,
});

export const governorateDetailSchema = z.object({
  item: governorateSummarySchema,
  dataset: governorateDatasetContextSchema,
  release: governorateReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class GovernorateSummaryDto extends createZodDto(governorateSummarySchema) {}
export class GovernorateListDto extends createZodDto(governorateListSchema) {}
export class GovernorateDetailDto extends createZodDto(governorateDetailSchema) {}

export type GovernorateSummary = z.infer<typeof governorateSummarySchema>;
export type GovernorateList = z.infer<typeof governorateListSchema>;
export type GovernorateDetail = z.infer<typeof governorateDetailSchema>;
