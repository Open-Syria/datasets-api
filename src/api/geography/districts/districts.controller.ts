import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiQueryDto } from '../../../decorators/api-query-dto';
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
  @ApiQueryDto(DistrictListQueryDto)
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
