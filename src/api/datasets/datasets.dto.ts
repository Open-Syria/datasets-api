import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

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
  plannedEndpoints: z.array(z.string().min(1)),
  version: z.string().nullable(),
  updatedAt: z.string().datetime().nullable(),
});

export const datasetSummaryListSchema = z.object({
  items: z.array(datasetSummarySchema),
  count: z.number().int().nonnegative(),
});

export class DatasetSummaryDto extends createZodDto(datasetSummarySchema) {}
export class DatasetSummaryListDto extends createZodDto(datasetSummaryListSchema) {}

export type DatasetSummary = z.infer<typeof datasetSummarySchema>;
export type DatasetSummaryList = z.infer<typeof datasetSummaryListSchema>;
