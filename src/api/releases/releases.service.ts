import { Inject, Injectable } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import type { ReleaseSummaryList } from './releases.dto';

const RELEASES: ReleaseSummaryList['items'] = [
  {
    id: 'opensyria-seed-planning',
    version: null,
    status: 'seed',
    publishedAt: null,
    datasets: [
      {
        datasetId: 'opensyria-geography',
        repository: 'data-geography',
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-universities',
        repository: 'data-universities',
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-transport',
        repository: 'data-transport',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-heritage',
        repository: 'data-heritage',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-telecom',
        repository: 'data-telecom',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
    ],
    artifacts: [],
    notes:
      'Initial release planning metadata. Dataset artifacts will be attached after the data repositories publish versioned releases.',
  },
];

@Injectable()
export class ReleasesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(PublicDataCacheService)
    private readonly publicDataCacheService: PublicDataCacheService,
  ) {}

  async listReleases(): Promise<ReleaseSummaryList> {
    const manifests = this.datasetReleaseRegistryService.listManifests();

    return this.publicDataCacheService.getOrSet(
      'releases:list',
      this.buildReleaseCachePayload(manifests),
      () => this.buildReleaseSummaryList(manifests),
    );
  }

  private buildReleaseSummaryList(manifests: DatasetReleaseManifest[]): ReleaseSummaryList {
    if (manifests.length > 0) {
      const items = manifests.map((manifest) => this.mapManifestToReleaseSummary(manifest));

      return {
        items,
        count: items.length,
      };
    }

    return {
      items: RELEASES,
      count: RELEASES.length,
    };
  }

  private buildReleaseCachePayload(manifests: DatasetReleaseManifest[]) {
    if (manifests.length === 0) {
      return {
        source: 'seed-releases',
        version: 1,
      };
    }

    return manifests.map((manifest) => ({
      datasetId: manifest.dataset.id,
      generatedAt: manifest.generatedAt,
      releaseStatus: manifest.release.status,
      releaseVersion: manifest.release.version,
      artifacts: manifest.artifacts.map((artifact) => ({
        name: artifact.name,
        sha256: artifact.sha256,
      })),
    }));
  }

  private mapManifestToReleaseSummary(
    manifest: DatasetReleaseManifest,
  ): ReleaseSummaryList['items'][number] {
    return {
      id: `${manifest.dataset.slug}-${manifest.release.version}`,
      version: manifest.release.version,
      status: manifest.release.status,
      publishedAt: manifest.release.publishedAt,
      datasets: [
        {
          datasetId: manifest.dataset.id,
          repository: manifest.dataset.repository,
          status: manifest.release.status,
          releaseVersion: manifest.release.version,
          manifestPath: 'release-manifest.json',
        },
      ],
      artifacts: manifest.artifacts.map((artifact) => ({
        format: artifact.format,
        url: artifact.url ?? null,
        sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes,
      })),
      notes: manifest.release.notes ?? null,
    };
  }
}
