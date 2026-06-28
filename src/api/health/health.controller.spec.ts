import { HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { I18nContext } from 'nestjs-i18n';
import { Environment } from '../../constants/app.constants';
import { HealthController } from './health.controller';
import type { HealthResponseData } from './health.dto';
import type { HealthService } from './health.service';

const readyHealth: HealthResponseData = {
  status: 'ok',
  app: {
    name: 'opensyria-datasets-api',
    environment: Environment.Test,
  },
  uptimeSeconds: 1,
  redis: {
    status: 'disabled',
    latencyMs: 0,
  },
  database: {
    status: 'up',
    required: true,
    latencyMs: 1,
  },
  datasetReleases: {
    status: 'loaded',
    required: true,
    count: 1,
  },
};

const notReadyHealth: HealthResponseData = {
  ...readyHealth,
  status: 'degraded',
  database: {
    status: 'down',
    required: true,
    latencyMs: 1,
    message: 'database unavailable',
  },
};

function createController(data: HealthResponseData, ready: boolean) {
  const healthService = {
    getReadiness: jest.fn().mockResolvedValue(data),
    isReady: jest.fn().mockReturnValue(ready),
  } as unknown as HealthService;
  const status = jest.fn().mockReturnThis();
  const reply = {
    status,
  } as unknown as FastifyReply;

  return {
    controller: new HealthController(healthService),
    reply,
    status,
  };
}

describe('HealthController', () => {
  it('returns HTTP 200 for ready dependencies', async () => {
    const { controller, reply, status } = createController(readyHealth, true);

    const response = await controller.getReadiness(undefined as unknown as I18nContext, reply);

    expect(status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(response).toMatchObject({
      success: true,
      status: HttpStatus.OK,
      data: {
        status: 'ok',
      },
    });
  });

  it('returns HTTP 503 when required dependencies are not ready', async () => {
    const { controller, reply, status } = createController(notReadyHealth, false);

    const response = await controller.getReadiness(undefined as unknown as I18nContext, reply);

    expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response).toMatchObject({
      success: true,
      status: HttpStatus.SERVICE_UNAVAILABLE,
      data: {
        status: 'degraded',
        database: {
          required: true,
          status: 'down',
        },
      },
    });
  });
});
