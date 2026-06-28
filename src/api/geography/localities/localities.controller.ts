import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiPublic } from '../../../decorators/http-decorators';
import { localityDetailResponseExample, localityListResponseExample } from '../geography.examples';
import {
  type LocalityDetail,
  LocalityDetailDto,
  type LocalityList,
  LocalityListDto,
  type LocalityListQuery,
  LocalityListQueryDto,
} from './localities.dto';
import { LocalitiesService } from './localities.service';

@Controller('geography/localities')
export class LocalitiesController {
  constructor(
    @Inject(LocalitiesService)
    private readonly localitiesService: LocalitiesService,
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
      'Search term matched against IDs, names, aliases, external IDs, source IDs, kind, and source status.',
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
    description: 'Filter localities by stable OpenSyria governorate ID.',
    example: 'sy-al-hasakah',
  })
  @ApiQuery({
    name: 'districtId',
    required: false,
    description: 'Filter localities by stable OpenSyria district ID.',
    example: 'sy-al-hasakah-al-hasakah',
  })
  @ApiQuery({
    name: 'subdistrictId',
    required: false,
    description: 'Filter localities by stable OpenSyria subdistrict ID.',
    example: 'sy-al-hasakah-al-hasakah-al-hasakeh',
  })
  @ApiQuery({
    name: 'kind',
    required: false,
    enum: ['city', 'town', 'locality'],
    description: 'Filter records by locality kind.',
    example: 'city',
  })
  @ApiQuery({
    name: 'sourceStatus',
    required: false,
    enum: ['pending_release', 'seed', 'released', 'deprecated'],
    description: 'Filter records by source review or release status.',
    example: 'released',
  })
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
  ): Promise<ApiResponse<LocalityList>> {
    return buildResponse({
      i18n,
      data: await this.localitiesService.listLocalities(query),
      message: 'api.responses.geography.localitiesFetched',
      fallbackMessage: 'Localities fetched successfully',
    });
  }

  @Get(':localityId')
  @ApiParam({
    name: 'localityId',
    description: 'Stable OpenSyria locality ID.',
    example: 'sy-al-hasakah-al-hasakah-al-hasakeh-abiad',
  })
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
    @Param('localityId') localityId: string,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<LocalityDetail>> {
    return buildResponse({
      i18n,
      data: await this.localitiesService.getLocality(localityId),
      message: 'api.responses.geography.localityFetched',
      fallbackMessage: 'Locality fetched successfully',
    });
  }
}
