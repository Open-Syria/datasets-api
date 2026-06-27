import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { I18nContext } from 'nestjs-i18n';
import { ZodValidationException } from 'nestjs-zod';
import { translateApiMessage } from '../i18n/translation-key.utils';
import { getZodValidationDetails } from './zod-error-details';

@Catch(ZodValidationException)
export class ZodValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ZodValidationExceptionFilter.name);

  catch(exception: ZodValidationException, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const reply = context.getResponse<FastifyReply>();
    const i18n = I18nContext.current(host);

    if (reply.sent) {
      return;
    }

    this.logger.warn('Zod validation failed', exception.getZodError());

    reply.status(HttpStatus.BAD_REQUEST).send({
      success: false,
      status: HttpStatus.BAD_REQUEST,
      error: 'ValidationError',
      message: translateApiMessage(i18n, 'api.errors.validationFailed', 'Validation failed'),
      details: getZodValidationDetails(exception.getZodError()),
      timestamp: new Date().toISOString(),
    });
  }
}
