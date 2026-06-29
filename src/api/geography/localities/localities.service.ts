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
  matchesSearch,
  paginateRecords,
  sortByEnglishName,
} from '../geography.helpers';
import {
  type LocalityDetail,
  type LocalityList,
  type LocalityListQuery,
  type LocalityRecord,
  localitiesArtifactSchema,
} from './localities.dto';

const LOCALITIES_ARTIFACT_NAME = 'localities';

type LocalityReadModel = {
  items: LocalityRecord[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class LocalitiesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
    @Optional()
    @Inject(GeographyReadModelQueryService)
    private readonly geographyReadModelQueryService?: GeographyReadModelQueryService,
  ) {}

  async listLocalities(query: LocalityListQuery): Promise<LocalityList> {
    const databaseReadModel = await this.geographyReadModelQueryService?.listLocalities(query);

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

    const readModel = await this.readLocalities();
    const filteredItems = this.filterLocalities(readModel.items, query);
    const sortedItems = this.sortLocalities(filteredItems, query.order);
    const items = this.paginateLocalities(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
    };
  }

  async getLocality(localityId: string): Promise<LocalityDetail> {
    const databaseReadModel = await this.geographyReadModelQueryService?.getLocality(localityId);

    if (databaseReadModel) {
      if (!databaseReadModel.item) {
        throw new NotFoundException('Locality not found');
      }

      return {
        item: databaseReadModel.item,
        dataset: buildGeographyDatasetContext(databaseReadModel.manifest),
        release: buildGeographyReleaseContext(databaseReadModel.manifest),
        sources: mapGeographySources(databaseReadModel.manifest),
      };
    }

    const readModel = await this.readLocalities();
    const locality = readModel.items.find((item) => item.id === localityId);

    if (!locality) {
      throw new NotFoundException('Locality not found');
    }

    return {
      item: locality,
      dataset: buildGeographyDatasetContext(readModel.manifest),
      release: buildGeographyReleaseContext(readModel.manifest),
      sources: mapGeographySources(readModel.manifest),
    };
  }

  private async readLocalities(): Promise<LocalityReadModel> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: LOCALITIES_ARTIFACT_NAME,
      schema: localitiesArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    return {
      items: artifact?.data ?? [],
      manifest,
    };
  }

  private filterLocalities(items: LocalityRecord[], query: LocalityListQuery) {
    return items.filter((item) => {
      if (query.governorateId && item.governorateId !== query.governorateId) {
        return false;
      }

      if (query.districtId && item.districtId !== query.districtId) {
        return false;
      }

      if (query.subdistrictId && item.subdistrictId !== query.subdistrictId) {
        return false;
      }

      if (query.kind && item.kind !== query.kind) {
        return false;
      }

      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      return matchesSearch(
        [
          item.id,
          item.governorateId,
          item.districtId,
          item.subdistrictId,
          item.kind,
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

  private sortLocalities(items: LocalityRecord[], order: LocalityListQuery['order']) {
    return sortByEnglishName(items, order);
  }

  private paginateLocalities(items: LocalityRecord[], query: LocalityListQuery) {
    return paginateRecords(items, query);
  }
}
