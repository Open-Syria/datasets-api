import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiParam } from '@nestjs/swagger';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiQueryDto } from '../../../decorators/api-query-dto';
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
