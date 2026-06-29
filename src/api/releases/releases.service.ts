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
    generatedAt: null,
    publishedAt: null,
    datasets: [
      {
        datasetId: 'opensyria-geography',
        slug: 'geography',
        repository: 'data-geography',
        category: 'geography',
        title: {
          en: 'Administrative Geography',
        },
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-universities',
        slug: 'universities',
        repository: 'data-universities',
        category: 'education',
        title: {
          en: 'Universities',
        },
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-transport',
        slug: 'transport',
        repository: 'data-transport',
        category: 'transport',
        title: {
          en: 'Civil Transport Nodes',
        },
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-heritage',
        slug: 'heritage',
        repository: 'data-heritage',
        category: 'heritage',
        title: {
          en: 'Cultural and Heritage Sites',
        },
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-telecom',
        slug: 'telecom',
        repository: 'data-telecom',
        category: 'telecom',
        title: {
          en: 'Telecom Dialing Metadata',
        },
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
      generatedAt: manifest.generatedAt,
      publishedAt: manifest.release.publishedAt,
      datasets: [
        {
          datasetId: manifest.dataset.id,
          slug: manifest.dataset.slug,
          repository: manifest.dataset.repository,
          category: manifest.dataset.category,
          title: manifest.dataset.title,
          status: manifest.release.status,
          releaseVersion: manifest.release.version,
          manifestPath: 'release-manifest.json',
        },
      ],
      artifacts: manifest.artifacts.map((artifact) => ({
        name: artifact.name,
        format: artifact.format,
        path: artifact.path,
        url: artifact.url ?? null,
        sha256: artifact.sha256,
        sizeBytes: artifact.sizeBytes,
        recordCount: artifact.recordCount ?? null,
        mediaType: artifact.mediaType ?? null,
      })),
      notes: manifest.release.notes ?? null,
    };
  }
}
