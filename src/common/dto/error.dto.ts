import { createZodDto } from 'nestjs-zod';
import { apiErrorResponseSchema } from '../schemas/api-response.schema';

export class ErrorResponseDto extends createZodDto(apiErrorResponseSchema) {}
