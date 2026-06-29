import { z } from 'zod';

export const datasetReleaseSourceSchema = z.object({
  owner: z.string().min(1),
  repository: z.string().min(1),
  tag: z.string().min(1),
});

export const datasetReleaseSourcesConfigSchema = z.object({
  sources: z.array(datasetReleaseSourceSchema),
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
