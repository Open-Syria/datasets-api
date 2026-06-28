import { Inject, Injectable } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import type { DatasetSummary, DatasetSummaryList } from './datasets.dto';

const DATASETS: DatasetSummaryList['items'] = [
  {
    id: 'opensyria-geography',
    slug: 'geography',
    name: {
      en: 'Administrative Geography',
      ar: 'الجغرافيا الإدارية',
    },
    description: {
      en: 'Governorates, districts, subdistricts, cities, towns, villages, localities, coordinates, and external IDs.',
      ar: 'المحافظات والمناطق والنواحي والمدن والبلدات والقرى والمحليات والإحداثيات والمعرفات الخارجية.',
    },
    category: 'geography',
    repository: 'data-geography',
    status: 'seed',
    apiEndpoints: [
      '/api/v1/geography/governorates',
      '/api/v1/geography/governorates/{governorateId}',
      '/api/v1/geography/districts',
      '/api/v1/geography/districts/{districtId}',
      '/api/v1/geography/subdistricts',
      '/api/v1/geography/subdistricts/{subdistrictId}',
      '/api/v1/geography/localities',
      '/api/v1/geography/localities/{localityId}',
    ],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-universities',
    slug: 'universities',
    name: {
      en: 'Universities',
      ar: 'الجامعات',
    },
    description: {
      en: 'Public and private universities, campuses, faculties, and related higher education institutions.',
      ar: 'الجامعات العامة والخاصة والحرم الجامعي والكليات ومؤسسات التعليم العالي ذات الصلة.',
    },
    category: 'education',
    repository: 'data-universities',
    status: 'seed',
    apiEndpoints: [],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-transport',
    slug: 'transport',
    name: {
      en: 'Civil Transport Nodes',
      ar: 'نقاط النقل المدني',
    },
    description: {
      en: 'Public airports and seaports first, with railway and bus nodes added only where licensing is clear.',
      ar: 'المطارات والموانئ العامة أولا، ثم محطات السكك والحافلات عندما تكون تراخيص المصادر واضحة.',
    },
    category: 'transport',
    repository: 'data-transport',
    status: 'planned',
    apiEndpoints: [],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-heritage',
    slug: 'heritage',
    name: {
      en: 'Cultural and Heritage Sites',
      ar: 'المواقع الثقافية والتراثية',
    },
    description: {
      en: 'World Heritage records, museums, archaeological sites, landmarks, and other reusable cultural references.',
      ar: 'سجلات التراث العالمي والمتاحف والمواقع الأثرية والمعالم والمراجع الثقافية القابلة لإعادة الاستخدام.',
    },
    category: 'heritage',
    repository: 'data-heritage',
    status: 'planned',
    apiEndpoints: [],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-telecom',
    slug: 'telecom',
    name: {
      en: 'Telecom Dialing Metadata',
      ar: 'بيانات الاتصال الهاتفي',
    },
    description: {
      en: 'Country code, area dialing codes, and public mobile or network prefix metadata.',
      ar: 'رمز الدولة ورموز المناطق وبيانات بادئات شبكات الهاتف المحمول والشبكات العامة.',
    },
    category: 'telecom',
    repository: 'data-telecom',
    status: 'planned',
    apiEndpoints: [],
    version: null,
    updatedAt: null,
  },
];

@Injectable()
export class DatasetsService {
  constructor(
    @Inject(PublicDataCacheService)
    private readonly publicDataCacheService: PublicDataCacheService,
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
  ) {}

  async listDatasets(): Promise<DatasetSummaryList> {
    const manifests = this.datasetReleaseRegistryService.listManifests();

    return this.publicDataCacheService.getOrSet(
      'datasets:list',
      this.buildDatasetCachePayload(manifests),
      () => ({
        items: DATASETS.map((dataset) => this.enrichDatasetFromManifest(dataset, manifests)),
        count: DATASETS.length,
      }),
    );
  }

  private buildDatasetCachePayload(manifests: DatasetReleaseManifest[]) {
    if (manifests.length === 0) {
      return {
        source: 'seed-metadata',
        version: 1,
      };
    }

    return manifests.map((manifest) => ({
      datasetId: manifest.dataset.id,
      generatedAt: manifest.generatedAt,
      releaseStatus: manifest.release.status,
      releaseVersion: manifest.release.version,
      publishedAt: manifest.release.publishedAt,
    }));
  }

  private enrichDatasetFromManifest(
    dataset: DatasetSummary,
    manifests: DatasetReleaseManifest[],
  ): DatasetSummary {
    const manifest = manifests.find((candidate) => candidate.dataset.id === dataset.id);

    if (!manifest) {
      return dataset;
    }

    return {
      ...dataset,
      status: manifest.release.status,
      version: manifest.release.version,
      updatedAt: manifest.release.publishedAt ?? manifest.generatedAt,
    };
  }
}
