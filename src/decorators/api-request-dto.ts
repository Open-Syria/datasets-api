import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  type ApiBodyOptions,
  ApiParam,
  type ApiParamOptions,
  ApiQuery,
  type ApiQueryOptions,
} from '@nestjs/swagger';
import type { ZodDto } from 'nestjs-zod';
import type { z } from 'zod';

export type ApiBodyPayload = ApiBodyOptions;
export type ApiParamParameter = ApiParamOptions;
export type ApiQueryParameter = ApiQueryOptions;

type ApiRequestDto = ZodDto<z.ZodTypeAny, boolean> & {
  openApiBody?: ApiBodyPayload;
  openApiParamParameters?: readonly ApiParamParameter[];
  openApiQueryParameters?: readonly ApiQueryParameter[];
};

export function ApiBodyDto(bodyDto: ApiRequestDto, options: ApiBodyPayload = {}) {
  return ApiBody({
    type: bodyDto,
    ...(bodyDto.openApiBody ?? {}),
    ...options,
  });
}

export function ApiParamDto(paramsDto: ApiRequestDto) {
  const parameters = paramsDto.openApiParamParameters ?? [];

  return applyDecorators(...parameters.map((parameter) => ApiParam(parameter)));
}

export function ApiQueryDto(queryDto: ApiRequestDto) {
  const parameters = queryDto.openApiQueryParameters ?? [];

  return applyDecorators(...parameters.map((parameter) => ApiQuery(parameter)));
}
