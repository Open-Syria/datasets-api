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
  type SubdistrictDetail,
  type SubdistrictList,
  type SubdistrictListQuery,
  type SubdistrictSummary,
  subdistrictsArtifactSchema,
} from './subdistricts.dto';

const SUBDISTRICTS_ARTIFACT_NAME = 'subdistricts';

type SubdistrictReadModel = {
  items: SubdistrictSummary[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class SubdistrictsService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
    @Optional()
    @Inject(GeographyReadModelQueryService)
    private readonly geographyReadModelQueryService?: GeographyReadModelQueryService,
  ) {}

  async listSubdistricts(query: SubdistrictListQuery): Promise<SubdistrictList> {
    const databaseReadModel = await this.geographyReadModelQueryService?.listSubdistricts(query);

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

    const readModel = await this.readSubdistricts();
    const filteredItems = this.filterSubdistricts(readModel.items, query);
    const sortedItems = this.sortSubdistricts(filteredItems, query.order);
    const items = this.paginateSubdistricts(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
    };
  }

  async getSubdistrict(subdistrictId: string): Promise<SubdistrictDetail> {
    const databaseReadModel =
      await this.geographyReadModelQueryService?.getSubdistrict(subdistrictId);

    if (databaseReadModel) {
      if (!databaseReadModel.item) {
        throw new NotFoundException('Subdistrict not found');
      }

      return {
        item: databaseReadModel.item,
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
        sources: mapGeographySources(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readSubdistricts();
    const subdistrict = readModel.items.find((item) => item.id === subdistrictId);

    if (!subdistrict) {
      throw new NotFoundException('Subdistrict not found');
    }

    return {
      item: subdistrict,
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
      sources: mapGeographySources(readModel.manifest),
    };
  }

  private async readSubdistricts(): Promise<SubdistrictReadModel> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: SUBDISTRICTS_ARTIFACT_NAME,
      schema: subdistrictsArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    return {
      items: artifact?.data ?? [],
      manifest,
    };
  }

  private filterSubdistricts(items: SubdistrictSummary[], query: SubdistrictListQuery) {
    const search = query.q?.toLowerCase();

    return items.filter((item) => {
      if (query.governorateId && item.governorateId !== query.governorateId) {
        return false;
      }

      if (query.districtId && item.districtId !== query.districtId) {
        return false;
      }

      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        item.id,
        item.governorateId,
        item.districtId,
        item.name.en,
        item.name.ar,
        item.sourceStatus,
      ].some((value) => value?.toLowerCase().includes(search));
    });
  }

  private sortSubdistricts(items: SubdistrictSummary[], order: SubdistrictListQuery['order']) {
    return sortByEnglishName(items, order);
  }

  private paginateSubdistricts(items: SubdistrictSummary[], query: SubdistrictListQuery) {
    return paginateRecords(items, query);
  }
}
