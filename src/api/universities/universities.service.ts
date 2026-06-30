import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildOffsetPagination,
  paginateOffsetItems,
} from '../../common/helpers/list-query.helpers';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type UniversityDetail,
  type UniversityList,
  type UniversityListQuery,
  type UniversityLogoAsset,
  type UniversityRanking,
  type UniversityRecord,
  type UniversitySummary,
  universityLogoAssetsArtifactSchema,
  universityRankingsArtifactSchema,
  universityRecordsArtifactSchema,
} from './universities.dto';
import {
  buildUniversitiesDatasetContext,
  buildUniversitiesReleaseContext,
  mapUniversitiesSources,
  UNIVERSITIES_DATASET_ID,
} from './universities.helpers';

const UNIVERSITIES_ARTIFACT_NAME = 'universities';
const ASSETS_ARTIFACT_NAME = 'assets';
const RANKINGS_ARTIFACT_NAME = 'rankings';

type UniversitiesReadModel = {
  items: UniversitySummary[];
  manifest?: DatasetReleaseManifest;
};

const rankingScopeOrder = {
  national: 0,
  regional: 1,
  global: 2,
  subject: 3,
  other: 4,
} as const satisfies Record<UniversityRanking['rankScope'], number>;

@Injectable()
export class UniversitiesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listUniversities(query: UniversityListQuery): Promise<UniversityList> {
    const readModel = await this.readUniversities();
    const filteredItems = this.filterUniversities(readModel.items, query);
    const sortedItems = this.sortUniversities(filteredItems, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildUniversitiesDatasetContext(readModel.manifest),
      release: buildUniversitiesReleaseContext(readModel.manifest),
    };
  }

  async getUniversity(universityId: string): Promise<UniversityDetail> {
    const readModel = await this.readUniversities();
    const university = readModel.items.find((item) => item.id === universityId);

    if (!university) {
      throw new NotFoundException('University not found');
    }

    return {
      item: university,
      dataset: buildUniversitiesDatasetContext(readModel.manifest),
      release: buildUniversitiesReleaseContext(readModel.manifest),
      sources: mapUniversitiesSources(readModel.manifest),
    };
  }

  private async readUniversities(): Promise<UniversitiesReadModel> {
    const [universitiesArtifact, assetsArtifact, rankingsArtifact] = await Promise.all([
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: UNIVERSITIES_DATASET_ID,
        artifactName: UNIVERSITIES_ARTIFACT_NAME,
        schema: universityRecordsArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: UNIVERSITIES_DATASET_ID,
        artifactName: ASSETS_ARTIFACT_NAME,
        schema: universityLogoAssetsArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: UNIVERSITIES_DATASET_ID,
        artifactName: RANKINGS_ARTIFACT_NAME,
        schema: universityRankingsArtifactSchema,
      }),
    ]);
    const manifest =
      universitiesArtifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(UNIVERSITIES_DATASET_ID);
    const logosByUniversityId = this.buildLogoMap(assetsArtifact?.data ?? []);
    const rankingsByUniversityId = this.buildRankingMap(rankingsArtifact?.data ?? []);

    return {
      items: (universitiesArtifact?.data ?? []).map((university) =>
        this.enrichUniversity(university, logosByUniversityId, rankingsByUniversityId),
      ),
      manifest,
    };
  }

  private enrichUniversity(
    university: UniversityRecord,
    logosByUniversityId: Map<string, UniversityLogoAsset>,
    rankingsByUniversityId: Map<string, UniversityRanking[]>,
  ): UniversitySummary {
    return {
      ...university,
      logo: logosByUniversityId.get(university.id) ?? null,
      rankings: rankingsByUniversityId.get(university.id) ?? [],
    };
  }

  private buildLogoMap(assets: UniversityLogoAsset[]) {
    const logosByUniversityId = new Map<string, UniversityLogoAsset>();

    for (const asset of assets) {
      if (asset.assetRole !== 'logo') {
        continue;
      }

      const existingLogo = logosByUniversityId.get(asset.universityId);

      if (!existingLogo || asset.id.localeCompare(existingLogo.id) < 0) {
        logosByUniversityId.set(asset.universityId, asset);
      }
    }

    return logosByUniversityId;
  }

  private buildRankingMap(rankings: UniversityRanking[]) {
    const rankingsByUniversityId = new Map<string, UniversityRanking[]>();

    for (const ranking of rankings) {
      const existingRankings = rankingsByUniversityId.get(ranking.universityId) ?? [];

      existingRankings.push(ranking);
      rankingsByUniversityId.set(ranking.universityId, existingRankings);
    }

    for (const universityRankings of rankingsByUniversityId.values()) {
      universityRankings.sort(compareRankings);
    }

    return rankingsByUniversityId;
  }

  private filterUniversities(items: UniversitySummary[], query: UniversityListQuery) {
    return items.filter((item) => {
      if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
        return false;
      }

      if (query.institutionType && item.institutionType !== query.institutionType) {
        return false;
      }

      if (query.governorate && !matchesGovernorate(item, query.governorate)) {
        return false;
      }

      if (query.hasWebsite !== undefined && Boolean(item.website) !== query.hasWebsite) {
        return false;
      }

      return matchesSearch(
        [
          item.id,
          item.name,
          item.aliases,
          item.institutionType,
          item.operationalStatus,
          item.foundedYear,
          item.website,
          item.location,
          item.externalIds,
          item.sourceIds,
          item.sourceStatus,
          item.logo?.title,
          item.rankings.map((ranking) => [
            ranking.rankingSystem,
            ranking.rankScope,
            ranking.year,
            ranking.rankDisplay,
          ]),
        ],
        query.q,
      );
    });
  }

  private sortUniversities(items: UniversitySummary[], order: UniversityListQuery['order']) {
    return [...items].sort((first, second) => {
      const comparison = first.name.en.localeCompare(second.name.en);

      return order === 'asc' ? comparison : -comparison;
    });
  }
}

function compareRankings(first: UniversityRanking, second: UniversityRanking) {
  return (
    second.year - first.year ||
    rankingScopeOrder[first.rankScope] - rankingScopeOrder[second.rankScope] ||
    (first.rank ?? Number.MAX_SAFE_INTEGER) - (second.rank ?? Number.MAX_SAFE_INTEGER) ||
    first.rankingSystem.localeCompare(second.rankingSystem)
  );
}

function matchesGovernorate(item: UniversitySummary, governorate: string) {
  const normalizedGovernorate = governorate.trim().toLowerCase();

  return [item.location?.governorate?.en, item.location?.governorate?.ar].some(
    (value) => value?.toLowerCase() === normalizedGovernorate,
  );
}

function matchesSearch(values: unknown[], search: string | undefined) {
  const normalizedSearch = search?.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return values
    .flatMap((value) => flattenSearchValues(value))
    .some((value) => String(value).toLowerCase().includes(normalizedSearch));
}

function flattenSearchValues(value: unknown): unknown[] {
  if (value === null || value === undefined || value === '') {
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
