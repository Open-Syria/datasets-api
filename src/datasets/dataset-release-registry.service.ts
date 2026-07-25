import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config/config.type';
import type { DatasetReleaseManifest } from './contracts/dataset-release-manifest.schema';
import type { LoadedDatasetReleaseManifest } from './loaders/dataset-manifest-loader.interface';
import { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';
import {
  type DatasetReleaseSource,
  formatDatasetReleaseSource,
} from './sync/dataset-release-source.utils';

export type DatasetReleaseRegistryHealth = {
  status: 'loaded' | 'incomplete' | 'missing' | 'not_required';
  required: boolean;
  count: number;
  expectedCount: number;
  missing: string[];
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

function selectPinnedManifestRegistrations(
  registrations: LoadedDatasetReleaseManifest[],
  sources: DatasetReleaseSource[],
) {
  const selected: LoadedDatasetReleaseManifest[] = [];
  const missing: string[] = [];
  const datasetIds = new Set<string>();

  for (const source of sources) {
    const matches = registrations.filter(
      ({ manifest }) =>
        manifest.dataset.repository === source.repository &&
        manifest.release.version === source.tag,
    );
    const sourceLabel = formatDatasetReleaseSource(source);

    if (matches.length === 0) {
      missing.push(sourceLabel);
      continue;
    }

    if (matches.length > 1) {
      throw new Error(`Multiple local manifests found for configured release ${sourceLabel}`);
    }

    const [registration] = matches;

    if (!registration) {
      continue;
    }

    if (datasetIds.has(registration.manifest.dataset.id)) {
      throw new Error(
        `Multiple configured releases resolve to dataset ${registration.manifest.dataset.id}`,
      );
    }

    datasetIds.add(registration.manifest.dataset.id);
    selected.push(registration);
  }

  return { selected, missing };
}

@Injectable()
export class DatasetReleaseRegistryService implements OnModuleInit {
  private manifests: LoadedDatasetReleaseManifest[] = [];
  private missingSources: string[] = [];

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
    @Inject(LocalDatasetManifestLoader)
    private readonly localDatasetManifestLoader: LocalDatasetManifestLoader,
  ) {}

  async onModuleInit() {
    const datasetsConfig = this.configService.getOrThrow('datasets', { infer: true });
    const registrations = await this.localDatasetManifestLoader.listManifests();

    if (datasetsConfig.releaseSources.length > 0) {
      const selection = selectPinnedManifestRegistrations(
        registrations,
        datasetsConfig.releaseSources,
      );

      this.manifests = selection.selected;
      this.missingSources = selection.missing;
    } else {
      this.manifests = selectLatestManifestRegistrations(registrations);
      this.missingSources = [];
    }

    if (datasetsConfig.requireReleases && this.missingSources.length > 0) {
      throw new Error(
        `Missing configured dataset releases in ${datasetsConfig.releasesDirectory}: ${this.missingSources.join(', ')}`,
      );
    }

    if (
      datasetsConfig.requireReleases &&
      datasetsConfig.releaseSources.length === 0 &&
      this.manifests.length === 0
    ) {
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
    const expectedCount = datasetsConfig.releaseSources.length;

    if (this.missingSources.length > 0) {
      return {
        status: this.manifests.length > 0 ? 'incomplete' : 'missing',
        required: datasetsConfig.requireReleases,
        count: this.manifests.length,
        expectedCount,
        missing: [...this.missingSources],
      };
    }

    if (this.manifests.length > 0) {
      return {
        status: 'loaded',
        required: datasetsConfig.requireReleases,
        count: this.manifests.length,
        expectedCount,
        missing: [],
      };
    }

    return {
      status: datasetsConfig.requireReleases ? 'missing' : 'not_required',
      required: datasetsConfig.requireReleases,
      count: 0,
      expectedCount,
      missing: [],
    };
  }
}
