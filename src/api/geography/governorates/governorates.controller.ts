import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../../decorators/api-request-dto';
import { ApiPublic } from '../../../decorators/http-decorators';
import {
  governorateDetailResponseExample,
  governorateListResponseExample,
} from '../geography.examples';
import {
  type GovernorateDetail,
  GovernorateDetailDto,
  type GovernorateList,
  GovernorateListDto,
  type GovernorateListQuery,
  GovernorateListQueryDto,
  type GovernorateParams,
  GovernorateParamsDto,
  type GovernorateSummary,
} from './governorates.dto';
import { GovernoratesService } from './governorates.service';

type GovernorateListResponse = ApiOffsetPaginatedResponse<
  GovernorateSummary,
  Omit<GovernorateList, 'items' | 'pagination'>
>;

@Controller('geography/governorates')
export class GovernoratesController {
  constructor(
    @Inject(GovernoratesService)
    private readonly governoratesService: GovernoratesService,
  ) {}

  @Get()
  @ApiQueryDto(GovernorateListQueryDto)
  @ApiPublic({
    type: GovernorateListDto,
    tags: ['Geography'],
    summary: 'List governorates',
    description:
      'Returns governorate records from the released geography dataset. The endpoint is available before the first data release and returns an empty list until a verified data-geography release is published.',
    responseName: 'GovernorateListResponse',
    example: governorateListResponseExample,
  })
  async listGovernorates(
    @Query(new ZodValidationPipe(GovernorateListQueryDto)) query: GovernorateListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<GovernorateListResponse> {
    const result = await this.governoratesService.listGovernorates(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.geography.governoratesFetched',
      fallbackMessage: 'Governorates fetched successfully',
    });
  }

  @Get(':governorateId')
  @ApiParamDto(GovernorateParamsDto)
  @ApiPublic({
    type: GovernorateDetailDto,
    tags: ['Geography'],
    summary: 'Get governorate details',
    description:
      'Returns one released governorate record with its dataset release context and source attribution.',
    responseName: 'GovernorateDetailResponse',
    example: governorateDetailResponseExample,
  })
  async getGovernorate(
    @Param(new ZodValidationPipe(GovernorateParamsDto)) params: GovernorateParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<GovernorateDetail>> {
    return buildResponse({
      i18n,
      data: await this.governoratesService.getGovernorate(params.governorateId),
      message: 'api.responses.geography.governorateFetched',
      fallbackMessage: 'Governorate fetched successfully',
    });
  }
}
