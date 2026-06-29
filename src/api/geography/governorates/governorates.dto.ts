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
} from '../../../constants/app.constants';
import type { ApiParamParameter, ApiQueryParameter } from '../../../decorators/api-request-dto';
import {
  geographyArtifactSchema,
  geographyGovernorateRecordSchema,
} from '../geography-records.dto';

export const governorateSummarySchema = geographyGovernorateRecordSchema;

export const governoratesArtifactSchema = geographyArtifactSchema(governorateSummarySchema);

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
      searchDescription:
        'Search term matched against ID, names, aliases, ISO code, external IDs, source IDs, and source status.',
      searchExample: 'damascus',
    }),
    {
      name: 'sourceStatus',
      required: false,
      enum: RECORD_SOURCE_STATUS_OPTIONS,
      description:
        'Filter records by source review or release status. pending_release=pending release, seed=seed data, released=released data, deprecated=deprecated data.',
      example: 'released',
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
