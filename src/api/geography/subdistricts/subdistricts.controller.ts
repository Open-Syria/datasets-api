import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiQueryDto } from '../../../decorators/api-query-dto';
import { ApiPublic } from '../../../decorators/http-decorators';
import {
  subdistrictDetailResponseExample,
  subdistrictListResponseExample,
} from '../geography.examples';
import {
  type SubdistrictDetail,
  SubdistrictDetailDto,
  type SubdistrictList,
  SubdistrictListDto,
  type SubdistrictListQuery,
  SubdistrictListQueryDto,
} from './subdistricts.dto';
import { SubdistrictsService } from './subdistricts.service';

@Controller('geography/subdistricts')
export class SubdistrictsController {
  constructor(
    @Inject(SubdistrictsService)
    private readonly subdistrictsService: SubdistrictsService,
  ) {}

  @Get()
  @ApiQueryDto(SubdistrictListQueryDto)
  @ApiPublic({
    type: SubdistrictListDto,
    tags: ['Geography'],
    summary: 'List subdistricts',
    description:
      'Returns subdistrict records from the released geography dataset. Results can be filtered by governorate ID or district ID for nested administrative views.',
    responseName: 'SubdistrictListResponse',
    example: subdistrictListResponseExample,
  })
  async listSubdistricts(
    @Query(new ZodValidationPipe(SubdistrictListQueryDto)) query: SubdistrictListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<SubdistrictList>> {
    return buildResponse({
      i18n,
      data: await this.subdistrictsService.listSubdistricts(query),
      message: 'api.responses.geography.subdistrictsFetched',
      fallbackMessage: 'Subdistricts fetched successfully',
    });
  }

  @Get(':subdistrictId')
  @ApiParam({
    name: 'subdistrictId',
    description: 'Stable OpenSyria subdistrict ID.',
    example: 'sy-al-hasakah-al-hasakah-al-hasakeh',
  })
  @ApiPublic({
    type: SubdistrictDetailDto,
    tags: ['Geography'],
    summary: 'Get subdistrict details',
    description:
      'Returns one released subdistrict record with dataset release context and sources.',
    responseName: 'SubdistrictDetailResponse',
    example: subdistrictDetailResponseExample,
  })
  async getSubdistrict(
    @Param('subdistrictId') subdistrictId: string,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<SubdistrictDetail>> {
    return buildResponse({
      i18n,
      data: await this.subdistrictsService.getSubdistrict(subdistrictId),
      message: 'api.responses.geography.subdistrictFetched',
      fallbackMessage: 'Subdistrict fetched successfully',
    });
  }
}
