import { Controller, Get, Inject } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiPublic } from '../../decorators/http-decorators';
import { type DatasetSummaryList, DatasetSummaryListDto } from './datasets.dto';
import { DatasetsService } from './datasets.service';

@Controller('datasets')
export class DatasetsController {
  constructor(
    @Inject(DatasetsService)
    private readonly datasetsService: DatasetsService,
  ) {}

  @Get()
  @ApiPublic({
    type: DatasetSummaryListDto,
    tags: ['Dataset Discovery'],
    summary: 'List available datasets',
    description:
      'Returns OpenSyria dataset metadata, repository names, release status, and planned public API paths.',
    responseName: 'DatasetSummaryListResponse',
  })
  async listDatasets(@I18n() i18n: I18nContext): Promise<ApiResponse<DatasetSummaryList>> {
    return buildResponse({
      i18n,
      data: await this.datasetsService.listDatasets(),
      message: 'api.responses.datasets.listFetched',
      fallbackMessage: 'Datasets fetched successfully',
    });
  }
}
