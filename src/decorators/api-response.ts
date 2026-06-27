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
import { createApiResponseDto } from '../common/dto/api-response.dto';
import { ErrorResponseDto } from '../common/dto/error.dto';

export type ApiStandardResponseOptions = {
  type: ZodDto;
  tags: string[];
  summary: string;
  description?: string;
  status?: number;
  responseDescription?: string;
  responseName?: string;
};

export function ApiStandardResponse(options: ApiStandardResponseOptions) {
  const status = options.status ?? HttpStatus.OK;
  const responseDto = createApiResponseDto(options.type, options.responseName);

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
