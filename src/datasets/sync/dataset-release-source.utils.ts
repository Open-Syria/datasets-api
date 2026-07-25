import { z } from 'zod';
import {
  datasetPublicApiStatusSchema,
  datasetReadinessLevelSchema,
} from '../contracts/dataset-release-manifest.schema';

export const datasetReleaseReadinessRequirementSchema = z
  .object({
    minimumLevel: datasetReadinessLevelSchema.optional(),
    publicApi: datasetPublicApiStatusSchema.optional(),
  })
  .strict();

export const datasetReleaseSourceSchema = z
  .object({
    owner: z.string().min(1),
    repository: z.string().min(1),
    tag: z.string().regex(/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/),
    requiredReadiness: datasetReleaseReadinessRequirementSchema.optional(),
  })
  .strict();

export const datasetReleaseSourcesConfigSchema = z
  .object({
    sources: z.array(datasetReleaseSourceSchema),
  })
  .strict()
  .superRefine(({ sources }, context) => {
    const configuredSources = new Set<string>();

    for (const [index, source] of sources.entries()) {
      const key = formatDatasetReleaseSource(source);

      if (configuredSources.has(key)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate dataset release source: ${key}`,
          path: ['sources', index],
        });
      }

      configuredSources.add(key);
    }
  });

export type DatasetReleaseSource = z.infer<typeof datasetReleaseSourceSchema>;

export function parseDatasetReleaseSource(value: string): DatasetReleaseSource {
  const [repositoryPart, tag] = value.trim().split('@');
  const [owner, repository] = repositoryPart?.split('/') ?? [];

  return datasetReleaseSourceSchema.parse({
    owner,
    repository,
    tag,
  });
}

export function parseDatasetReleaseSources(value?: string): DatasetReleaseSource[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean)
    .map(parseDatasetReleaseSource);
}

export function parseDatasetReleaseSourcesConfig(value: unknown): DatasetReleaseSource[] {
  return datasetReleaseSourcesConfigSchema.parse(value).sources;
}

export function formatDatasetReleaseSource(source: DatasetReleaseSource) {
  return `${source.owner}/${source.repository}@${source.tag}`;
}
