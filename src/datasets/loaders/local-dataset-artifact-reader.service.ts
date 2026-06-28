import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type { z } from 'zod';
import type {
  DatasetReleaseArtifact,
  DatasetReleaseManifest,
} from '../contracts/dataset-release-manifest.schema';
import { safeResolveDatasetReleasePath } from '../dataset-release-path.utils';
import { DatasetReleaseRegistryService } from '../dataset-release-registry.service';

type ReadJsonArtifactOptions<TData> = {
  datasetId: string;
  artifactName: string;
  schema: z.ZodType<TData>;
};

type ReadJsonArtifactResult<TData> = {
  manifest: DatasetReleaseManifest;
  artifact: DatasetReleaseArtifact;
  data: TData;
};

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

@Injectable()
export class LocalDatasetArtifactReaderService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async readJsonArtifact<TData>({
    datasetId,
    artifactName,
    schema,
  }: ReadJsonArtifactOptions<TData>): Promise<ReadJsonArtifactResult<TData> | null> {
    const registration =
      this.datasetReleaseRegistryService.getManifestRegistrationByDatasetId(datasetId);
    const manifest = registration?.manifest;

    if (!manifest) {
      return null;
    }

    const artifact = manifest.artifacts.find((item) => item.name === artifactName);

    if (!artifact) {
      throw new InternalServerErrorException(
        `Dataset release ${manifest.dataset.slug}@${manifest.release.version} does not include ${artifactName}.`,
      );
    }

    if (artifact.format !== 'json') {
      throw new InternalServerErrorException(
        `Dataset artifact ${artifactName} must be published as JSON.`,
      );
    }

    const cacheKey = this.buildArtifactCacheKey(manifest, artifact);
    const cachedData = await this.cacheManager.get<TData>(cacheKey);

    if (cachedData) {
      return {
        manifest,
        artifact,
        data: cachedData,
      };
    }

    const artifactPath = safeResolveDatasetReleasePath(
      registration.releaseDirectory,
      artifact.path,
    );
    const artifactBuffer = await readFile(artifactPath);

    this.verifyArtifact(artifact, artifactBuffer);

    const parsedJson: unknown = JSON.parse(artifactBuffer.toString('utf8'));

    const data = schema.parse(parsedJson);

    await this.cacheManager.set(cacheKey, data);

    return {
      manifest,
      artifact,
      data,
    };
  }

  private verifyArtifact(artifact: DatasetReleaseArtifact, artifactBuffer: Buffer) {
    const checksum = sha256(artifactBuffer);

    if (checksum !== artifact.sha256) {
      throw new InternalServerErrorException(
        `Dataset artifact ${artifact.name} failed checksum verification.`,
      );
    }

    if (artifact.sizeBytes !== artifactBuffer.byteLength) {
      throw new InternalServerErrorException(
        `Dataset artifact ${artifact.name} failed size verification.`,
      );
    }
  }

  private buildArtifactCacheKey(
    manifest: DatasetReleaseManifest,
    artifact: DatasetReleaseArtifact,
  ) {
    return [
      'datasets',
      'artifacts',
      manifest.dataset.id,
      manifest.release.version,
      artifact.name,
      artifact.sha256,
    ].join(':');
  }
}
