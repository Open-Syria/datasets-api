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
  geographySubdistrictRecordSchema,
} from '../geography-records.dto';

export const subdistrictSummarySchema = geographySubdistrictRecordSchema;

export const subdistrictsArtifactSchema = geographyArtifactSchema(subdistrictSummarySchema);

export const subdistrictListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  sourceStatus: z
    .enum(RECORD_SOURCE_STATUS_OPTIONS)
    .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
    .optional(),
});

export const subdistrictParamsSchema = z.object({
  subdistrictId: z.string().trim().min(1),
});

export const subdistrictDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const subdistrictReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const subdistrictListSchema = z.object({
  items: z.array(subdistrictSummarySchema),
  pagination: offsetPaginationSchema,
  dataset: subdistrictDatasetContextSchema,
  release: subdistrictReleaseContextSchema,
});

export const subdistrictDetailSchema = z.object({
  item: subdistrictSummarySchema,
  dataset: subdistrictDatasetContextSchema,
  release: subdistrictReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class SubdistrictSummaryDto extends createZodDto(subdistrictSummarySchema) {}
export class SubdistrictParamsDto extends createZodDto(subdistrictParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'subdistrictId',
      description: 'Stable OpenSyria subdistrict ID.',
      example: 'sy-al-hasakah-al-hasakah-al-hasakeh',
    },
  ] satisfies readonly ApiParamParameter[];
}
export class SubdistrictListQueryDto extends createZodDto(subdistrictListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against ID, names, aliases, governorate ID, district ID, external IDs, source IDs, and source status.',
      searchExample: 'hasakeh',
    }),
    {
      name: 'governorateId',
      required: false,
      description: 'Filter subdistricts by stable OpenSyria governorate ID.',
      example: 'sy-al-hasakah',
    },
    {
      name: 'districtId',
      required: false,
      description: 'Filter subdistricts by stable OpenSyria district ID.',
      example: 'sy-al-hasakah-al-hasakah',
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
export class SubdistrictListDto extends createZodDto(subdistrictListSchema) {}
export class SubdistrictDetailDto extends createZodDto(subdistrictDetailSchema) {}

export type SubdistrictSummary = z.infer<typeof subdistrictSummarySchema>;
export type SubdistrictParams = z.infer<typeof subdistrictParamsSchema>;
export type SubdistrictListQuery = z.infer<typeof subdistrictListQuerySchema>;
export type SubdistrictList = z.infer<typeof subdistrictListSchema>;
export type SubdistrictDetail = z.infer<typeof subdistrictDetailSchema>;
