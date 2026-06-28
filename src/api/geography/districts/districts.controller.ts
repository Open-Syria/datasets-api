import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiPublic } from '../../../decorators/http-decorators';
import { districtDetailResponseExample, districtListResponseExample } from '../geography.examples';
import {
  type DistrictDetail,
  DistrictDetailDto,
  type DistrictList,
  DistrictListDto,
  type DistrictListQuery,
  DistrictListQueryDto,
} from './districts.dto';
import { DistrictsService } from './districts.service';

@Controller('geography/districts')
export class DistrictsController {
  constructor(
    @Inject(DistrictsService)
    private readonly districtsService: DistrictsService,
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
    description: 'Search term matched against ID, names, governorate ID, and source status.',
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
    name: 'governorateId',
    required: false,
    description: 'Filter districts by stable OpenSyria governorate ID.',
    example: 'sy-damascus',
  })
  @ApiQuery({
    name: 'sourceStatus',
    required: false,
    enum: ['pending_release', 'seed', 'released', 'deprecated'],
    description: 'Filter records by source review or release status.',
    example: 'released',
  })
  @ApiPublic({
    type: DistrictListDto,
    tags: ['Geography'],
    summary: 'List districts',
    description:
      'Returns district records from the released geography dataset. Results can be filtered by governorate ID for nested administrative views.',
    responseName: 'DistrictListResponse',
    example: districtListResponseExample,
  })
  async listDistricts(
    @Query(new ZodValidationPipe(DistrictListQueryDto)) query: DistrictListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<DistrictList>> {
    return buildResponse({
      i18n,
      data: await this.districtsService.listDistricts(query),
      message: 'api.responses.geography.districtsFetched',
      fallbackMessage: 'Districts fetched successfully',
    });
  }

  @Get(':districtId')
  @ApiParam({
    name: 'districtId',
    description: 'Stable OpenSyria district ID.',
    example: 'sy-damascus-damascus',
  })
  @ApiPublic({
    type: DistrictDetailDto,
    tags: ['Geography'],
    summary: 'Get district details',
    description: 'Returns one released district record with dataset release context and sources.',
    responseName: 'DistrictDetailResponse',
    example: districtDetailResponseExample,
  })
  async getDistrict(
    @Param('districtId') districtId: string,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<DistrictDetail>> {
    return buildResponse({
      i18n,
      data: await this.districtsService.getDistrict(districtId),
      message: 'api.responses.geography.districtFetched',
      fallbackMessage: 'District fetched successfully',
    });
  }
}
