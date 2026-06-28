import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import { GeographyReadModelQueryService } from '../../../read-model/geography/geography-read-model-query.service';
import {
  buildGeographyDatasetContext,
  buildGeographyReleaseContext,
  buildOffsetPagination,
  GEOGRAPHY_DATASET_ID,
  mapGeographySources,
  paginateRecords,
  sortByEnglishName,
} from '../geography.helpers';
import {
  type GovernorateDetail,
  type GovernorateList,
  type GovernorateListQuery,
  type GovernorateSummary,
  governoratesArtifactSchema,
} from './governorates.dto';

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
    @Optional()
    @Inject(GeographyReadModelQueryService)
    private readonly geographyReadModelQueryService?: GeographyReadModelQueryService,
  ) {}

  async listGovernorates(query: GovernorateListQuery): Promise<GovernorateList> {
    const databaseReadModel = await this.geographyReadModelQueryService?.listGovernorates(query);

    if (databaseReadModel) {
      return {
        items: databaseReadModel.items,
        count: databaseReadModel.items.length,
        pagination: buildOffsetPagination(databaseReadModel.totalRecords, query),
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readGovernorates();
    const filteredItems = this.filterGovernorates(readModel.items, query);
    const sortedItems = this.sortGovernorates(filteredItems, query.order);
    const items = this.paginateGovernorates(sortedItems, query);

    return {
      items,
      count: items.length,
      pagination: buildOffsetPagination(sortedItems.length, query),
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
    };
  }

  async getGovernorate(governorateId: string): Promise<GovernorateDetail> {
    const databaseReadModel =
      await this.geographyReadModelQueryService?.getGovernorate(governorateId);

    if (databaseReadModel) {
      if (!databaseReadModel.item) {
        throw new NotFoundException('Governorate not found');
      }

      return {
        item: databaseReadModel.item,
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
        sources: mapGeographySources(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readGovernorates();
    const governorate = readModel.items.find((item) => item.id === governorateId);

    if (!governorate) {
      throw new NotFoundException('Governorate not found');
    }

    return {
      item: governorate,
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
      sources: mapGeographySources(readModel.manifest),
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
    return sortByEnglishName(items, order);
  }

  private paginateGovernorates(items: GovernorateSummary[], query: GovernorateListQuery) {
    return paginateRecords(items, query);
  }
}
