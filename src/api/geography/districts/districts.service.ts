import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
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
  ) {}

  async listDistricts(query: DistrictListQuery): Promise<DistrictList> {
    const readModel = await this.readDistricts();
    const filteredItems = this.filterDistricts(readModel.items, query);
    const sortedItems = this.sortDistricts(filteredItems, query.order);
    const items = this.paginateDistricts(sortedItems, query);

    return {
      items,
      count: items.length,
      pagination: buildOffsetPagination(sortedItems.length, query),
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
    };
  }

  async getDistrict(districtId: string): Promise<DistrictDetail> {
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
    const search = query.q?.toLowerCase();

    return items.filter((item) => {
      if (query.governorateId && item.governorateId !== query.governorateId) {
        return false;
      }

      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [item.id, item.governorateId, item.name.en, item.name.ar, item.sourceStatus].some(
        (value) => value?.toLowerCase().includes(search),
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
