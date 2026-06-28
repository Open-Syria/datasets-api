import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
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
    description:
      'Search term matched against ID, names, governorate ID, district ID, and source status.',
    example: 'hasakeh',
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
    description: 'Filter subdistricts by stable OpenSyria governorate ID.',
    example: 'sy-al-hasakah',
  })
  @ApiQuery({
    name: 'districtId',
    required: false,
    description: 'Filter subdistricts by stable OpenSyria district ID.',
    example: 'sy-al-hasakah-al-hasakah',
  })
  @ApiQuery({
    name: 'sourceStatus',
    required: false,
    enum: ['pending_release', 'seed', 'released', 'deprecated'],
    description: 'Filter records by source review or release status.',
    example: 'released',
  })
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
