import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SourceAttribution } from '../../../common/dto/source-attribution.dto';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type GovernorateDetail,
  type GovernorateList,
  type GovernorateListQuery,
  type GovernorateSummary,
  governoratesArtifactSchema,
} from './governorates.dto';

const GEOGRAPHY_DATASET_ID = 'opensyria-geography';
const GOVERNORATES_ARTIFACT_NAME = 'governorates';

type GovernorateReadModel = {
  items: GovernorateSummary[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class GovernoratesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listGovernorates(query: GovernorateListQuery): Promise<GovernorateList> {
    const readModel = await this.readGovernorates();
    const filteredItems = this.filterGovernorates(readModel.items, query);
    const sortedItems = this.sortGovernorates(filteredItems, query.order);
    const items = this.paginateGovernorates(sortedItems, query);

    return {
      items,
      count: items.length,
      pagination: this.buildPagination(sortedItems.length, query),
      dataset: this.buildDatasetContext(readModel.manifest),
      release: this.buildReleaseContext(readModel.manifest),
    };
  }

  async getGovernorate(governorateId: string): Promise<GovernorateDetail> {
    const readModel = await this.readGovernorates();
    const governorate = readModel.items.find((item) => item.id === governorateId);

    if (!governorate) {
      throw new NotFoundException('Governorate not found');
    }

    return {
      item: governorate,
      dataset: this.buildDatasetContext(readModel.manifest),
      release: this.buildReleaseContext(readModel.manifest),
      sources: this.mapSources(readModel.manifest),
    };
  }

  private async readGovernorates(): Promise<GovernorateReadModel> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: GOVERNORATES_ARTIFACT_NAME,
      schema: governoratesArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    return {
      items: artifact?.data ?? [],
      manifest,
    };
  }

  private buildDatasetContext(manifest?: DatasetReleaseManifest): GovernorateList['dataset'] {
    return {
      id: GEOGRAPHY_DATASET_ID,
      repository: 'data-geography',
      status: manifest?.release.status ?? 'pending_release',
    };
  }

  private buildReleaseContext(manifest?: DatasetReleaseManifest): GovernorateList['release'] {
    const releaseVersion = manifest?.release.version;
    const releasedAt = manifest?.release.publishedAt;

    return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
  }

  private mapSources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
    return (
      manifest?.sources.map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url ?? null,
        license: source.license,
        accessedAt: source.accessedAt ?? null,
        fields: source.fields ?? [],
      })) ?? []
    );
  }

  private filterGovernorates(items: GovernorateSummary[], query: GovernorateListQuery) {
    const search = query.q?.toLowerCase();

    return items.filter((item) => {
      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [item.id, item.name.en, item.name.ar, item.iso31662, item.sourceStatus].some((value) =>
        value?.toLowerCase().includes(search),
      );
    });
  }

  private sortGovernorates(items: GovernorateSummary[], order: GovernorateListQuery['order']) {
    return [...items].sort((first, second) => {
      const comparison = first.name.en.localeCompare(second.name.en);

      return order === 'asc' ? comparison : -comparison;
    });
  }

  private paginateGovernorates(items: GovernorateSummary[], query: GovernorateListQuery) {
    const start = (query.page - 1) * query.limit;

    return items.slice(start, start + query.limit);
  }

  private buildPagination(totalRecords: number, query: GovernorateListQuery) {
    const totalPages = totalRecords === 0 ? 0 : Math.ceil(totalRecords / query.limit);
    const hasNextPage = totalPages > 0 && query.page < totalPages;
    const hasPreviousPage = query.page > 1 && query.page <= totalPages;

    return {
      limit: query.limit,
      currentPage: query.page,
      totalRecords,
      totalPages,
      nextPage: hasNextPage ? query.page + 1 : null,
      previousPage: hasPreviousPage ? query.page - 1 : null,
    };
  }
}
