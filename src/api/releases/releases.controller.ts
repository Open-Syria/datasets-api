import { Controller, Get, Inject } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiPublic } from '../../decorators/http-decorators';
import { type ReleaseSummaryList, ReleaseSummaryListDto } from './releases.dto';
import { ReleasesService } from './releases.service';

@Controller('releases')
export class ReleasesController {
  constructor(
    @Inject(ReleasesService)
    private readonly releasesService: ReleasesService,
  ) {}

  @Get()
  @ApiPublic({
    type: ReleaseSummaryListDto,
    tags: ['Releases'],
    summary: 'List dataset releases',
    description:
      'Returns dataset release metadata, source repositories, planned manifest paths, and artifact information when published.',
    responseName: 'ReleaseSummaryListResponse',
  })
  async listReleases(@I18n() i18n: I18nContext): Promise<ApiResponse<ReleaseSummaryList>> {
    return buildResponse({
      i18n,
      data: await this.releasesService.listReleases(),
      message: 'api.responses.releases.listFetched',
      fallbackMessage: 'Releases fetched successfully',
    });
  }
}
