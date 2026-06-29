import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  datasetArtifactFormatSchema,
  datasetCategorySchema,
  datasetReleaseStatusSchema,
  localizedTextSchema,
} from '../../datasets/contracts/dataset-release-manifest.schema';

export const releaseStatusSchema = datasetReleaseStatusSchema;
export const releaseArtifactFormatSchema = datasetArtifactFormatSchema;

export const releaseDatasetSchema = z.object({
  datasetId: z.string().min(1),
  slug: z.string().min(1),
  repository: z.string().min(1),
  category: datasetCategorySchema,
  title: localizedTextSchema,
  status: releaseStatusSchema,
  releaseVersion: z.string().nullable(),
  manifestPath: z.string().nullable(),
});

export const releaseArtifactSchema = z.object({
  name: z.string().min(1),
  format: releaseArtifactFormatSchema,
  path: z.string().min(1),
  url: z.string().url().nullable(),
  sha256: z.string().nullable(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  recordCount: z.number().int().nonnegative().nullable(),
  mediaType: z.string().min(1).nullable(),
});

export const releaseSummarySchema = z.object({
  id: z.string().min(1),
  version: z.string().nullable(),
  status: releaseStatusSchema,
  generatedAt: z.string().datetime().nullable(),
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
