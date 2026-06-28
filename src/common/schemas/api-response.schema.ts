import { z } from 'zod';

export const apiStatusCodeSchema = z.number().int().min(100).max(599);
export const apiSuccessStatusCodeSchema = apiStatusCodeSchema.meta({
  example: 200,
});
export const apiErrorStatusCodeSchema = apiStatusCodeSchema.meta({
  example: 400,
});
export const apiTimestampSchema = z.string().datetime();

export const apiBaseSuccessResponseSchema = z.object({
  success: z.literal(true),
  status: apiSuccessStatusCodeSchema,
  message: z.string().min(1),
  timestamp: apiTimestampSchema,
});

export const apiErrorDetailSchema = z.object({
  code: z.string().optional(),
  message: z.string().min(1),
  property: z.string().optional(),
});

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  status: apiErrorStatusCodeSchema,
  error: z.string().min(1),
  message: z.string().min(1),
  details: z.union([z.array(apiErrorDetailSchema), z.unknown()]).optional(),
  timestamp: apiTimestampSchema,
  stack: z.string().optional(),
});

export type ApiBaseSuccessResponse = z.infer<typeof apiBaseSuccessResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
