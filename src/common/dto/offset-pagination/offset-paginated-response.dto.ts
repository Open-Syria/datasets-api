import { createZodDto, type ZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { apiBaseSuccessResponseSchema } from '../../schemas/api-response.schema';
import { type OffsetPagination, offsetPaginationSchema } from '../../schemas/pagination.schema';
import { type ApiResponse, getResponseDtoName } from '../api-response.dto';

export type ApiOffsetPaginatedData<TItem, TExtra extends object = Record<string, never>> = {
  items: TItem[];
  pagination: OffsetPagination;
} & TExtra;

export type ApiOffsetPaginatedResponse<
  TItem,
  TExtra extends object = Record<string, never>,
> = ApiResponse<ApiOffsetPaginatedData<TItem, TExtra>>;

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
