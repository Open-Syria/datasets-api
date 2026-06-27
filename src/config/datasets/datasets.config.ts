import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import { parseDatasetReleaseSources } from '../../datasets/sync/dataset-release-source.utils';
import type { DatasetsConfig } from './datasets-config.type';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  DATASETS_RELEASES_DIR: z.string().min(1).optional().default('data/releases'),
  DATASETS_REQUIRE_RELEASES: booleanEnvSchema.optional().default(false),
  DATASETS_RELEASE_SOURCES: z.string().optional(),
  DATASETS_SYNC_DOWNLOAD_ARTIFACTS: booleanEnvSchema.optional().default(true),
  GITHUB_TOKEN: z.string().min(1).optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid datasets environment variables: ${JSON.stringify(z.treeifyError(result.error))}`,
    );
  }

  return result.data;
}

export function getConfig(): DatasetsConfig {
  const env = parseEnv();

  return {
    releasesDirectory: env.DATASETS_RELEASES_DIR,
    requireReleases: env.DATASETS_REQUIRE_RELEASES,
    releaseSources: parseDatasetReleaseSources(env.DATASETS_RELEASE_SOURCES),
    syncDownloadArtifacts: env.DATASETS_SYNC_DOWNLOAD_ARTIFACTS,
    githubToken: env.GITHUB_TOKEN,
  };
}

export default registerAs<DatasetsConfig>('datasets', getConfig);
