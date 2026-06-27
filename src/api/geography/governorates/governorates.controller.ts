import { Controller, Get, Inject } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import type { ApiResponse } from '../../../common/dto/api-response.dto';
import { buildResponse } from '../../../common/helpers/build-response';
import { ApiPublic } from '../../../decorators/http-decorators';
import { type GovernorateList, GovernorateListDto } from './governorates.dto';
import { GovernoratesService } from './governorates.service';

@Controller('geography/governorates')
export class GovernoratesController {
  constructor(
    @Inject(GovernoratesService)
    private readonly governoratesService: GovernoratesService,
  ) {}

  @Get()
  @ApiPublic({
    type: GovernorateListDto,
    tags: ['Geography'],
    summary: 'List governorates',
    description:
      'Returns governorate records from the released geography dataset. The endpoint is available before the first data release and returns an empty list until a verified data-geography release is published.',
    responseName: 'GovernorateListResponse',
  })
  listGovernorates(@I18n() i18n: I18nContext): ApiResponse<GovernorateList> {
    return buildResponse({
      i18n,
      data: this.governoratesService.listGovernorates(),
      message: 'api.responses.geography.governoratesFetched',
      fallbackMessage: 'Governorates fetched successfully',
    });
  }
}
