import { HttpStatus } from '@nestjs/common';
import type { I18nContext } from 'nestjs-i18n';
import { translateApiMessage } from '../../i18n/translation-key.utils';
import type { ApiResponse } from '../dto/api-response.dto';

type BuildResponseOptions<TData> = {
  data: TData;
  message: string;
  fallbackMessage: string;
  i18n?: I18nContext;
  status?: number;
};

export function buildResponse<TData>({
  data,
  message,
  fallbackMessage,
  i18n,
  status = HttpStatus.OK,
}: BuildResponseOptions<TData>): ApiResponse<TData> {
  return {
    success: true,
    status,
    message: translateApiMessage(i18n, message, fallbackMessage),
    data,
    timestamp: new Date().toISOString(),
  };
}
