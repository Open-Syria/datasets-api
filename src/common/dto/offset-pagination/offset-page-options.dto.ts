import { createZodDto } from 'nestjs-zod';
import {
  DEFAULT_CURRENT_PAGE,
  DEFAULT_PAGE_LIMIT_OPTION,
  DEFAULT_SORT_ORDER_OPTION,
  PAGE_LIMIT_OPTIONS,
  SORT_ORDER_OPTIONS,
} from '../../../constants/app.constants';
import type { ApiQueryParameter } from '../../../decorators/api-request-dto';
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
    enum: PAGE_LIMIT_OPTIONS,
    description: 'Maximum number of records to return. TEN=10, THIRTY_FIVE=35, FIFTY=50.',
    example: DEFAULT_PAGE_LIMIT_OPTION,
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
    enum: SORT_ORDER_OPTIONS,
    description: 'Sort order by English display name. ASC=ascending, DESC=descending.',
    example: DEFAULT_SORT_ORDER_OPTION,
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
