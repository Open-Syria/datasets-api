import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const datasetReleaseManifestSchemaVersion = '1.0';

export const datasetReleaseStatusSchema = z.enum(['planned', 'seed', 'released', 'deprecated']);
export const datasetArtifactFormatSchema = z.enum(['json', 'ndjson', 'csv', 'geojson', 'sqlite']);
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

export const datasetReleaseArtifactSchema = z.object({
  name: z.string().min(1),
  format: datasetArtifactFormatSchema,
  path: z.string().min(1),
  url: z.string().url().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  recordCount: z.number().int().nonnegative().optional(),
  mediaType: z.string().min(1).optional(),
});

export const datasetSourceAttributionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  license: z.string().min(1),
  accessedAt: z.string().datetime().optional(),
  fields: z.array(z.string().min(1)).optional(),
});

export const datasetReleaseManifestSchema = z.object({
  schemaVersion: z.literal(datasetReleaseManifestSchemaVersion),
  generatedAt: z.string().datetime(),
  dataset: z.object({
    id: z.string().min(1),
    slug: z.string().min(1),
    repository: z.string().min(1),
    category: datasetCategorySchema,
    title: localizedTextSchema,
  }),
  release: z.object({
    version: z.string().min(1),
    status: datasetReleaseStatusSchema,
    publishedAt: z.string().datetime().nullable(),
    notes: z.string().nullable().optional(),
  }),
  artifacts: z.array(datasetReleaseArtifactSchema),
  sources: z.array(datasetSourceAttributionSchema),
});

export class DatasetReleaseManifestDto extends createZodDto(datasetReleaseManifestSchema) {}

export type DatasetReleaseStatus = z.infer<typeof datasetReleaseStatusSchema>;
export type DatasetArtifactFormat = z.infer<typeof datasetArtifactFormatSchema>;
export type DatasetReleaseArtifact = z.infer<typeof datasetReleaseArtifactSchema>;
export type DatasetReleaseManifest = z.infer<typeof datasetReleaseManifestSchema>;
