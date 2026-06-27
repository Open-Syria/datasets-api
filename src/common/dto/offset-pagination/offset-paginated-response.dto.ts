import { createZodDto, type ZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { apiBaseSuccessResponseSchema } from '../../schemas/api-response.schema';
import { type OffsetPagination, offsetPaginationSchema } from '../../schemas/pagination.schema';
import { type ApiResponse, getResponseDtoName } from '../api-response.dto';

export type ApiOffsetPaginatedResponse<TItem> = ApiResponse<{
  items: TItem[];
  pagination: OffsetPagination;
}>;

export function createOffsetPaginatedResponseDto(
  itemDto: ZodDto,
  name = getResponseDtoName(itemDto, 'OffsetPaginatedResponse'),
) {
  const responseSchema = apiBaseSuccessResponseSchema.extend({
    data: z.object({
      items: z.array(itemDto.schema as z.ZodTypeAny),
      pagination: offsetPaginationSchema,
    }),
  });
  const ResponseDto = createZodDto(responseSchema);

  Object.defineProperty(ResponseDto, 'name', {
    value: name,
  });

  return ResponseDto;
}
