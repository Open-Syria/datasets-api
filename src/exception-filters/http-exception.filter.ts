import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { FastifyReply } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import type { GlobalConfig } from '../config/config.type';
import { Environment } from '../constants/app.constants';
import { translateApiMessage } from '../i18n/translation-key.utils';
import { getZodValidationDetails } from './zod-error-details';

type ExceptionResponseBody = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

function isObjectResponse(value: unknown): value is ExceptionResponseBody {
  return typeof value === 'object' && value !== null;
}

@Catch(HttpException)
@Injectable()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalHttpExceptionFilter.name);

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService<GlobalConfig>,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const reply = context.getResponse<FastifyReply>();
    const i18n = I18nContext.current(host);
    const isProduction =
      this.configService.get('app.nodeEnv', { infer: true }) === Environment.Production;

    if (reply.sent) {
      this.logger.error(
        `Exception caught after reply was already sent: ${exception.message}`,
        exception.stack,
      );
      return;
    }

    let status = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    let error = exception.name;
    let message = translateApiMessage(
      i18n,
      'api.errors.internalServerError',
      'Internal server error',
    );
    let details: unknown;

    if (exception instanceof ZodValidationException) {
      status = HttpStatus.BAD_REQUEST;
      error = 'ValidationError';
      message = translateApiMessage(i18n, 'api.errors.validationFailed', 'Validation failed');
      details = getZodValidationDetails(exception.getZodError());
    } else if (exception instanceof ZodSerializationException) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = 'SerializationError';
      message = translateApiMessage(
        i18n,
        'api.errors.responseValidationFailed',
        'Response validation failed',
      );
      details = getZodValidationDetails(exception.getZodError());
    } else {
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (isObjectResponse(response)) {
        error = typeof response.error === 'string' ? response.error : exception.name;

        if (typeof response.message === 'string') {
          message = response.message;
        } else if (Array.isArray(response.message)) {
          message = response.message.filter((item) => typeof item === 'string').join(', ');
        }

        details = response.details;
      }
    }

    reply.status(status).send({
      success: false,
      status,
      error,
      message,
      details,
      timestamp: new Date().toISOString(),
      ...(isProduction ? {} : { stack: exception.stack }),
    });
  }
}
