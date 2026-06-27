import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const releaseStatusSchema = z.enum(['planned', 'seed', 'released', 'deprecated']);
export const releaseArtifactFormatSchema = z.enum(['json', 'ndjson', 'csv', 'geojson', 'sqlite']);

export const releaseDatasetSchema = z.object({
  datasetId: z.string().min(1),
  repository: z.string().min(1),
  status: releaseStatusSchema,
  releaseVersion: z.string().nullable(),
  manifestPath: z.string().nullable(),
});

export const releaseArtifactSchema = z.object({
  format: releaseArtifactFormatSchema,
  url: z.string().url().nullable(),
  sha256: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
});

export const releaseSummarySchema = z.object({
  id: z.string().min(1),
  version: z.string().nullable(),
  status: releaseStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  datasets: z.array(releaseDatasetSchema),
  artifacts: z.array(releaseArtifactSchema),
  notes: z.string().nullable(),
});

export const releaseSummaryListSchema = z.object({
  items: z.array(releaseSummarySchema),
  count: z.number().int().nonnegative(),
});

export class ReleaseSummaryDto extends createZodDto(releaseSummarySchema) {}
export class ReleaseSummaryListDto extends createZodDto(releaseSummaryListSchema) {}

export type ReleaseSummaryList = z.infer<typeof releaseSummaryListSchema>;
