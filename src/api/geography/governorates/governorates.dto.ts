import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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

export const governorateListSchema = z.object({
  items: z.array(governorateSummarySchema),
  count: z.number().int().nonnegative(),
  dataset: z.object({
    id: z.literal('opensyria-geography'),
    repository: z.literal('data-geography'),
    status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
  }),
  release: z
    .object({
      version: z.string(),
      releasedAt: z.string().datetime(),
    })
    .nullable(),
});

export class GovernorateSummaryDto extends createZodDto(governorateSummarySchema) {}
export class GovernorateListDto extends createZodDto(governorateListSchema) {}

export type GovernorateSummary = z.infer<typeof governorateSummarySchema>;
export type GovernorateList = z.infer<typeof governorateListSchema>;
