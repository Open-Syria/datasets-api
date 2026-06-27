import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiPublic } from '../../../decorators/http-decorators';
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
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for offset pagination.',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return.',
    example: 20,
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search term matched against ID, names, ISO code, and source status.',
    example: 'damascus',
  })
  @ApiQuery({
    name: 'order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order by English display name.',
    example: 'asc',
  })
  @ApiQuery({
    name: 'sourceStatus',
    required: false,
    enum: ['pending_release', 'seed', 'released', 'deprecated'],
    description: 'Filter records by source review or release status.',
    example: 'released',
  })
  @ApiPublic({
    type: GovernorateListDto,
    tags: ['Geography'],
    summary: 'List governorates',
    description:
      'Returns governorate records from the released geography dataset. The endpoint is available before the first data release and returns an empty list until a verified data-geography release is published.',
    responseName: 'GovernorateListResponse',
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
