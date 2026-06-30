import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import type { ApiOffsetPaginatedResponse } from '../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../common/helpers/build-offset-paginated-response';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiParamDto, ApiQueryDto } from '../../decorators/api-request-dto';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type UniversityDetail,
  UniversityDetailDto,
  type UniversityList,
  UniversityListDto,
  type UniversityListQuery,
  UniversityListQueryDto,
  type UniversityParams,
  UniversityParamsDto,
  type UniversitySummary,
} from './universities.dto';
import {
  universityDetailResponseExample,
  universityListResponseExample,
} from './universities.examples';
import { UniversitiesService } from './universities.service';

type UniversityListResponse = ApiOffsetPaginatedResponse<
  UniversitySummary,
  Omit<UniversityList, 'items' | 'pagination'>
>;

@Controller('universities')
export class UniversitiesController {
  constructor(
    @Inject(UniversitiesService)
    private readonly universitiesService: UniversitiesService,
  ) {}

  @Get()
  @ApiQueryDto(UniversityListQueryDto)
  @ApiPublic({
    type: UniversityListDto,
    tags: ['Universities'],
    summary: 'List universities',
    description:
      'Returns public university profile records from the released universities dataset, including institution identity, location, logo variants, and source-backed ranking snapshots when available.',
    responseName: 'UniversityListResponse',
    example: universityListResponseExample,
  })
  async listUniversities(
    @Query(new ZodValidationPipe(UniversityListQueryDto)) query: UniversityListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<UniversityListResponse> {
    const result = await this.universitiesService.listUniversities(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.pagination.totalRecords,
      options: query,
      extraData: {
        dataset: result.dataset,
        release: result.release,
      },
      message: 'api.responses.universities.listFetched',
      fallbackMessage: 'Universities fetched successfully',
    });
  }

  @Get(':universityId')
  @ApiParamDto(UniversityParamsDto)
  @ApiPublic({
    type: UniversityDetailDto,
    tags: ['Universities'],
    summary: 'Get university details',
    description:
      'Returns one released university profile with logo variants, ranking snapshots, dataset release context, and source attribution.',
    responseName: 'UniversityDetailResponse',
    example: universityDetailResponseExample,
  })
  async getUniversity(
    @Param(new ZodValidationPipe(UniversityParamsDto)) params: UniversityParams,
    @I18n() i18n: I18nContext,
  ): Promise<ApiResponse<UniversityDetail>> {
    return buildResponse({
      i18n,
      data: await this.universitiesService.getUniversity(params.universityId),
      message: 'api.responses.universities.detailFetched',
      fallbackMessage: 'University fetched successfully',
    });
  }
}
