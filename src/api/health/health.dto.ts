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

export const datasetReleasesHealthStatusSchema = z.object({
  status: z.enum(['loaded', 'missing', 'not_required']),
  required: z.boolean(),
  count: z.number().int().nonnegative(),
});

export const livenessResponseDataSchema = z.object({
  status: z.literal('ok'),
  app: z.object({
    name: z.string(),
    environment: z.enum(Environment),
  }),
  uptimeSeconds: z.number().nonnegative(),
});

export const healthResponseDataSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  app: z.object({
    name: z.string(),
    environment: z.enum(Environment),
  }),
  uptimeSeconds: z.number().nonnegative(),
  redis: redisHealthStatusSchema,
  datasetReleases: datasetReleasesHealthStatusSchema,
});

export class LivenessResponseDataDto extends createZodDto(livenessResponseDataSchema) {}
export class HealthResponseDataDto extends createZodDto(healthResponseDataSchema) {}

export type LivenessResponseData = z.infer<typeof livenessResponseDataSchema>;
export type HealthResponseData = z.infer<typeof healthResponseDataSchema>;
