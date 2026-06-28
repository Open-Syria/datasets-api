import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config/config.type';
import type { DatasetReleaseManifest } from './contracts/dataset-release-manifest.schema';
import type { LoadedDatasetReleaseManifest } from './loaders/dataset-manifest-loader.interface';
import { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';

export type DatasetReleaseRegistryHealth = {
  status: 'loaded' | 'missing' | 'not_required';
  required: boolean;
  count: number;
};

type SemverParts = {
  major: number;
  minor: number;
  patch: number;
};

function parseSemverTag(version: string): SemverParts | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version);

  if (!match) {
    return undefined;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemver(first: SemverParts, second: SemverParts) {
  return first.major - second.major || first.minor - second.minor || first.patch - second.patch;
}

function getManifestTimestamp(manifest: DatasetReleaseManifest) {
  return Date.parse(manifest.release.publishedAt ?? manifest.generatedAt);
}

function compareManifests(first: DatasetReleaseManifest, second: DatasetReleaseManifest) {
  const firstSemver = parseSemverTag(first.release.version);
  const secondSemver = parseSemverTag(second.release.version);

  if (firstSemver && secondSemver) {
    const semverComparison = compareSemver(firstSemver, secondSemver);

    if (semverComparison !== 0) {
      return semverComparison;
    }
  }

  return getManifestTimestamp(first) - getManifestTimestamp(second);
}

function selectLatestManifestRegistrations(registrations: LoadedDatasetReleaseManifest[]) {
  const latestByDataset = new Map<string, LoadedDatasetReleaseManifest>();

  for (const registration of registrations) {
    const datasetId = registration.manifest.dataset.id;
    const current = latestByDataset.get(datasetId);

    if (!current || compareManifests(current.manifest, registration.manifest) < 0) {
      latestByDataset.set(datasetId, registration);
    }
  }

  return [...latestByDataset.values()];
}

@Injectable()
export class DatasetReleaseRegistryService implements OnModuleInit {
  private manifests: LoadedDatasetReleaseManifest[] = [];

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
    @Inject(LocalDatasetManifestLoader)
    private readonly localDatasetManifestLoader: LocalDatasetManifestLoader,
  ) {}

  async onModuleInit() {
    this.manifests = selectLatestManifestRegistrations(
      await this.localDatasetManifestLoader.listManifests(),
    );

    const datasetsConfig = this.configService.getOrThrow('datasets', { infer: true });

    if (datasetsConfig.requireReleases && this.manifests.length === 0) {
      throw new Error(`No dataset release manifests found in ${datasetsConfig.releasesDirectory}`);
    }
  }

  listManifests(): DatasetReleaseManifest[] {
    return this.manifests.map((registration) => registration.manifest);
  }

  getManifestByDatasetId(datasetId: string): DatasetReleaseManifest | undefined {
    return this.getManifestRegistrationByDatasetId(datasetId)?.manifest;
  }

  getManifestRegistrationByDatasetId(datasetId: string): LoadedDatasetReleaseManifest | undefined {
    return this.manifests.find((registration) => registration.manifest.dataset.id === datasetId);
  }

  getHealth(): DatasetReleaseRegistryHealth {
    const datasetsConfig = this.configService.getOrThrow('datasets', { infer: true });

    if (this.manifests.length > 0) {
      return {
        status: 'loaded',
        required: datasetsConfig.requireReleases,
        count: this.manifests.length,
      };
    }

    return {
      status: datasetsConfig.requireReleases ? 'missing' : 'not_required',
      required: datasetsConfig.requireReleases,
      count: 0,
    };
  }
}
