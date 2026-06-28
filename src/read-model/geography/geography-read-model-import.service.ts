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

const GOVERNORATES_ARTIFACT_NAME = 'governorates';
const DISTRICTS_ARTIFACT_NAME = 'districts';
const SUBDISTRICTS_ARTIFACT_NAME = 'subdistricts';
const LOCALITIES_ARTIFACT_NAME = 'localities';

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

@Injectable()
export class GeographyReadModelImportService {
  constructor(
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
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
    const client = await this.prismaService.getClient();

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

      await transaction.geographyGovernorate.createMany({
        data: governoratesArtifact.data.map((governorate) =>
          this.mapGovernorate(releaseId, governorate),
        ),
      });

      await transaction.geographyDistrict.createMany({
        data: districtsArtifact.data.map((district) => this.mapDistrict(releaseId, district)),
      });

      await transaction.geographySubdistrict.createMany({
        data: subdistrictsArtifact.data.map((subdistrict) =>
          this.mapSubdistrict(releaseId, subdistrict),
        ),
      });

      await transaction.geographyLocality.createMany({
        data: localitiesArtifact.data.map((locality) => this.mapLocality(releaseId, locality)),
      });
    });

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
      sourceStatus: governorate.sourceStatus,
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
      sourceStatus: district.sourceStatus,
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
      sourceStatus: subdistrict.sourceStatus,
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
      sourceStatus: locality.sourceStatus,
      sourceIds: toJson(locality.sourceIds),
      raw: toJson(locality),
    };
  }
}
