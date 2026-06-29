import { Controller, Get, Inject, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiOffsetPaginatedResponse } from '../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../common/helpers/build-offset-paginated-response';
import { ApiQueryDto } from '../../decorators/api-request-dto';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type ReleaseSummary,
  ReleaseSummaryDto,
  type ReleaseSummaryListQuery,
  ReleaseSummaryListQueryDto,
} from './releases.dto';
import { ReleasesService } from './releases.service';

type ReleaseSummaryListResponse = ApiOffsetPaginatedResponse<ReleaseSummary>;

@Controller('releases')
export class ReleasesController {
  constructor(
    @Inject(ReleasesService)
    private readonly releasesService: ReleasesService,
  ) {}

  @Get()
  @ApiQueryDto(ReleaseSummaryListQueryDto)
  @ApiPublic({
    isPaginated: true,
    type: ReleaseSummaryDto,
    tags: ['Releases'],
    summary: 'List dataset releases',
    description:
      'Returns dataset release metadata, source repositories, planned manifest paths, and artifact information when published.',
    responseName: 'ReleaseSummaryListResponse',
  })
  async listReleases(
    @Query(new ZodValidationPipe(ReleaseSummaryListQueryDto)) query: ReleaseSummaryListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<ReleaseSummaryListResponse> {
    const result = await this.releasesService.listReleases(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.totalRecords,
      options: query,
      message: 'api.responses.releases.listFetched',
      fallbackMessage: 'Releases fetched successfully',
    });
  }
}
