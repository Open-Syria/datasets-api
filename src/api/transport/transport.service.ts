import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildOffsetPagination,
  matchesSearchValues,
  paginateOffsetItems,
} from '../../common/helpers/list-query.helpers';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type TransportLocation,
  type TransportLocationDetail,
  type TransportLocationList,
  type TransportLocationListQuery,
  type TransportRouteSnapshot,
  type TransportRouteSnapshotDetail,
  type TransportRouteSnapshotList,
  type TransportRouteSnapshotListQuery,
  type TransportStatusSnapshot,
  type TransportStatusSnapshotDetail,
  type TransportStatusSnapshotList,
  type TransportStatusSnapshotListQuery,
  transportLocationsArtifactSchema,
  transportRouteSnapshotsArtifactSchema,
  transportStatusSnapshotsArtifactSchema,
} from './transport.dto';
import {
  buildTransportDatasetContext,
  buildTransportReleaseContext,
  mapTransportSources,
  TRANSPORT_DATASET_ID,
} from './transport.helpers';

const LOCATIONS_ARTIFACT_NAME = 'locations';
const STATUS_SNAPSHOTS_ARTIFACT_NAME = 'status-snapshots';
const ROUTE_SNAPSHOTS_ARTIFACT_NAME = 'route-snapshots';

type TransportReadModel = {
  locations: TransportLocation[];
  statusSnapshots: TransportStatusSnapshot[];
  routeSnapshots: TransportRouteSnapshot[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class TransportService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listLocations(query: TransportLocationListQuery): Promise<TransportLocationList> {
    const readModel = await this.readTransport();
    const filteredItems = readModel.locations.filter((item) =>
      this.matchesLocationFilters(item, query),
    );
    const sortedItems = sortByName(filteredItems, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
    };
  }

  async getLocation(locationId: string): Promise<TransportLocationDetail> {
    const readModel = await this.readTransport();
    const location = readModel.locations.find((item) => item.id === locationId);

    if (!location) {
      throw new NotFoundException('Transport location not found');
    }

    return {
      item: location,
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
      sources: mapTransportSources(readModel.manifest),
    };
  }

  async listStatusSnapshots(
    query: TransportStatusSnapshotListQuery,
  ): Promise<TransportStatusSnapshotList> {
    const readModel = await this.readTransport();
    const filteredItems = readModel.statusSnapshots.filter((item) =>
      this.matchesStatusSnapshotFilters(item, query),
    );
    const sortedItems = sortByStatusDate(filteredItems, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
    };
  }

  async getStatusSnapshot(statusSnapshotId: string): Promise<TransportStatusSnapshotDetail> {
    const readModel = await this.readTransport();
    const snapshot = readModel.statusSnapshots.find((item) => item.id === statusSnapshotId);

    if (!snapshot) {
      throw new NotFoundException('Transport status snapshot not found');
    }

    return {
      item: snapshot,
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
      sources: mapTransportSources(readModel.manifest),
    };
  }

  async listRouteSnapshots(
    query: TransportRouteSnapshotListQuery,
  ): Promise<TransportRouteSnapshotList> {
    const readModel = await this.readTransport();
    const filteredItems = readModel.routeSnapshots.filter((item) =>
      this.matchesRouteSnapshotFilters(item, query),
    );
    const sortedItems = sortByStatusDate(filteredItems, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
    };
  }

  async getRouteSnapshot(routeSnapshotId: string): Promise<TransportRouteSnapshotDetail> {
    const readModel = await this.readTransport();
    const snapshot = readModel.routeSnapshots.find((item) => item.id === routeSnapshotId);

    if (!snapshot) {
      throw new NotFoundException('Transport route snapshot not found');
    }

    return {
      item: snapshot,
      dataset: buildTransportDatasetContext(readModel.manifest),
      release: buildTransportReleaseContext(readModel.manifest),
      sources: mapTransportSources(readModel.manifest),
    };
  }

  private async readTransport(): Promise<TransportReadModel> {
    const [locationsArtifact, statusSnapshotsArtifact, routeSnapshotsArtifact] = await Promise.all([
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TRANSPORT_DATASET_ID,
        artifactName: LOCATIONS_ARTIFACT_NAME,
        schema: transportLocationsArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TRANSPORT_DATASET_ID,
        artifactName: STATUS_SNAPSHOTS_ARTIFACT_NAME,
        schema: transportStatusSnapshotsArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TRANSPORT_DATASET_ID,
        artifactName: ROUTE_SNAPSHOTS_ARTIFACT_NAME,
        schema: transportRouteSnapshotsArtifactSchema,
      }),
    ]);
    const manifest =
      locationsArtifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(TRANSPORT_DATASET_ID);

    return {
      locations: locationsArtifact?.data ?? [],
      statusSnapshots: statusSnapshotsArtifact?.data ?? [],
      routeSnapshots: routeSnapshotsArtifact?.data ?? [],
      manifest,
    };
  }

  private matchesLocationFilters(item: TransportLocation, query: TransportLocationListQuery) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.locationType && !item.locationTypes.includes(query.locationType)) {
      return false;
    }

    if (query.transportMode && !item.transportModes.includes(query.transportMode)) {
      return false;
    }

    if (query.operationalStatus && item.operationalStatus !== query.operationalStatus) {
      return false;
    }

    if (query.governorateId && item.administrativeLocation?.governorateId !== query.governorateId) {
      return false;
    }

    if (query.hasCoordinates !== undefined && Boolean(item.coordinates) !== query.hasCoordinates) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.name,
        item.aliases,
        item.locationTypes,
        item.transportModes,
        item.operationalStatus,
        item.coordinates,
        item.administrativeLocation,
        item.externalIds,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }

  private matchesStatusSnapshotFilters(
    item: TransportStatusSnapshot,
    query: TransportStatusSnapshotListQuery,
  ) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.locationId && item.locationId !== query.locationId) {
      return false;
    }

    if (query.observedStatus && item.observedStatus !== query.observedStatus) {
      return false;
    }

    if (query.statusAsOf && item.statusAsOf !== query.statusAsOf) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.locationId,
        item.observedStatus,
        item.statusAsOf,
        item.countryPair,
        item.sourceNames,
        item.statusNote,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
      ],
      query.q,
    );
  }

  private matchesRouteSnapshotFilters(
    item: TransportRouteSnapshot,
    query: TransportRouteSnapshotListQuery,
  ) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.routeType && item.routeType !== query.routeType) {
      return false;
    }

    if (query.transportMode && !item.transportModes.includes(query.transportMode)) {
      return false;
    }

    if (query.observedStatus && item.observedStatus !== query.observedStatus) {
      return false;
    }

    if (query.statusAsOf && item.statusAsOf !== query.statusAsOf) {
      return false;
    }

    if (query.locationId && !item.locationIds.includes(query.locationId)) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.name,
        item.routeType,
        item.transportModes,
        item.observedStatus,
        item.statusAsOf,
        item.origin,
        item.destination,
        item.transitCountries,
        item.locationIds,
        item.sourceNames,
        item.indicativeLeadTime,
        item.routeNote,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
      ],
      query.q,
    );
  }
}

function sortByName<TItem extends { id: string; name: { en: string } }>(
  items: TItem[],
  order: 'asc' | 'desc',
) {
  return [...items].sort((first, second) => {
    const comparison = first.name.en.localeCompare(second.name.en) || compareIds(first, second);

    return order === 'asc' ? comparison : -comparison;
  });
}

function sortByStatusDate<TItem extends { id: string; statusAsOf: string }>(
  items: TItem[],
  order: 'asc' | 'desc',
) {
  return [...items].sort((first, second) => {
    const comparison =
      first.statusAsOf.localeCompare(second.statusAsOf) || first.id.localeCompare(second.id);

    return order === 'asc' ? comparison : -comparison;
  });
}

function compareIds(first: { id: string }, second: { id: string }) {
  return first.id.localeCompare(second.id);
}
