import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import {
  type DatasetReleaseSource,
  parseDatasetReleaseSources,
  parseDatasetReleaseSourcesConfig,
} from '../../datasets/sync/dataset-release-source.utils';
import type { DatasetsConfig } from './datasets-config.type';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  DATASETS_RELEASES_DIR: z.string().min(1).optional().default('data/releases'),
  DATASETS_REQUIRE_RELEASES: booleanEnvSchema.optional().default(false),
  DATASETS_RELEASE_SOURCES_FILE: z.string().min(1).optional().default('dataset-releases.json'),
  DATASETS_RELEASE_SOURCES: z.string().optional(),
  DATASETS_RELEASE_SOURCES_OVERRIDE: booleanEnvSchema.optional().default(false),
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

function readReleaseSourcesFile(filePath: string): DatasetReleaseSource[] {
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!existsSync(resolvedPath)) {
    return [];
  }

  return parseDatasetReleaseSourcesConfig(JSON.parse(readFileSync(resolvedPath, 'utf8')));
}

export function getConfig(): DatasetsConfig {
  const env = parseEnv();
  const fileReleaseSources = readReleaseSourcesFile(env.DATASETS_RELEASE_SOURCES_FILE);
  const envReleaseSources = parseDatasetReleaseSources(env.DATASETS_RELEASE_SOURCES);

  return {
    releasesDirectory: env.DATASETS_RELEASES_DIR,
    requireReleases: env.DATASETS_REQUIRE_RELEASES,
    releaseSources: env.DATASETS_RELEASE_SOURCES_OVERRIDE
      ? envReleaseSources
      : fileReleaseSources.length > 0
        ? fileReleaseSources
        : envReleaseSources,
    syncDownloadArtifacts: env.DATASETS_SYNC_DOWNLOAD_ARTIFACTS,
    githubToken: env.GITHUB_TOKEN,
  };
}

export default registerAs<DatasetsConfig>('datasets', getConfig);
