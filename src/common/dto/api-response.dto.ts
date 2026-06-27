import { createZodDto, type ZodDto } from 'nestjs-zod';
import type { z } from 'zod';
import {
  type ApiBaseSuccessResponse,
  apiBaseSuccessResponseSchema,
} from '../schemas/api-response.schema';

export type ApiResponse<TData> = ApiBaseSuccessResponse & {
  data: TData;
};

export function getResponseDtoName(dto: ZodDto, suffix: string) {
  return `${dto.name.replace(/Dto$/, '')}${suffix}`;
}

export function createApiResponseDto(dto: ZodDto, name = getResponseDtoName(dto, 'Response')) {
  const responseSchema = apiBaseSuccessResponseSchema.extend({
    data: dto.schema as z.ZodTypeAny,
  });
  const ResponseDto = createZodDto(responseSchema);

  Object.defineProperty(ResponseDto, 'name', {
    value: name,
  });

  return ResponseDto;
}
