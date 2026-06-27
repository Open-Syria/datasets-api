import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const sourceAttributionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().nullable(),
  license: z.string().min(1),
  accessedAt: z.string().datetime().nullable(),
  fields: z.array(z.string().min(1)),
});

export class SourceAttributionDto extends createZodDto(sourceAttributionSchema) {}

export type SourceAttribution = z.infer<typeof sourceAttributionSchema>;
