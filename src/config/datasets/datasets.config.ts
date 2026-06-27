import { registerAs } from '@nestjs/config';
import { z } from 'zod';
import type { DatasetsConfig } from './datasets-config.type';

const booleanEnvSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  DATASETS_RELEASES_DIR: z.string().min(1).optional().default('data/releases'),
  DATASETS_REQUIRE_RELEASES: booleanEnvSchema.optional().default(false),
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
  };
}

export default registerAs<DatasetsConfig>('datasets', getConfig);
