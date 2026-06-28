import { Inject, Injectable } from '@nestjs/common';
import {
  type DistrictSummary,
  districtSummarySchema,
} from '../../api/geography/districts/districts.dto';
import { GEOGRAPHY_DATASET_ID } from '../../api/geography/geography.helpers';
import {
  type GovernorateSummary,
  governorateSummarySchema,
} from '../../api/geography/governorates/governorates.dto';
import {
  type LocalityListQuery,
  type LocalityRecord,
  type LocalitySummary,
  localityRecordSchema,
} from '../../api/geography/localities/localities.dto';
import {
  type SubdistrictSummary,
  subdistrictSummarySchema,
} from '../../api/geography/subdistricts/subdistricts.dto';
import { PrismaService } from '../../database/prisma.service';
import {
  type DatasetReleaseManifest,
  datasetReleaseManifestSchemaVersion,
} from '../../datasets/contracts/dataset-release-manifest.schema';
import type {
  DatasetRelease,
  DatasetSource,
  GeographyDistrict,
  GeographyGovernorate,
  GeographyLocality,
  GeographySubdistrict,
  Prisma,
} from '../../generated/prisma/client';

type ReleaseWithSources = DatasetRelease & {
  sources: DatasetSource[];
};

export type GeographyDatabaseListResult<TItem> = {
  items: TItem[];
  totalRecords: number;
  manifest: DatasetReleaseManifest;
};

export type GeographyDatabaseDetailResult<TItem> = {
  item: TItem | null;
  manifest: DatasetReleaseManifest;
};

type PaginationQuery = {
  page: number;
  limit: number;
};

type GovernorateQuery = PaginationQuery & {
  q?: string;
  order: 'asc' | 'desc';
  sourceStatus?: 'pending_release' | 'seed' | 'released' | 'deprecated';
};

type DistrictQuery = GovernorateQuery & {
  governorateId?: string;
};

type SubdistrictQuery = DistrictQuery & {
  districtId?: string;
};

function getPagination(query: PaginationQuery) {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}

function normalizeSearch(value: string | undefined) {
  return value?.trim().toLowerCase();
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined;
}

function asStringRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function mapCentroid(record: { latitude: number | null; longitude: number | null }) {
  return record.latitude === null || record.longitude === null
    ? null
    : {
        latitude: record.latitude,
        longitude: record.longitude,
      };
}

function mapPublicLocalityKind(kind: GeographyLocality['kind']): LocalityRecord['kind'] {
  return kind === 'city' || kind === 'town' ? kind : 'locality';
}

@Injectable()
export class GeographyReadModelQueryService {
  constructor(
    @Inject(PrismaService)
    private readonly prismaService: PrismaService,
  ) {}

  async listGovernorates(
    query: GovernorateQuery,
  ): Promise<GeographyDatabaseListResult<GovernorateSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const where: Prisma.GeographyGovernorateWhereInput = {
      releaseId: context.release.id,
      ...(query.sourceStatus ? { sourceStatus: query.sourceStatus } : {}),
      ...this.searchWhere(query.q),
    };
    const [totalRecords, records] = await context.client.$transaction([
      context.client.geographyGovernorate.count({ where }),
      context.client.geographyGovernorate.findMany({
        where,
        orderBy: {
          nameEn: query.order,
        },
        ...getPagination(query),
      }),
    ]);

    return {
      items: records.map((record) => this.mapGovernorate(record)),
      totalRecords,
      manifest: context.manifest,
    };
  }

  async getGovernorate(
    governorateId: string,
  ): Promise<GeographyDatabaseDetailResult<GovernorateSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const record = await context.client.geographyGovernorate.findUnique({
      where: {
        releaseId_id: {
          releaseId: context.release.id,
          id: governorateId,
        },
      },
    });

    return {
      item: record ? this.mapGovernorate(record) : null,
      manifest: context.manifest,
    };
  }

  async listDistricts(
    query: DistrictQuery,
  ): Promise<GeographyDatabaseListResult<DistrictSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const where: Prisma.GeographyDistrictWhereInput = {
      releaseId: context.release.id,
      ...(query.governorateId ? { governorateId: query.governorateId } : {}),
      ...(query.sourceStatus ? { sourceStatus: query.sourceStatus } : {}),
      ...this.searchWhere(query.q),
    };
    const [totalRecords, records] = await context.client.$transaction([
      context.client.geographyDistrict.count({ where }),
      context.client.geographyDistrict.findMany({
        where,
        orderBy: {
          nameEn: query.order,
        },
        ...getPagination(query),
      }),
    ]);

    return {
      items: records.map((record) => this.mapDistrict(record)),
      totalRecords,
      manifest: context.manifest,
    };
  }

  async getDistrict(
    districtId: string,
  ): Promise<GeographyDatabaseDetailResult<DistrictSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const record = await context.client.geographyDistrict.findUnique({
      where: {
        releaseId_id: {
          releaseId: context.release.id,
          id: districtId,
        },
      },
    });

    return {
      item: record ? this.mapDistrict(record) : null,
      manifest: context.manifest,
    };
  }

  async listSubdistricts(
    query: SubdistrictQuery,
  ): Promise<GeographyDatabaseListResult<SubdistrictSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const where: Prisma.GeographySubdistrictWhereInput = {
      releaseId: context.release.id,
      ...(query.governorateId ? { governorateId: query.governorateId } : {}),
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.sourceStatus ? { sourceStatus: query.sourceStatus } : {}),
      ...this.searchWhere(query.q),
    };
    const [totalRecords, records] = await context.client.$transaction([
      context.client.geographySubdistrict.count({ where }),
      context.client.geographySubdistrict.findMany({
        where,
        orderBy: {
          nameEn: query.order,
        },
        ...getPagination(query),
      }),
    ]);

    return {
      items: records.map((record) => this.mapSubdistrict(record)),
      totalRecords,
      manifest: context.manifest,
    };
  }

  async getSubdistrict(
    subdistrictId: string,
  ): Promise<GeographyDatabaseDetailResult<SubdistrictSummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const record = await context.client.geographySubdistrict.findUnique({
      where: {
        releaseId_id: {
          releaseId: context.release.id,
          id: subdistrictId,
        },
      },
    });

    return {
      item: record ? this.mapSubdistrict(record) : null,
      manifest: context.manifest,
    };
  }

  async listLocalities(
    query: LocalityListQuery,
  ): Promise<GeographyDatabaseListResult<LocalitySummary> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const where: Prisma.GeographyLocalityWhereInput = {
      releaseId: context.release.id,
      ...(query.governorateId ? { governorateId: query.governorateId } : {}),
      ...(query.districtId ? { districtId: query.districtId } : {}),
      ...(query.subdistrictId ? { subdistrictId: query.subdistrictId } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.sourceStatus ? { sourceStatus: query.sourceStatus } : {}),
      ...this.searchWhere(query.q),
    };
    const [totalRecords, records] = await context.client.$transaction([
      context.client.geographyLocality.count({ where }),
      context.client.geographyLocality.findMany({
        where,
        orderBy: {
          nameEn: query.order,
        },
        ...getPagination(query),
      }),
    ]);

    return {
      items: records.map((record) => this.toLocalitySummary(this.mapLocality(record))),
      totalRecords,
      manifest: context.manifest,
    };
  }

  async getLocality(
    localityId: string,
  ): Promise<GeographyDatabaseDetailResult<LocalityRecord> | null> {
    const context = await this.getQueryContext();

    if (!context) {
      return null;
    }

    const record = await context.client.geographyLocality.findUnique({
      where: {
        releaseId_id: {
          releaseId: context.release.id,
          id: localityId,
        },
      },
    });

    return {
      item: record ? this.mapLocality(record) : null,
      manifest: context.manifest,
    };
  }

  private async getQueryContext() {
    if (!this.prismaService.isEnabled()) {
      return null;
    }

    const client = this.prismaService.getClient();
    const release = await client.datasetRelease.findFirst({
      where: {
        datasetId: GEOGRAPHY_DATASET_ID,
        status: {
          not: 'deprecated',
        },
      },
      include: {
        sources: true,
      },
      orderBy: [
        {
          generatedAt: 'desc',
        },
      ],
    });

    if (!release) {
      return null;
    }

    return {
      client,
      release,
      manifest: this.mapReleaseManifest(release),
    };
  }

  private searchWhere(search: string | undefined) {
    const normalizedSearch = normalizeSearch(search);

    return normalizedSearch
      ? {
          searchText: {
            contains: normalizedSearch,
          },
        }
      : {};
  }

  private mapReleaseManifest(release: ReleaseWithSources): DatasetReleaseManifest {
    return {
      schemaVersion: datasetReleaseManifestSchemaVersion,
      generatedAt: release.generatedAt.toISOString(),
      dataset: {
        id: release.datasetId,
        slug: release.slug,
        repository: release.repository,
        category: release.category,
        title: {
          en: release.titleEn,
          ar: release.titleAr ?? undefined,
        },
      },
      release: {
        version: release.version,
        status: release.status,
        publishedAt: release.publishedAt?.toISOString() ?? null,
      },
      artifacts: [],
      sources: release.sources.map((source) => ({
        id: source.sourceId,
        title: source.title,
        url: source.url ?? undefined,
        license: source.license,
        accessedAt: source.accessedAt?.toISOString(),
        fields: asStringArray(source.fields),
      })),
    };
  }

  private mapGovernorate(record: GeographyGovernorate): GovernorateSummary {
    const parsed = governorateSummarySchema.safeParse(record.raw);

    if (parsed.success) {
      return parsed.data;
    }

    return {
      id: record.id,
      name: {
        en: record.nameEn,
        ar: record.nameAr ?? undefined,
      },
      iso31662: record.iso31662,
      centroid: mapCentroid(record),
      sourceStatus: record.sourceStatus,
    };
  }

  private mapDistrict(record: GeographyDistrict): DistrictSummary {
    const parsed = districtSummarySchema.safeParse(record.raw);

    if (parsed.success) {
      return parsed.data;
    }

    return {
      id: record.id,
      governorateId: record.governorateId,
      name: {
        en: record.nameEn,
        ar: record.nameAr ?? undefined,
      },
      centroid: mapCentroid(record),
      sourceStatus: record.sourceStatus,
    };
  }

  private mapSubdistrict(record: GeographySubdistrict): SubdistrictSummary {
    const parsed = subdistrictSummarySchema.safeParse(record.raw);

    if (parsed.success) {
      return parsed.data;
    }

    return {
      id: record.id,
      governorateId: record.governorateId,
      districtId: record.districtId,
      name: {
        en: record.nameEn,
        ar: record.nameAr ?? undefined,
      },
      centroid: mapCentroid(record),
      sourceStatus: record.sourceStatus,
    };
  }

  private mapLocality(record: GeographyLocality): LocalityRecord {
    const parsed = localityRecordSchema.safeParse(record.raw);

    if (parsed.success) {
      return parsed.data;
    }

    return {
      id: record.id,
      governorateId: record.governorateId,
      districtId: record.districtId,
      subdistrictId: record.subdistrictId,
      kind: mapPublicLocalityKind(record.kind),
      name: {
        en: record.nameEn,
        ar: record.nameAr ?? undefined,
      },
      aliases: [],
      centroid: mapCentroid(record),
      externalIds: asStringRecord(record.externalIds),
      sourceIds: asStringArray(record.sourceIds) ?? [],
      sourceStatus: record.sourceStatus,
    };
  }

  private toLocalitySummary(record: LocalityRecord): LocalitySummary {
    return {
      id: record.id,
      governorateId: record.governorateId,
      districtId: record.districtId,
      subdistrictId: record.subdistrictId,
      kind: record.kind,
      name: record.name,
      centroid: record.centroid,
      sourceStatus: record.sourceStatus,
    };
  }
}
