import { applyDecorators } from '@nestjs/common';
import { ApiQuery, type ApiQueryOptions } from '@nestjs/swagger';
import type { ZodDto } from 'nestjs-zod';
import type { z } from 'zod';

export type ApiQueryParameter = ApiQueryOptions;

export type ApiQueryDtoType = ZodDto<z.ZodTypeAny, boolean> & {
  openApiQueryParameters?: readonly ApiQueryParameter[];
};

export function ApiQueryDto(queryDto: ApiQueryDtoType) {
  const parameters = queryDto.openApiQueryParameters ?? [];

  return applyDecorators(...parameters.map((parameter) => ApiQuery(parameter)));
}
