import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Environment } from '../../constants/app.constants';

export const redisHealthStatusSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('disabled'),
    latencyMs: z.literal(0),
  }),
  z.object({
    status: z.literal('up'),
    latencyMs: z.number().int().nonnegative(),
  }),
  z.object({
    status: z.literal('down'),
    latencyMs: z.number().int().nonnegative(),
    message: z.string(),
  }),
]);

export const healthResponseDataSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  app: z.object({
    name: z.string(),
    environment: z.enum(Environment),
  }),
  uptimeSeconds: z.number().nonnegative(),
  redis: redisHealthStatusSchema,
});

export class HealthResponseDataDto extends createZodDto(healthResponseDataSchema) {}

export type HealthResponseData = z.infer<typeof healthResponseDataSchema>;
