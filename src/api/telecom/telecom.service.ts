import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildOffsetPagination,
  matchesSearchValues,
  paginateOffsetItems,
  sortByString,
} from '../../common/helpers/list-query.helpers';
import type { DatasetReleaseManifest } from '../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type TelecomCountryNumberingPlan,
  type TelecomCountryNumberingPlanDetail,
  type TelecomCountryNumberingPlanList,
  type TelecomCountryNumberingPlanListQuery,
  type TelecomFixedAreaCode,
  type TelecomFixedAreaCodeDetail,
  type TelecomFixedAreaCodeList,
  type TelecomFixedAreaCodeListQuery,
  type TelecomMobilePrefix,
  type TelecomMobilePrefixDetail,
  type TelecomMobilePrefixList,
  type TelecomMobilePrefixListQuery,
  type TelecomNumberRange,
  type TelecomNumberRangeDetail,
  type TelecomNumberRangeList,
  type TelecomNumberRangeListQuery,
  type TelecomOperator,
  type TelecomOperatorDetail,
  type TelecomOperatorList,
  type TelecomOperatorListQuery,
  telecomCountryNumberingPlansArtifactSchema,
  telecomFixedAreaCodesArtifactSchema,
  telecomMobilePrefixesArtifactSchema,
  telecomNumberRangesArtifactSchema,
  telecomOperatorsArtifactSchema,
} from './telecom.dto';
import {
  buildTelecomDatasetContext,
  buildTelecomReleaseContext,
  mapTelecomSources,
  TELECOM_DATASET_ID,
} from './telecom.helpers';

const COUNTRY_NUMBERING_PLANS_ARTIFACT_NAME = 'country-numbering-plans';
const OPERATORS_ARTIFACT_NAME = 'operators';
const FIXED_AREA_CODES_ARTIFACT_NAME = 'fixed-area-codes';
const MOBILE_PREFIXES_ARTIFACT_NAME = 'mobile-prefixes';
const NUMBER_RANGES_ARTIFACT_NAME = 'number-ranges';

type TelecomReadModel = {
  countryNumberingPlans: TelecomCountryNumberingPlan[];
  operators: TelecomOperator[];
  fixedAreaCodes: TelecomFixedAreaCode[];
  mobilePrefixes: TelecomMobilePrefix[];
  numberRanges: TelecomNumberRange[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class TelecomService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listCountryNumberingPlans(
    query: TelecomCountryNumberingPlanListQuery,
  ): Promise<TelecomCountryNumberingPlanList> {
    const readModel = await this.readTelecom();
    const filteredItems = readModel.countryNumberingPlans.filter((item) =>
      this.matchesCountryNumberingPlanFilters(item, query),
    );
    const sortedItems = sortByString(filteredItems, (item) => item.countryCode, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
    };
  }

  async getCountryNumberingPlan(
    countryNumberingPlanId: string,
  ): Promise<TelecomCountryNumberingPlanDetail> {
    const readModel = await this.readTelecom();
    const countryNumberingPlan = readModel.countryNumberingPlans.find(
      (item) => item.id === countryNumberingPlanId,
    );

    if (!countryNumberingPlan) {
      throw new NotFoundException('Telecom country numbering plan not found');
    }

    return this.buildDetail(countryNumberingPlan, readModel);
  }

  async listOperators(query: TelecomOperatorListQuery): Promise<TelecomOperatorList> {
    const readModel = await this.readTelecom();
    const filteredItems = readModel.operators.filter((item) =>
      this.matchesOperatorFilters(item, query),
    );
    const sortedItems = sortByString(filteredItems, (item) => item.name.en, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
    };
  }

  async getOperator(operatorId: string): Promise<TelecomOperatorDetail> {
    const readModel = await this.readTelecom();
    const operator = readModel.operators.find((item) => item.id === operatorId);

    if (!operator) {
      throw new NotFoundException('Telecom operator not found');
    }

    return this.buildDetail(operator, readModel);
  }

  async listFixedAreaCodes(
    query: TelecomFixedAreaCodeListQuery,
  ): Promise<TelecomFixedAreaCodeList> {
    const readModel = await this.readTelecom();
    const filteredItems = readModel.fixedAreaCodes.filter((item) =>
      this.matchesFixedAreaCodeFilters(item, query),
    );
    const sortedItems = sortByString(filteredItems, (item) => item.areaCode, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
    };
  }

  async getFixedAreaCode(fixedAreaCodeId: string): Promise<TelecomFixedAreaCodeDetail> {
    const readModel = await this.readTelecom();
    const fixedAreaCode = readModel.fixedAreaCodes.find((item) => item.id === fixedAreaCodeId);

    if (!fixedAreaCode) {
      throw new NotFoundException('Telecom fixed area code not found');
    }

    return this.buildDetail(fixedAreaCode, readModel);
  }

  async listMobilePrefixes(query: TelecomMobilePrefixListQuery): Promise<TelecomMobilePrefixList> {
    const readModel = await this.readTelecom();
    const filteredItems = readModel.mobilePrefixes.filter((item) =>
      this.matchesMobilePrefixFilters(item, query),
    );
    const sortedItems = sortByString(filteredItems, (item) => item.prefix, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
    };
  }

  async getMobilePrefix(mobilePrefixId: string): Promise<TelecomMobilePrefixDetail> {
    const readModel = await this.readTelecom();
    const mobilePrefix = readModel.mobilePrefixes.find((item) => item.id === mobilePrefixId);

    if (!mobilePrefix) {
      throw new NotFoundException('Telecom mobile prefix not found');
    }

    return this.buildDetail(mobilePrefix, readModel);
  }

  async listNumberRanges(query: TelecomNumberRangeListQuery): Promise<TelecomNumberRangeList> {
    const readModel = await this.readTelecom();
    const filteredItems = readModel.numberRanges.filter((item) =>
      this.matchesNumberRangeFilters(item, query),
    );
    const sortedItems = sortByString(filteredItems, (item) => item.id, query.order);
    const items = paginateOffsetItems(sortedItems, query);

    return {
      items,
      pagination: buildOffsetPagination(sortedItems.length, query, items.length),
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
    };
  }

  async getNumberRange(numberRangeId: string): Promise<TelecomNumberRangeDetail> {
    const readModel = await this.readTelecom();
    const numberRange = readModel.numberRanges.find((item) => item.id === numberRangeId);

    if (!numberRange) {
      throw new NotFoundException('Telecom number range not found');
    }

    return this.buildDetail(numberRange, readModel);
  }

  private async readTelecom(): Promise<TelecomReadModel> {
    const [
      countryNumberingPlansArtifact,
      operatorsArtifact,
      fixedAreaCodesArtifact,
      mobilePrefixesArtifact,
      numberRangesArtifact,
    ] = await Promise.all([
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TELECOM_DATASET_ID,
        artifactName: COUNTRY_NUMBERING_PLANS_ARTIFACT_NAME,
        schema: telecomCountryNumberingPlansArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TELECOM_DATASET_ID,
        artifactName: OPERATORS_ARTIFACT_NAME,
        schema: telecomOperatorsArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TELECOM_DATASET_ID,
        artifactName: FIXED_AREA_CODES_ARTIFACT_NAME,
        schema: telecomFixedAreaCodesArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TELECOM_DATASET_ID,
        artifactName: MOBILE_PREFIXES_ARTIFACT_NAME,
        schema: telecomMobilePrefixesArtifactSchema,
      }),
      this.localDatasetArtifactReaderService.readJsonArtifact({
        datasetId: TELECOM_DATASET_ID,
        artifactName: NUMBER_RANGES_ARTIFACT_NAME,
        schema: telecomNumberRangesArtifactSchema,
      }),
    ]);
    const manifest =
      countryNumberingPlansArtifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(TELECOM_DATASET_ID);

    return {
      countryNumberingPlans: countryNumberingPlansArtifact?.data ?? [],
      operators: operatorsArtifact?.data ?? [],
      fixedAreaCodes: fixedAreaCodesArtifact?.data ?? [],
      mobilePrefixes: mobilePrefixesArtifact?.data ?? [],
      numberRanges: numberRangesArtifact?.data ?? [],
      manifest,
    };
  }

  private buildDetail<
    TItem extends
      | TelecomCountryNumberingPlan
      | TelecomOperator
      | TelecomFixedAreaCode
      | TelecomMobilePrefix
      | TelecomNumberRange,
  >(item: TItem, readModel: TelecomReadModel) {
    return {
      item,
      dataset: buildTelecomDatasetContext(readModel.manifest),
      release: buildTelecomReleaseContext(readModel.manifest),
      sources: mapTelecomSources(readModel.manifest),
    };
  }

  private matchesCountryNumberingPlanFilters(
    item: TelecomCountryNumberingPlan,
    query: TelecomCountryNumberingPlanListQuery,
  ) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.countryCode && item.countryCode !== query.countryCode) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.countryCode,
        item.countryIso2,
        item.countryIso3,
        item.nationalPrefix,
        item.internationalPrefix,
        item.planScope,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }

  private matchesOperatorFilters(item: TelecomOperator, query: TelecomOperatorListQuery) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.operatorType && item.operatorType !== query.operatorType) {
      return false;
    }

    if (query.assignmentStatus && item.assignmentStatus !== query.assignmentStatus) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.name,
        item.operatorType,
        item.numberingRole,
        item.assignmentStatus,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }

  private matchesFixedAreaCodeFilters(
    item: TelecomFixedAreaCode,
    query: TelecomFixedAreaCodeListQuery,
  ) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.areaCode && item.areaCode !== query.areaCode) {
      return false;
    }

    if (query.dialingPrefix && item.dialingPrefix !== query.dialingPrefix) {
      return false;
    }

    if (query.operatorId && item.operatorId !== query.operatorId) {
      return false;
    }

    if (query.governorateId && !item.governorateIds.includes(query.governorateId)) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.name,
        item.areaCode,
        item.dialingPrefix,
        item.operatorId,
        item.governorateIds,
        item.subscriberNumberLength,
        item.nationalSignificantNumberLength,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }

  private matchesMobilePrefixFilters(
    item: TelecomMobilePrefix,
    query: TelecomMobilePrefixListQuery,
  ) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.prefix && item.prefix !== query.prefix) {
      return false;
    }

    if (query.dialingPrefix && item.dialingPrefix !== query.dialingPrefix) {
      return false;
    }

    if (query.operatorId && item.operatorId !== query.operatorId) {
      return false;
    }

    if (query.assignmentStatus && item.assignmentStatus !== query.assignmentStatus) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.prefix,
        item.dialingPrefix,
        item.operatorId,
        item.subscriberNumberLength,
        item.assignmentStatus,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }

  private matchesNumberRangeFilters(item: TelecomNumberRange, query: TelecomNumberRangeListQuery) {
    if (query.sourceStatus && item.sourceStatus !== query.sourceStatus) {
      return false;
    }

    if (query.rangeType && item.rangeType !== query.rangeType) {
      return false;
    }

    if (query.assignmentStatus && item.assignmentStatus !== query.assignmentStatus) {
      return false;
    }

    return matchesSearchValues(
      [
        item.id,
        item.name,
        item.rangeType,
        item.ranges,
        item.assignmentStatus,
        item.sourceIds,
        item.sourceReferences,
        item.sourceStatus,
        item.notes,
      ],
      query.q,
    );
  }
}
