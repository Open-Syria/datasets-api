import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../../config/config.type';
import {
  type DatasetReleaseManifest,
  datasetReleaseManifestSchema,
} from '../contracts/dataset-release-manifest.schema';
import { RELEASE_MANIFEST_FILE } from '../dataset-release-path.utils';
import type {
  DatasetManifestLoader,
  LoadedDatasetReleaseManifest,
} from './dataset-manifest-loader.interface';

function getNodeErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = error.code;

  return typeof code === 'string' ? code : undefined;
}

async function findManifestFiles(directory: string): Promise<string[]> {
  let entries: Dirent[];

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (getNodeErrorCode(error) === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const manifestFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      manifestFiles.push(...(await findManifestFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === RELEASE_MANIFEST_FILE) {
      manifestFiles.push(entryPath);
    }
  }

  return manifestFiles;
}

@Injectable()
export class LocalDatasetManifestLoader implements DatasetManifestLoader {
  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  async listManifests(): Promise<LoadedDatasetReleaseManifest[]> {
    const datasetsConfig = this.configService.getOrThrow('datasets', { infer: true });
    const releasesDirectory = path.resolve(process.cwd(), datasetsConfig.releasesDirectory);
    const manifestFiles = await findManifestFiles(releasesDirectory);
    const manifests: LoadedDatasetReleaseManifest[] = [];

    for (const manifestFile of manifestFiles) {
      const fileContents = await readFile(manifestFile, 'utf8');
      const json: unknown = JSON.parse(fileContents);
      const manifest: DatasetReleaseManifest = datasetReleaseManifestSchema.parse(json);

      manifests.push({
        manifest,
        manifestPath: manifestFile,
        releaseDirectory: path.dirname(manifestFile),
      });
    }

    return manifests;
  }
}
