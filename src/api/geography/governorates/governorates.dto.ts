import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { buildOffsetPaginationQueryParameters } from '../../../common/dto/offset-pagination/offset-page-options.dto';
import { sourceAttributionSchema } from '../../../common/dto/source-attribution.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../../common/schemas/pagination.schema';
import {
  RECORD_SOURCE_STATUS_OPTIONS,
  RECORD_SOURCE_STATUS_VALUES,
  RECORD_SOURCE_STATUSES,
} from '../../../constants/app.constants';
import type { ApiParamParameter, ApiQueryParameter } from '../../../decorators/api-request-dto';

export const geographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const governorateSummarySchema = z.object({
  id: z.string().min(1),
  name: z.object({
    en: z.string().min(1),
    ar: z.string().min(1).optional(),
  }),
  iso31662: z.string().nullable(),
  centroid: geographicPointSchema.nullable(),
  sourceStatus: z.enum(RECORD_SOURCE_STATUSES),
});

export const governoratesArtifactSchema = z
  .union([
    z.array(governorateSummarySchema),
    z.object({
      items: z.array(governorateSummarySchema),
    }),
  ])
  .transform((value) => (Array.isArray(value) ? value : value.items));

export const governorateListQuerySchema = offsetPaginationQuerySchema.extend({
  sourceStatus: z
    .enum(RECORD_SOURCE_STATUS_OPTIONS)
    .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
    .optional(),
});

export const governorateParamsSchema = z.object({
  governorateId: z.string().trim().min(1),
});

export const governorateDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const governorateReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const governorateListSchema = z.object({
  items: z.array(governorateSummarySchema),
  count: z.number().int().nonnegative(),
  pagination: offsetPaginationSchema,
  dataset: governorateDatasetContextSchema,
  release: governorateReleaseContextSchema,
});

export const governorateDetailSchema = z.object({
  item: governorateSummarySchema,
  dataset: governorateDatasetContextSchema,
  release: governorateReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class GovernorateSummaryDto extends createZodDto(governorateSummarySchema) {}
export class GovernorateParamsDto extends createZodDto(governorateParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'governorateId',
      description: 'Stable OpenSyria governorate ID.',
      example: 'sy-damascus',
    },
  ] satisfies readonly ApiParamParameter[];
}
export class GovernorateListQueryDto extends createZodDto(governorateListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription: 'Search term matched against ID, names, ISO code, and source status.',
      searchExample: 'damascus',
    }),
    {
      name: 'sourceStatus',
      required: false,
      enum: RECORD_SOURCE_STATUS_OPTIONS,
      description:
        'Filter records by source review or release status. PENDING_RELEASE=pending release, SEED=seed data, RELEASED=released data, DEPRECATED=deprecated data.',
      example: 'RELEASED',
    },
  ];
}
export class GovernorateListDto extends createZodDto(governorateListSchema) {}
export class GovernorateDetailDto extends createZodDto(governorateDetailSchema) {}

export type GovernorateSummary = z.infer<typeof governorateSummarySchema>;
export type GovernorateParams = z.infer<typeof governorateParamsSchema>;
export type GovernorateListQuery = z.infer<typeof governorateListQuerySchema>;
export type GovernorateList = z.infer<typeof governorateListSchema>;
export type GovernorateDetail = z.infer<typeof governorateDetailSchema>;
