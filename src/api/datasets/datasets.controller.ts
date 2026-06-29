import { Controller, Get, Inject, Query } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import { ZodValidationPipe } from 'nestjs-zod';
import type { ApiOffsetPaginatedResponse } from '../../common/dto/offset-pagination/offset-paginated-response.dto';
import { buildOffsetPaginatedResponse } from '../../common/helpers/build-offset-paginated-response';
import { ApiQueryDto } from '../../decorators/api-request-dto';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type DatasetSummary,
  DatasetSummaryDto,
  type DatasetSummaryListQuery,
  DatasetSummaryListQueryDto,
} from './datasets.dto';
import { DatasetsService } from './datasets.service';

type DatasetSummaryListResponse = ApiOffsetPaginatedResponse<DatasetSummary>;

@Controller('datasets')
export class DatasetsController {
  constructor(
    @Inject(DatasetsService)
    private readonly datasetsService: DatasetsService,
  ) {}

  @Get()
  @ApiQueryDto(DatasetSummaryListQueryDto)
  @ApiPublic({
    isPaginated: true,
    type: DatasetSummaryDto,
    tags: ['Dataset Discovery'],
    summary: 'List available datasets',
    description:
      'Returns OpenSyria dataset metadata, repository names, release status, and currently available public API paths.',
    responseName: 'DatasetSummaryListResponse',
  })
  async listDatasets(
    @Query(new ZodValidationPipe(DatasetSummaryListQueryDto)) query: DatasetSummaryListQuery,
    @I18n() i18n: I18nContext,
  ): Promise<DatasetSummaryListResponse> {
    const result = await this.datasetsService.listDatasets(query);

    return buildOffsetPaginatedResponse({
      i18n,
      items: result.items,
      totalRecords: result.totalRecords,
      options: query,
      message: 'api.responses.datasets.listFetched',
      fallbackMessage: 'Datasets fetched successfully',
    });
  }
}
