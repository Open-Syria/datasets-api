import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { GlobalConfig } from '../config/config.type';
import type { DatasetReleaseManifest } from './contracts/dataset-release-manifest.schema';
import { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';

export type DatasetReleaseRegistryHealth = {
  status: 'loaded' | 'missing' | 'not_required';
  required: boolean;
  count: number;
};

@Injectable()
export class DatasetReleaseRegistryService implements OnModuleInit {
  private manifests: DatasetReleaseManifest[] = [];

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
    @Inject(LocalDatasetManifestLoader)
    private readonly localDatasetManifestLoader: LocalDatasetManifestLoader,
  ) {}

  async onModuleInit() {
    this.manifests = await this.localDatasetManifestLoader.listManifests();

    const datasetsConfig = this.configService.getOrThrow('datasets', { infer: true });

    if (datasetsConfig.requireReleases && this.manifests.length === 0) {
      throw new Error(`No dataset release manifests found in ${datasetsConfig.releasesDirectory}`);
    }
  }

  listManifests(): DatasetReleaseManifest[] {
    return this.manifests;
  }

  getManifestByDatasetId(datasetId: string): DatasetReleaseManifest | undefined {
    return this.manifests.find((manifest) => manifest.dataset.id === datasetId);
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
