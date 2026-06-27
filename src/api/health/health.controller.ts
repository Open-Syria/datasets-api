import { Controller, Get, Inject, VERSION_NEUTRAL } from '@nestjs/common';
import { I18n, type I18nContext } from 'nestjs-i18n';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiPublic } from '../../decorators/http-decorators';
import { type HealthResponseData, HealthResponseDataDto } from './health.dto';
import { HealthService } from './health.service';

@Controller({
  path: 'health',
  version: VERSION_NEUTRAL,
})
export class HealthController {
  constructor(
    @Inject(HealthService)
    private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiPublic({
    type: HealthResponseDataDto,
    tags: ['Health'],
    summary: 'Get API health',
    description:
      'Returns the public API health status, current environment, uptime, and Redis availability.',
    responseName: 'HealthResponse',
  })
  async getHealth(@I18n() i18n: I18nContext): Promise<ApiResponse<HealthResponseData>> {
    const data = await this.healthService.getHealth();

    return buildResponse({
      i18n,
      data,
      message: 'api.responses.health.ok',
      fallbackMessage: 'API health returned successfully',
    });
  }
}
