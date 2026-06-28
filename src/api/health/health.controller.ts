import { Controller, Get, HttpStatus, Inject, Res, VERSION_NEUTRAL } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { I18n, type I18nContext } from 'nestjs-i18n';
import type { ApiResponse } from '../../common/dto/api-response.dto';
import { buildResponse } from '../../common/helpers/build-response';
import { ApiPublic } from '../../decorators/http-decorators';
import {
  type HealthResponseData,
  HealthResponseDataDto,
  type LivenessResponseData,
  LivenessResponseDataDto,
} from './health.dto';
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
      'Returns the public API health status, current environment, uptime, Redis availability, database read-model availability, and dataset release availability.',
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

  @Get('live')
  @ApiPublic({
    type: LivenessResponseDataDto,
    tags: ['Health'],
    summary: 'Get liveness health',
    description: 'Returns whether the API process is alive without checking external services.',
    responseName: 'LivenessResponse',
  })
  getLiveness(@I18n() i18n: I18nContext): ApiResponse<LivenessResponseData> {
    return buildResponse({
      i18n,
      data: this.healthService.getLiveness(),
      message: 'api.responses.health.live',
      fallbackMessage: 'API liveness returned successfully',
    });
  }

  @Get('ready')
  @ApiPublic({
    type: HealthResponseDataDto,
    tags: ['Health'],
    summary: 'Get readiness health',
    description:
      'Returns whether the API runtime dependencies, database read model, and dataset releases are ready.',
    responseName: 'ReadinessResponse',
  })
  async getReadiness(
    @I18n() i18n: I18nContext,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<ApiResponse<HealthResponseData>> {
    const data = await this.healthService.getReadiness();
    const status = this.healthService.isReady(data)
      ? HttpStatus.OK
      : HttpStatus.SERVICE_UNAVAILABLE;

    reply.status(status);

    return buildResponse({
      i18n,
      data,
      status,
      message: 'api.responses.health.ready',
      fallbackMessage: 'API readiness returned successfully',
    });
  }
}
