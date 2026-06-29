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
import { geographyArtifactSchema, geographyDistrictRecordSchema } from '../geography-records.dto';

export const districtSummarySchema = geographyDistrictRecordSchema;

export const districtsArtifactSchema = geographyArtifactSchema(districtSummarySchema);

export const districtListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  sourceStatus: z
    .enum(RECORD_SOURCE_STATUS_OPTIONS)
    .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
    .optional(),
});

export const districtParamsSchema = z.object({
  districtId: z.string().trim().min(1),
});

export const districtDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const districtReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const districtListSchema = z.object({
  items: z.array(districtSummarySchema),
  pagination: offsetPaginationSchema,
  dataset: districtDatasetContextSchema,
  release: districtReleaseContextSchema,
});

export const districtDetailSchema = z.object({
  item: districtSummarySchema,
  dataset: districtDatasetContextSchema,
  release: districtReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class DistrictSummaryDto extends createZodDto(districtSummarySchema) {}
export class DistrictParamsDto extends createZodDto(districtParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'districtId',
      description: 'Stable OpenSyria district ID.',
      example: 'sy-damascus-damascus',
    },
  ] satisfies readonly ApiParamParameter[];
}
export class DistrictListQueryDto extends createZodDto(districtListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against ID, names, aliases, governorate ID, external IDs, source IDs, and source status.',
      searchExample: 'damascus',
    }),
    {
      name: 'governorateId',
      required: false,
      description: 'Filter districts by stable OpenSyria governorate ID.',
      example: 'sy-damascus',
    },
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
export class DistrictListDto extends createZodDto(districtListSchema) {}
export class DistrictDetailDto extends createZodDto(districtDetailSchema) {}

export type DistrictSummary = z.infer<typeof districtSummarySchema>;
export type DistrictParams = z.infer<typeof districtParamsSchema>;
export type DistrictListQuery = z.infer<typeof districtListQuerySchema>;
export type DistrictList = z.infer<typeof districtListSchema>;
export type DistrictDetail = z.infer<typeof districtDetailSchema>;
