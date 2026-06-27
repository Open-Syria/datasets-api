import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { type ZodDto, ZodResponse } from 'nestjs-zod';
import { ErrorResponseDto } from '../common/dto/error.dto';
import { createOffsetPaginatedResponseDto } from '../common/dto/offset-pagination/offset-paginated-response.dto';

export type ApiPaginatedResponseOptions = {
  type: ZodDto;
  tags: string[];
  summary: string;
  description?: string;
  status?: number;
  responseDescription?: string;
  responseName?: string;
};

export function ApiPaginatedResponse(options: ApiPaginatedResponseOptions) {
  const status = options.status ?? HttpStatus.OK;
  const responseDto = createOffsetPaginatedResponseDto(options.type, options.responseName);

  return applyDecorators(
    ApiTags(...options.tags),
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    HttpCode(status),
    ZodResponse({
      status,
      description: options.responseDescription ?? options.summary,
      type: responseDto as never,
    }),
    ApiBadRequestResponse({ description: 'Bad request', type: ErrorResponseDto }),
    ApiNotFoundResponse({ description: 'Resource not found', type: ErrorResponseDto }),
    ApiUnprocessableEntityResponse({
      description: 'Unprocessable request',
      type: ErrorResponseDto,
    }),
    ApiTooManyRequestsResponse({ description: 'Rate limit exceeded', type: ErrorResponseDto }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      type: ErrorResponseDto,
    }),
  );
}
