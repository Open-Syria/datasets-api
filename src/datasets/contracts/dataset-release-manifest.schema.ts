import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const datasetReleaseManifestSchemaVersion = '1.0';

export const datasetReleaseStatusSchema = z.enum(['planned', 'seed', 'released', 'deprecated']);
export const datasetReadinessLevelSchema = z.enum([
  'raw_seed',
  'identity_seed_ready',
  'public_directory_ready',
  'profile_ready',
  'api_ready',
]);
export const datasetPublicApiStatusSchema = z.enum(['not_approved', 'approved']);
export const datasetArtifactFormatSchema = z.enum([
  'json',
  'ndjson',
  'csv',
  'geojson',
  'sqlite',
  'sql',
  'yaml',
  'xml',
]);
export const datasetCategorySchema = z.enum([
  'geography',
  'education',
  'transport',
  'heritage',
  'telecom',
]);

const releaseVersionSchema = z
  .string()
  .regex(/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);

export const localizedTextSchema = z
  .object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  })
  .strict();

export const datasetReleaseArtifactSchema = z
  .object({
    name: z.string().min(1),
    format: datasetArtifactFormatSchema,
    path: z.string().min(1),
    url: z.string().url().optional(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    sizeBytes: z.number().int().nonnegative(),
    recordCount: z.number().int().nonnegative().optional(),
    mediaType: z.string().min(1).optional(),
  })
  .strict();

export const datasetSourceAttributionSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url().optional(),
    license: z.string().min(1),
    accessedAt: z.string().datetime({ offset: true }).optional(),
    fields: z.array(z.string().min(1)).optional(),
  })
  .strict();

export const datasetReleaseReadinessCheckSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(['passed', 'warning', 'blocked']),
    expected: z.union([z.string(), z.number(), z.boolean()]).optional(),
    actual: z.union([z.string(), z.number(), z.boolean()]).optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

export const datasetReleaseReadinessDomainSchema = z
  .object({
    name: z.string().min(1),
    status: z.enum(['ready', 'partial', 'empty', 'blocked']),
    recordCount: z.number().int().nonnegative(),
    notes: z.string().min(1),
  })
  .strict();

export const datasetReleaseReadinessSchema = z
  .object({
    level: datasetReadinessLevelSchema,
    publicApi: z
      .object({
        status: datasetPublicApiStatusSchema,
        minimumLevel: datasetReadinessLevelSchema,
        reason: z.string().min(1),
      })
      .strict(),
    checks: z.array(datasetReleaseReadinessCheckSchema),
    domains: z.array(datasetReleaseReadinessDomainSchema),
    blockers: z.array(z.string().min(1)),
  })
  .strict();

export const datasetReleaseManifestSchema = z
  .object({
    schemaVersion: z.literal(datasetReleaseManifestSchemaVersion),
    generatedAt: z.string().datetime({ offset: true }),
    dataset: z
      .object({
        id: z.string().min(1),
        slug: z.string().min(1),
        repository: z.string().min(1),
        category: datasetCategorySchema,
        title: localizedTextSchema,
      })
      .strict(),
    release: z
      .object({
        version: releaseVersionSchema,
        status: datasetReleaseStatusSchema,
        publishedAt: z.string().datetime({ offset: true }).nullable(),
        notes: z.string().nullable().optional(),
      })
      .strict(),
    artifacts: z.array(datasetReleaseArtifactSchema),
    sources: z.array(datasetSourceAttributionSchema),
    readiness: datasetReleaseReadinessSchema.optional(),
  })
  .strict()
  .superRefine((manifest, context) => {
    if (manifest.release.status === 'released' && manifest.release.publishedAt === null) {
      context.addIssue({
        code: 'custom',
        message: 'Released manifests must declare release.publishedAt',
        path: ['release', 'publishedAt'],
      });
    }

    const artifactKeys = new Set<string>();
    const artifactPaths = new Set<string>();

    for (const [index, artifact] of manifest.artifacts.entries()) {
      const key = `${artifact.name}:${artifact.format}`;

      if (artifactKeys.has(key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate artifact name and format: ${key}`,
          path: ['artifacts', index],
        });
      }

      if (artifactPaths.has(artifact.path)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate artifact path: ${artifact.path}`,
          path: ['artifacts', index, 'path'],
        });
      }

      artifactKeys.add(key);
      artifactPaths.add(artifact.path);
    }
  });

export class DatasetReleaseManifestDto extends createZodDto(datasetReleaseManifestSchema) {}

export type DatasetReleaseStatus = z.infer<typeof datasetReleaseStatusSchema>;
export type DatasetArtifactFormat = z.infer<typeof datasetArtifactFormatSchema>;
export type DatasetReleaseArtifact = z.infer<typeof datasetReleaseArtifactSchema>;
export type DatasetReadinessLevel = z.infer<typeof datasetReadinessLevelSchema>;
export type DatasetPublicApiStatus = z.infer<typeof datasetPublicApiStatusSchema>;
export type DatasetReleaseManifest = z.infer<typeof datasetReleaseManifestSchema>;
