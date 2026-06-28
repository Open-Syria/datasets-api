import { createZodDto } from 'nestjs-zod';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_SORT_ORDER,
  SORT_ORDERS,
} from '../../../constants/app.constants';
import type { ApiQueryParameter } from '../../../decorators/api-query-dto';
import { offsetPaginationQuerySchema } from '../../schemas/pagination.schema';

export const offsetPaginationQueryParameters = [
  {
    name: 'page',
    required: false,
    description: 'Page number for offset pagination.',
    example: DEFAULT_CURRENT_PAGE,
  },
  {
    name: 'limit',
    required: false,
    description: 'Maximum number of records to return.',
    example: DEFAULT_PAGE_LIMIT,
  },
  {
    name: 'q',
    required: false,
    description: 'Broad text search term for the list endpoint.',
    example: 'damascus',
  },
  {
    name: 'order',
    required: false,
    enum: SORT_ORDERS,
    description: 'Sort order by English display name.',
    example: DEFAULT_SORT_ORDER,
  },
] as const satisfies readonly ApiQueryParameter[];

export function buildOffsetPaginationQueryParameters(
  options: { searchDescription?: string; searchExample?: string } = {},
): ApiQueryParameter[] {
  return offsetPaginationQueryParameters.map((parameter) => {
    if (parameter.name !== 'q') {
      return parameter;
    }

    return {
      ...parameter,
      description: options.searchDescription ?? parameter.description,
      example: options.searchExample ?? parameter.example,
    };
  });
}

export class OffsetPageOptionsDto extends createZodDto(offsetPaginationQuerySchema) {
  static readonly openApiQueryParameters = offsetPaginationQueryParameters;
}
