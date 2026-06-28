import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiQueryDto } from '../../../decorators/api-query-dto';
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
} from './governorates.dto';
import { GovernoratesService } from './governorates.service';

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
  ): Promise<ApiResponse<GovernorateList>> {
    return buildResponse({
      i18n,
      data: await this.governoratesService.listGovernorates(query),
      message: 'api.responses.geography.governoratesFetched',
      fallbackMessage: 'Governorates fetched successfully',
    });
  }

  @Get(':governorateId')
  @ApiParam({
    name: 'governorateId',
    description: 'Stable OpenSyria governorate ID.',
    example: 'sy-damascus',
  })
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
    @Param('governorateId') governorateId: string,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<GovernorateDetail>> {
    return buildResponse({
      i18n,
      data: await this.governoratesService.getGovernorate(governorateId),
      message: 'api.responses.geography.governorateFetched',
      fallbackMessage: 'Governorate fetched successfully',
    });
  }
}
