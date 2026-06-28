import { applyDecorators, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiResponse as ApiSwaggerResponse,
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
  example?: unknown;
};

const badRequestExample = {
  success: false,
  status: 400,
  error: 'ValidationError',
  message: 'Validation failed',
  details: [
    {
      code: 'invalid_type',
      message: 'Expected number, received string',
      property: 'limit',
    },
  ],
  timestamp: '2026-06-27T00:00:00.000Z',
};

const notFoundExample = {
  success: false,
  status: 404,
  error: 'NotFoundException',
  message: 'Resource not found',
  timestamp: '2026-06-27T00:00:00.000Z',
};

const rateLimitExample = {
  success: false,
  status: 429,
  error: 'ThrottlerException',
  message: 'Too many requests',
  timestamp: '2026-06-27T00:00:00.000Z',
};

const internalServerErrorExample = {
  success: false,
  status: 500,
  error: 'InternalServerErrorException',
  message: 'Internal server error',
  timestamp: '2026-06-27T00:00:00.000Z',
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
    ...(options.example
      ? [
          ApiSwaggerResponse({
            status,
            description: options.responseDescription ?? options.summary,
            type: responseDto,
            example: options.example,
          }),
        ]
      : []),
    ApiBadRequestResponse({
      description: 'Bad request',
      type: ErrorResponseDto,
      example: badRequestExample,
    }),
    ApiNotFoundResponse({
      description: 'Resource not found',
      type: ErrorResponseDto,
      example: notFoundExample,
    }),
    ApiUnprocessableEntityResponse({
      description: 'Unprocessable request',
      type: ErrorResponseDto,
      example: badRequestExample,
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded',
      type: ErrorResponseDto,
      example: rateLimitExample,
    }),
    ApiInternalServerErrorResponse({
      description: 'Internal server error',
      type: ErrorResponseDto,
      example: internalServerErrorExample,
    }),
  );
}
