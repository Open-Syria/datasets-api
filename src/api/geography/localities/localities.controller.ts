import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../../decorators/api-request-dto';
import { ApiPublic } from '../../../decorators/http-decorators';
import { localityDetailResponseExample, localityListResponseExample } from '../geography.examples';
import {
  type LocalityDetail,
  LocalityDetailDto,
  type LocalityList,
  LocalityListDto,
  type LocalityListQuery,
  LocalityListQueryDto,
  type LocalityParams,
  LocalityParamsDto,
  type LocalitySummary,
} from './localities.dto';
import { LocalitiesService } from './localities.service';

type LocalityListResponse = ApiOffsetPaginatedResponse<
  LocalitySummary,
  Omit<LocalityList, 'items' | 'pagination'>
>;

@Controller('geography/localities')
export class LocalitiesController {
  constructor(
    @Inject(LocalitiesService)
    private readonly localitiesService: LocalitiesService,
  ) {}

  @Get()
  @ApiQueryDto(LocalityListQueryDto)
  @ApiPublic({
    type: LocalityListDto,
    tags: ['Geography'],
    summary: 'List localities',
    description:
      'Returns compact locality records from the released geography dataset. Results can be filtered by administrative parent IDs, locality kind, and source status.',
    responseName: 'LocalityListResponse',
    example: localityListResponseExample,
  })
  async listLocalities(
    @Query(new ZodValidationPipe(LocalityListQueryDto)) query: LocalityListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<LocalityListResponse> {
    const result = await this.localitiesService.listLocalities(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.geography.localitiesFetched',
      fallbackMessage: 'Localities fetched successfully',
    });
  }

  @Get(':localityId')
  @ApiParamDto(LocalityParamsDto)
  @ApiPublic({
    type: LocalityDetailDto,
    tags: ['Geography'],
    summary: 'Get locality details',
    description:
      'Returns one released locality record with aliases, external IDs, source IDs, dataset release context, and sources.',
    responseName: 'LocalityDetailResponse',
    example: localityDetailResponseExample,
  })
  async getLocality(
    @Param(new ZodValidationPipe(LocalityParamsDto)) params: LocalityParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<LocalityDetail>> {
    return buildResponse({
      i18n,
      data: await this.localitiesService.getLocality(params.localityId),
      message: 'api.responses.geography.localityFetched',
      fallbackMessage: 'Locality fetched successfully',
    });
  }
}
