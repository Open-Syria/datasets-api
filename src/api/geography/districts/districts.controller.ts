import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../../decorators/api-request-dto';
import { ApiPublic } from '../../../decorators/http-decorators';
import { districtDetailResponseExample, districtListResponseExample } from '../geography.examples';
import {
  type DistrictDetail,
  DistrictDetailDto,
  type DistrictList,
  DistrictListDto,
  type DistrictListQuery,
  DistrictListQueryDto,
  type DistrictParams,
  DistrictParamsDto,
  type DistrictSummary,
} from './districts.dto';
import { DistrictsService } from './districts.service';

type DistrictListResponse = ApiOffsetPaginatedResponse<
  DistrictSummary,
  Omit<DistrictList, 'items' | 'pagination'>
>;

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
  ): Promise<DistrictListResponse> {
    const result = await this.districtsService.listDistricts(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        count: result.count,
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.geography.districtsFetched',
      fallbackMessage: 'Districts fetched successfully',
    });
  }

  @Get(':districtId')
  @ApiParamDto(DistrictParamsDto)
  @ApiPublic({
    type: DistrictDetailDto,
    tags: ['Geography'],
    summary: 'Get district details',
    description: 'Returns one released district record with dataset release context and sources.',
    responseName: 'DistrictDetailResponse',
    example: districtDetailResponseExample,
  })
  async getDistrict(
    @Param(new ZodValidationPipe(DistrictParamsDto)) params: DistrictParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<DistrictDetail>> {
    return buildResponse({
      i18n,
      data: await this.districtsService.getDistrict(params.districtId),
      message: 'api.responses.geography.districtFetched',
      fallbackMessage: 'District fetched successfully',
    });
  }
}
