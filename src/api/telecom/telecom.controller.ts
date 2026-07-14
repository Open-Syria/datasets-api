import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../decorators/api-request-dto';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type TelecomCountryNumberingPlan,
  type TelecomCountryNumberingPlanDetail,
  TelecomCountryNumberingPlanDetailDto,
  type TelecomCountryNumberingPlanList,
  TelecomCountryNumberingPlanListDto,
  type TelecomCountryNumberingPlanListQuery,
  TelecomCountryNumberingPlanListQueryDto,
  type TelecomCountryNumberingPlanParams,
  TelecomCountryNumberingPlanParamsDto,
  type TelecomFixedAreaCode,
  type TelecomFixedAreaCodeDetail,
  TelecomFixedAreaCodeDetailDto,
  type TelecomFixedAreaCodeList,
  TelecomFixedAreaCodeListDto,
  type TelecomFixedAreaCodeListQuery,
  TelecomFixedAreaCodeListQueryDto,
  type TelecomFixedAreaCodeParams,
  TelecomFixedAreaCodeParamsDto,
  type TelecomMobilePrefix,
  type TelecomMobilePrefixDetail,
  TelecomMobilePrefixDetailDto,
  type TelecomMobilePrefixList,
  TelecomMobilePrefixListDto,
  type TelecomMobilePrefixListQuery,
  TelecomMobilePrefixListQueryDto,
  type TelecomMobilePrefixParams,
  TelecomMobilePrefixParamsDto,
  type TelecomNumberRange,
  type TelecomNumberRangeDetail,
  TelecomNumberRangeDetailDto,
  type TelecomNumberRangeList,
  TelecomNumberRangeListDto,
  type TelecomNumberRangeListQuery,
  TelecomNumberRangeListQueryDto,
  type TelecomNumberRangeParams,
  TelecomNumberRangeParamsDto,
  type TelecomOperator,
  type TelecomOperatorDetail,
  TelecomOperatorDetailDto,
  type TelecomOperatorList,
  TelecomOperatorListDto,
  type TelecomOperatorListQuery,
  TelecomOperatorListQueryDto,
  type TelecomOperatorParams,
  TelecomOperatorParamsDto,
} from './telecom.dto';
import {
  telecomCountryNumberingPlanDetailResponseExample,
  telecomCountryNumberingPlanListResponseExample,
  telecomFixedAreaCodeDetailResponseExample,
  telecomFixedAreaCodeListResponseExample,
  telecomMobilePrefixDetailResponseExample,
  telecomMobilePrefixListResponseExample,
  telecomNumberRangeDetailResponseExample,
  telecomNumberRangeListResponseExample,
  telecomOperatorDetailResponseExample,
  telecomOperatorListResponseExample,
} from './telecom.examples';
import { TelecomService } from './telecom.service';

type TelecomCountryNumberingPlanListResponse = ApiOffsetPaginatedResponse<
  TelecomCountryNumberingPlan,
  Omit<TelecomCountryNumberingPlanList, 'items' | 'pagination'>
>;
type TelecomOperatorListResponse = ApiOffsetPaginatedResponse<
  TelecomOperator,
  Omit<TelecomOperatorList, 'items' | 'pagination'>
>;
type TelecomFixedAreaCodeListResponse = ApiOffsetPaginatedResponse<
  TelecomFixedAreaCode,
  Omit<TelecomFixedAreaCodeList, 'items' | 'pagination'>
>;
type TelecomMobilePrefixListResponse = ApiOffsetPaginatedResponse<
  TelecomMobilePrefix,
  Omit<TelecomMobilePrefixList, 'items' | 'pagination'>
>;
type TelecomNumberRangeListResponse = ApiOffsetPaginatedResponse<
  TelecomNumberRange,
  Omit<TelecomNumberRangeList, 'items' | 'pagination'>
>;

@Controller('telecom')
export class TelecomController {
  constructor(
    @Inject(TelecomService)
    private readonly telecomService: TelecomService,
  ) {}

  @Get('country-numbering-plans')
  @ApiQueryDto(TelecomCountryNumberingPlanListQueryDto)
  @ApiPublic({
    type: TelecomCountryNumberingPlanListDto,
    tags: ['Telecom'],
    summary: 'List telecom country numbering plans',
    description:
      'Returns public country-level telecom numbering metadata with source attribution, including country code, national prefix, plan scope, and review status. The dataset does not include subscriber numbers or live network status.',
    responseName: 'TelecomCountryNumberingPlanListResponse',
    example: telecomCountryNumberingPlanListResponseExample,
  })
  async listCountryNumberingPlans(
    @Query(new ZodValidationPipe(TelecomCountryNumberingPlanListQueryDto))
    query: TelecomCountryNumberingPlanListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TelecomCountryNumberingPlanListResponse> {
    const result = await this.telecomService.listCountryNumberingPlans(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.telecom.countryNumberingPlansFetched',
      fallbackMessage: 'Telecom country numbering plans fetched successfully',
    });
  }

  @Get('country-numbering-plans/:countryNumberingPlanId')
  @ApiParamDto(TelecomCountryNumberingPlanParamsDto)
  @ApiPublic({
    type: TelecomCountryNumberingPlanDetailDto,
    tags: ['Telecom'],
    summary: 'Get telecom country numbering plan details',
    description:
      'Returns one country-level telecom numbering plan record with release context and source attribution.',
    responseName: 'TelecomCountryNumberingPlanDetailResponse',
    example: telecomCountryNumberingPlanDetailResponseExample,
  })
  async getCountryNumberingPlan(
    @Param(new ZodValidationPipe(TelecomCountryNumberingPlanParamsDto))
    params: TelecomCountryNumberingPlanParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TelecomCountryNumberingPlanDetail>> {
    return buildResponse({
      i18n,
      data: await this.telecomService.getCountryNumberingPlan(params.countryNumberingPlanId),
      message: 'api.responses.telecom.countryNumberingPlanFetched',
      fallbackMessage: 'Telecom country numbering plan fetched successfully',
    });
  }

  @Get('operators')
  @ApiQueryDto(TelecomOperatorListQueryDto)
  @ApiPublic({
    type: TelecomOperatorListDto,
    tags: ['Telecom'],
    summary: 'List telecom operators',
    description:
      'Returns public telecom operator/reference entity records used for numbering-plan attribution, including fixed and mobile numbering roles.',
    responseName: 'TelecomOperatorListResponse',
    example: telecomOperatorListResponseExample,
  })
  async listOperators(
    @Query(new ZodValidationPipe(TelecomOperatorListQueryDto)) query: TelecomOperatorListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TelecomOperatorListResponse> {
    const result = await this.telecomService.listOperators(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.telecom.operatorsFetched',
      fallbackMessage: 'Telecom operators fetched successfully',
    });
  }

  @Get('operators/:operatorId')
  @ApiParamDto(TelecomOperatorParamsDto)
  @ApiPublic({
    type: TelecomOperatorDetailDto,
    tags: ['Telecom'],
    summary: 'Get telecom operator details',
    description:
      'Returns one public telecom operator/reference entity with release context and source attribution.',
    responseName: 'TelecomOperatorDetailResponse',
    example: telecomOperatorDetailResponseExample,
  })
  async getOperator(
    @Param(new ZodValidationPipe(TelecomOperatorParamsDto)) params: TelecomOperatorParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TelecomOperatorDetail>> {
    return buildResponse({
      i18n,
      data: await this.telecomService.getOperator(params.operatorId),
      message: 'api.responses.telecom.operatorFetched',
      fallbackMessage: 'Telecom operator fetched successfully',
    });
  }

  @Get('fixed-area-codes')
  @ApiQueryDto(TelecomFixedAreaCodeListQueryDto)
  @ApiPublic({
    type: TelecomFixedAreaCodeListDto,
    tags: ['Telecom'],
    summary: 'List fixed area codes',
    description:
      'Returns public fixed area-code records with dialing prefixes, subscriber number lengths, OpenSyria governorate links, and source attribution.',
    responseName: 'TelecomFixedAreaCodeListResponse',
    example: telecomFixedAreaCodeListResponseExample,
  })
  async listFixedAreaCodes(
    @Query(new ZodValidationPipe(TelecomFixedAreaCodeListQueryDto))
    query: TelecomFixedAreaCodeListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TelecomFixedAreaCodeListResponse> {
    const result = await this.telecomService.listFixedAreaCodes(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.telecom.fixedAreaCodesFetched',
      fallbackMessage: 'Telecom fixed area codes fetched successfully',
    });
  }

  @Get('fixed-area-codes/:fixedAreaCodeId')
  @ApiParamDto(TelecomFixedAreaCodeParamsDto)
  @ApiPublic({
    type: TelecomFixedAreaCodeDetailDto,
    tags: ['Telecom'],
    summary: 'Get fixed area code details',
    description:
      'Returns one public fixed area-code record with release context and source attribution.',
    responseName: 'TelecomFixedAreaCodeDetailResponse',
    example: telecomFixedAreaCodeDetailResponseExample,
  })
  async getFixedAreaCode(
    @Param(new ZodValidationPipe(TelecomFixedAreaCodeParamsDto))
    params: TelecomFixedAreaCodeParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TelecomFixedAreaCodeDetail>> {
    return buildResponse({
      i18n,
      data: await this.telecomService.getFixedAreaCode(params.fixedAreaCodeId),
      message: 'api.responses.telecom.fixedAreaCodeFetched',
      fallbackMessage: 'Telecom fixed area code fetched successfully',
    });
  }

  @Get('mobile-prefixes')
  @ApiQueryDto(TelecomMobilePrefixListQueryDto)
  @ApiPublic({
    type: TelecomMobilePrefixListDto,
    tags: ['Telecom'],
    summary: 'List mobile prefixes',
    description:
      'Returns public mobile prefix assignment records with dialing prefixes, operator IDs, subscriber number lengths, and source attribution.',
    responseName: 'TelecomMobilePrefixListResponse',
    example: telecomMobilePrefixListResponseExample,
  })
  async listMobilePrefixes(
    @Query(new ZodValidationPipe(TelecomMobilePrefixListQueryDto))
    query: TelecomMobilePrefixListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TelecomMobilePrefixListResponse> {
    const result = await this.telecomService.listMobilePrefixes(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.telecom.mobilePrefixesFetched',
      fallbackMessage: 'Telecom mobile prefixes fetched successfully',
    });
  }

  @Get('mobile-prefixes/:mobilePrefixId')
  @ApiParamDto(TelecomMobilePrefixParamsDto)
  @ApiPublic({
    type: TelecomMobilePrefixDetailDto,
    tags: ['Telecom'],
    summary: 'Get mobile prefix details',
    description:
      'Returns one public mobile prefix assignment record with release context and source attribution.',
    responseName: 'TelecomMobilePrefixDetailResponse',
    example: telecomMobilePrefixDetailResponseExample,
  })
  async getMobilePrefix(
    @Param(new ZodValidationPipe(TelecomMobilePrefixParamsDto))
    params: TelecomMobilePrefixParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TelecomMobilePrefixDetail>> {
    return buildResponse({
      i18n,
      data: await this.telecomService.getMobilePrefix(params.mobilePrefixId),
      message: 'api.responses.telecom.mobilePrefixFetched',
      fallbackMessage: 'Telecom mobile prefix fetched successfully',
    });
  }

  @Get('number-ranges')
  @ApiQueryDto(TelecomNumberRangeListQueryDto)
  @ApiPublic({
    type: TelecomNumberRangeListDto,
    tags: ['Telecom'],
    summary: 'List public numbering ranges',
    description:
      'Returns public non-subscriber numbering range metadata such as reserved prefixes, unused ranges, short-number ranges, and private numbering ranges.',
    responseName: 'TelecomNumberRangeListResponse',
    example: telecomNumberRangeListResponseExample,
  })
  async listNumberRanges(
    @Query(new ZodValidationPipe(TelecomNumberRangeListQueryDto))
    query: TelecomNumberRangeListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<TelecomNumberRangeListResponse> {
    const result = await this.telecomService.listNumberRanges(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.telecom.numberRangesFetched',
      fallbackMessage: 'Telecom number ranges fetched successfully',
    });
  }

  @Get('number-ranges/:numberRangeId')
  @ApiParamDto(TelecomNumberRangeParamsDto)
  @ApiPublic({
    type: TelecomNumberRangeDetailDto,
    tags: ['Telecom'],
    summary: 'Get public numbering range details',
    description:
      'Returns one public numbering range record with release context and source attribution.',
    responseName: 'TelecomNumberRangeDetailResponse',
    example: telecomNumberRangeDetailResponseExample,
  })
  async getNumberRange(
    @Param(new ZodValidationPipe(TelecomNumberRangeParamsDto))
    params: TelecomNumberRangeParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<TelecomNumberRangeDetail>> {
    return buildResponse({
      i18n,
      data: await this.telecomService.getNumberRange(params.numberRangeId),
      message: 'api.responses.telecom.numberRangeFetched',
      fallbackMessage: 'Telecom number range fetched successfully',
    });
  }
}
