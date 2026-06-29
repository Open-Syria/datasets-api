import { Inject, Injectable } from '@nestjs/common';
import {
  type DistrictSummary,
  districtsArtifactSchema,
} from '../../api/geography/districts/districts.dto';
import { GEOGRAPHY_DATASET_ID } from '../../api/geography/geography.helpers';
import {
  type GovernorateSummary,
  governoratesArtifactSchema,
} from '../../api/geography/governorates/governorates.dto';
import {
  type LocalityRecord,
  localitiesArtifactSchema,
} from '../../api/geography/localities/localities.dto';
import {
  type SubdistrictSummary,
  subdistrictsArtifactSchema,
} from '../../api/geography/subdistricts/subdistricts.dto';
import { PrismaService } from '../../database/prisma.service';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { LocalDatasetArtifactReaderService } from '../../datasets/loaders/local-dataset-artifact-reader.service';
import type { Prisma } from '../../generated/prisma/client';
import { PublicDataCacheService } from '../../shared/cache/public-data-cache.service';

const GOVERNORATES_ARTIFACT_NAME = 'governorates';
const DISTRICTS_ARTIFACT_NAME = 'districts';
const SUBDISTRICTS_ARTIFACT_NAME = 'subdistricts';
const LOCALITIES_ARTIFACT_NAME = 'localities';
const DEFAULT_BATCH_SIZE = 500;

type GeographyReadModelImportSummary = {
  releaseId: string;
  datasetId: string;
  version: string;
  counts: {
    governorates: number;
    districts: number;
    subdistricts: number;
    localities: number;
    sources: number;
  };
};

function getReleaseId(manifest: DatasetReleaseManifest) {
  return `${manifest.dataset.id}:${manifest.release.version}`;
}

function toDate(value: string | null | undefined) {
  return value ? new Date(value) : null;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapCentroid(centroid: { latitude: number; longitude: number } | null) {
  return {
    latitude: centroid?.latitude ?? null,
    longitude: centroid?.longitude ?? null,
  };
}

function mapAreaKm2(area: { value: number; unit: 'km2' } | null) {
  return area?.unit === 'km2' ? area.value : null;
}

function flattenSearchValues(value: unknown): unknown[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenSearchValues(item));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      flattenSearchValues(item),
    );
  }

  return [value];
}

function buildSearchText(values: Array<unknown>) {
  return values
    .flatMap((value) => flattenSearchValues(value))
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase();
}

function chunkItems<TItem>(items: TItem[], size = DEFAULT_BATCH_SIZE) {
  const chunks: TItem[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

@Injectable()
export class GeographyReadModelImportService {
  constructor(
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
    @Inject(PublicDataCacheService)
    private readonly publicDataCacheService: PublicDataCacheService,
  ) {}

  async importLatestRelease(): Promise<GeographyReadModelImportSummary> {
    const [governoratesArtifact, districtsArtifact, subdistrictsArtifact, localitiesArtifact] =
      await Promise.all([
        this.localDatasetArtifactReaderService.readJsonArtifact({
          datasetId: GEOGRAPHY_DATASET_ID,
          artifactName: GOVERNORATES_ARTIFACT_NAME,
          schema: governoratesArtifactSchema,
        }),
        this.localDatasetArtifactReaderService.readJsonArtifact({
          datasetId: GEOGRAPHY_DATASET_ID,
          artifactName: DISTRICTS_ARTIFACT_NAME,
          schema: districtsArtifactSchema,
        }),
        this.localDatasetArtifactReaderService.readJsonArtifact({
          datasetId: GEOGRAPHY_DATASET_ID,
          artifactName: SUBDISTRICTS_ARTIFACT_NAME,
          schema: subdistrictsArtifactSchema,
        }),
        this.localDatasetArtifactReaderService.readJsonArtifact({
          datasetId: GEOGRAPHY_DATASET_ID,
          artifactName: LOCALITIES_ARTIFACT_NAME,
          schema: localitiesArtifactSchema,
        }),
      ]);

    if (
      !governoratesArtifact ||
      !districtsArtifact ||
      !subdistrictsArtifact ||
      !localitiesArtifact
    ) {
      throw new Error(
        'No geography release artifacts were found. Sync or build a geography release first.',
      );
    }

    const manifest = governoratesArtifact.manifest;
    const releaseId = getReleaseId(manifest);
    const client = this.prismaService.getClient();

    await client.$transaction(async (transaction) => {
      await transaction.datasetRelease.deleteMany({
        where: {
          id: releaseId,
        },
      });

      await transaction.datasetRelease.create({
        data: {
          id: releaseId,
          datasetId: manifest.dataset.id,
          slug: manifest.dataset.slug,
          repository: manifest.dataset.repository,
          category: manifest.dataset.category,
          titleEn: manifest.dataset.title.en,
          titleAr: manifest.dataset.title.ar ?? null,
          version: manifest.release.version,
          status: manifest.release.status,
          publishedAt: toDate(manifest.release.publishedAt),
          generatedAt: new Date(manifest.generatedAt),
        },
      });

      await transaction.datasetSource.createMany({
        data: manifest.sources.map((source) => ({
          releaseId,
          sourceId: source.id,
          title: source.title,
          url: source.url ?? null,
          license: source.license,
          accessedAt: toDate(source.accessedAt),
          fields: source.fields ? toJson(source.fields) : undefined,
        })),
      });

      for (const batch of chunkItems(governoratesArtifact.data)) {
        await transaction.geographyGovernorate.createMany({
          data: batch.map((governorate) => this.mapGovernorate(releaseId, governorate)),
        });
      }

      for (const batch of chunkItems(districtsArtifact.data)) {
        await transaction.geographyDistrict.createMany({
          data: batch.map((district) => this.mapDistrict(releaseId, district)),
        });
      }

      for (const batch of chunkItems(subdistrictsArtifact.data)) {
        await transaction.geographySubdistrict.createMany({
          data: batch.map((subdistrict) => this.mapSubdistrict(releaseId, subdistrict)),
        });
      }

      for (const batch of chunkItems(localitiesArtifact.data)) {
        await transaction.geographyLocality.createMany({
          data: batch.map((locality) => this.mapLocality(releaseId, locality)),
        });
      }
    });

    await this.publicDataCacheService.clearAll();

    return {
      releaseId,
      datasetId: manifest.dataset.id,
      version: manifest.release.version,
      counts: {
        governorates: governoratesArtifact.data.length,
        districts: districtsArtifact.data.length,
        subdistricts: subdistrictsArtifact.data.length,
        localities: localitiesArtifact.data.length,
        sources: manifest.sources.length,
      },
    };
  }

  private mapGovernorate(releaseId: string, governorate: GovernorateSummary) {
    const centroid = mapCentroid(governorate.centroid);

    return {
      id: governorate.id,
      releaseId,
      nameEn: governorate.name.en,
      nameAr: governorate.name.ar ?? null,
      iso31662: governorate.iso31662,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      areaKm2: mapAreaKm2(governorate.area),
      population: governorate.population ? toJson(governorate.population) : undefined,
      searchText: buildSearchText([
        governorate.id,
        governorate.name,
        governorate.aliases,
        governorate.iso31662,
        governorate.area,
        governorate.population,
        governorate.populationHistory,
        governorate.externalIds,
        governorate.sourceIds,
        governorate.sourceStatus,
      ]),
      sourceStatus: governorate.sourceStatus,
      sourceIds: toJson(governorate.sourceIds),
      raw: toJson(governorate),
    };
  }

  private mapDistrict(releaseId: string, district: DistrictSummary) {
    const centroid = mapCentroid(district.centroid);

    return {
      id: district.id,
      releaseId,
      governorateId: district.governorateId,
      nameEn: district.name.en,
      nameAr: district.name.ar ?? null,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      areaKm2: mapAreaKm2(district.area),
      population: district.population ? toJson(district.population) : undefined,
      searchText: buildSearchText([
        district.id,
        district.governorateId,
        district.name,
        district.aliases,
        district.area,
        district.population,
        district.populationHistory,
        district.externalIds,
        district.sourceIds,
        district.sourceStatus,
      ]),
      sourceStatus: district.sourceStatus,
      sourceIds: toJson(district.sourceIds),
      raw: toJson(district),
    };
  }

  private mapSubdistrict(releaseId: string, subdistrict: SubdistrictSummary) {
    const centroid = mapCentroid(subdistrict.centroid);

    return {
      id: subdistrict.id,
      releaseId,
      governorateId: subdistrict.governorateId,
      districtId: subdistrict.districtId,
      nameEn: subdistrict.name.en,
      nameAr: subdistrict.name.ar ?? null,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      areaKm2: mapAreaKm2(subdistrict.area),
      population: subdistrict.population ? toJson(subdistrict.population) : undefined,
      searchText: buildSearchText([
        subdistrict.id,
        subdistrict.governorateId,
        subdistrict.districtId,
        subdistrict.name,
        subdistrict.aliases,
        subdistrict.area,
        subdistrict.population,
        subdistrict.populationHistory,
        subdistrict.externalIds,
        subdistrict.sourceIds,
        subdistrict.sourceStatus,
      ]),
      sourceStatus: subdistrict.sourceStatus,
      sourceIds: toJson(subdistrict.sourceIds),
      raw: toJson(subdistrict),
    };
  }

  private mapLocality(releaseId: string, locality: LocalityRecord) {
    const centroid = mapCentroid(locality.centroid);

    return {
      id: locality.id,
      releaseId,
      governorateId: locality.governorateId,
      districtId: locality.districtId,
      subdistrictId: locality.subdistrictId,
      kind: locality.kind,
      nameEn: locality.name.en,
      nameAr: locality.name.ar ?? null,
      latitude: centroid.latitude,
      longitude: centroid.longitude,
      aliases: toJson(locality.aliases),
      externalIds: toJson(locality.externalIds),
      searchText: buildSearchText([
        locality.id,
        locality.governorateId,
        locality.districtId,
        locality.subdistrictId,
        locality.kind,
        locality.name.en,
        locality.name.ar,
        locality.sourceStatus,
        locality.aliases.map((alias) => alias.value),
        locality.externalIds,
        locality.sourceIds,
      ]),
      sourceStatus: locality.sourceStatus,
      sourceIds: toJson(locality.sourceIds),
      raw: toJson(locality),
    };
  }
}
