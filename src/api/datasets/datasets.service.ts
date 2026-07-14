import { Inject, Injectable } from '@nestjs/common';
import {
  buildOffsetPagination,
  matchesSearchValues,
  paginateOffsetItems,
  sortByString,
} from '../../common/helpers/list-query.helpers';
import type { OffsetPaginationQuery } from '../../common/schemas/pagination.schema';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';
import { getPublicDatasetEndpointRoutes } from '../public-dataset-endpoints';
import type { DatasetSummary, DatasetSummaryList } from './datasets.dto';

type DatasetSummaryListResult = DatasetSummaryList;

const DATASETS: DatasetSummary[] = [
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
    status: 'released',
    apiEndpoints: [...getPublicDatasetEndpointRoutes('data-geography')],
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
    status: 'released',
    apiEndpoints: [...getPublicDatasetEndpointRoutes('data-universities')],
    version: null,
    updatedAt: null,
  },
  {
    id: 'opensyria-transport',
    slug: 'transport',
    name: {
      en: 'Transport Locations',
      ar: 'نقاط النقل المدني',
    },
    description: {
      en: 'Public transport and trade locations, dated status snapshots, and high-level route observations with source attribution.',
      ar: 'المطارات والموانئ العامة أولا، ثم محطات السكك والحافلات عندما تكون تراخيص المصادر واضحة.',
    },
    category: 'transport',
    repository: 'data-transport',
    status: 'released',
    apiEndpoints: [...getPublicDatasetEndpointRoutes('data-transport')],
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
      en: 'Country code, fixed area codes, mobile prefixes, operators, and public numbering range metadata with source attribution.',
      ar: 'رمز الدولة ورموز المناطق وبيانات بادئات شبكات الهاتف المحمول والشبكات العامة.',
    },
    category: 'telecom',
    repository: 'data-telecom',
    status: 'released',
    apiEndpoints: [...getPublicDatasetEndpointRoutes('data-telecom')],
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

  async listDatasets(query: OffsetPaginationQuery): Promise<DatasetSummaryListResult> {
    const manifests = this.datasetReleaseRegistryService.listManifests();

    return this.publicDataCacheService.getOrSet(
      'datasets:list',
      {
        releases: this.buildDatasetCachePayload(manifests),
        query,
      },
      () => this.buildDatasetSummaryList(manifests, query),
    );
  }

  private buildDatasetSummaryList(
    manifests: DatasetReleaseManifest[],
    query: OffsetPaginationQuery,
  ): DatasetSummaryListResult {
    const filteredItems = DATASETS.map((dataset) =>
      this.enrichDatasetFromManifest(dataset, manifests),
    ).filter((dataset) => this.matchesDatasetSearch(dataset, query.q));
    const sortedItems = sortByString(filteredItems, (dataset) => dataset.name.en, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
    };
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

  private matchesDatasetSearch(dataset: DatasetSummary, search: string | undefined) {
    return matchesSearchValues(
      [
        dataset.id,
        dataset.slug,
        dataset.name,
        dataset.description,
        dataset.category,
        dataset.repository,
        dataset.status,
        dataset.apiEndpoints,
        dataset.version,
        dataset.updatedAt,
      ],
      search,
    );
  }
}
