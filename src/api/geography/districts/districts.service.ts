import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { buildOffsetPagination } from '../../../common/helpers/list-query.helpers';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import { GeographyReadModelQueryService } from '../../../read-model/geography/geography-read-model-query.service';
import {
  buildGeographyDatasetContext,
  buildGeographyReleaseContext,
  GEOGRAPHY_DATASET_ID,
  mapGeographySources,
  matchesSearch,
  paginateRecords,
  sortByEnglishName,
} from '../geography.helpers';
import {
  type DistrictDetail,
  type DistrictList,
  type DistrictListQuery,
  type DistrictSummary,
  districtsArtifactSchema,
} from './districts.dto';

const DISTRICTS_ARTIFACT_NAME = 'districts';

type DistrictReadModel = {
  items: DistrictSummary[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class DistrictsService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
    @Optional()
    @Inject(GeographyReadModelQueryService)
    private readonly geographyReadModelQueryService?: GeographyReadModelQueryService,
  ) {}

  async listDistricts(query: DistrictListQuery): Promise<DistrictList> {
    const databaseReadModel = await this.geographyReadModelQueryService?.listDistricts(query);

    if (databaseReadModel) {
      return {
        items: databaseReadModel.items,
        pagination: buildOffsetPagination(
          databaseReadModel.totalRecords,
          query,
          databaseReadModel.items.length,
        ),
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readDistricts();
    const filteredItems = this.filterDistricts(readModel.items, query);
    const sortedItems = this.sortDistricts(filteredItems, query.order);
    const items = this.paginateDistricts(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
    };
  }

  async getDistrict(districtId: string): Promise<DistrictDetail> {
    const databaseReadModel = await this.geographyReadModelQueryService?.getDistrict(districtId);

    if (databaseReadModel) {
      if (!databaseReadModel.item) {
        throw new NotFoundException('District not found');
      }

      return {
        item: databaseReadModel.item,
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
        sources: mapGeographySources(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readDistricts();
    const district = readModel.items.find((item) => item.id === districtId);

    if (!district) {
      throw new NotFoundException('District not found');
    }

    return {
      item: district,
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
      sources: mapGeographySources(readModel.manifest),
    };
  }

  private async readDistricts(): Promise<DistrictReadModel> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: DISTRICTS_ARTIFACT_NAME,
      schema: districtsArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    return {
      items: artifact?.data ?? [],
      manifest,
    };
  }

  private filterDistricts(items: DistrictSummary[], query: DistrictListQuery) {
    return items.filter((item) => {
      if (query.governorateId && item.governorateId !== query.governorateId) {
        return false;
      }

      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      return matchesSearch(
        [
          item.id,
          item.governorateId,
          item.name,
          item.aliases,
          item.externalIds,
          item.sourceIds,
          item.sourceStatus,
        ],
        query.q,
      );
    });
  }

  private sortDistricts(items: DistrictSummary[], order: DistrictListQuery['order']) {
    return sortByEnglishName(items, order);
  }

  private paginateDistricts(items: DistrictSummary[], query: DistrictListQuery) {
    return paginateRecords(items, query);
  }
}
