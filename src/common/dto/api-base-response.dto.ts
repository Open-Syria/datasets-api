import { createZodDto } from 'nestjs-zod';
import { apiBaseSuccessResponseSchema } from '../schemas/api-response.schema';

export class ApiBaseSuccessResponseDto extends createZodDto(apiBaseSuccessResponseSchema) {}
