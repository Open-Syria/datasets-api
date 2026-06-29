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
  geographyLocalityKindSchema,
  geographyLocalityRecordSchema,
} from '../geography-records.dto';

export const localityKindSchema = geographyLocalityKindSchema;
export const localityRecordSchema = geographyLocalityRecordSchema;
export const localitySummarySchema = localityRecordSchema;

export const localitiesArtifactSchema = geographyArtifactSchema(localityRecordSchema);

export const localityListQuerySchema = offsetPaginationQuerySchema.extend({
  governorateId: z.string().trim().min(1).optional(),
  districtId: z.string().trim().min(1).optional(),
  subdistrictId: z.string().trim().min(1).optional(),
  kind: localityKindSchema.optional(),
  sourceStatus: z
    .enum(RECORD_SOURCE_STATUS_OPTIONS)
    .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
    .optional(),
});

export const localityParamsSchema = z.object({
  localityId: z.string().trim().min(1),
});

export const localityDatasetContextSchema = z.object({
  id: z.literal('opensyria-geography'),
  repository: z.literal('data-geography'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const localityReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const localityListSchema = z.object({
  items: z.array(localityRecordSchema),
  pagination: offsetPaginationSchema,
  dataset: localityDatasetContextSchema,
  release: localityReleaseContextSchema,
});

export const localityDetailSchema = z.object({
  item: localityRecordSchema,
  dataset: localityDatasetContextSchema,
  release: localityReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class LocalitySummaryDto extends createZodDto(localitySummarySchema) {}
export class LocalityRecordDto extends createZodDto(localityRecordSchema) {}
export class LocalityParamsDto extends createZodDto(localityParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'localityId',
      description: 'Stable OpenSyria locality ID.',
      example: 'sy-al-hasakah-al-hasakah-al-hasakeh-abiad',
    },
  ] satisfies readonly ApiParamParameter[];
}
export class LocalityListQueryDto extends createZodDto(localityListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, names, aliases, external IDs, source IDs, kind, and source status.',
      searchExample: 'hasakeh',
    }),
    {
      name: 'governorateId',
      required: false,
      description: 'Filter localities by stable OpenSyria governorate ID.',
      example: 'sy-al-hasakah',
    },
    {
      name: 'districtId',
      required: false,
      description: 'Filter localities by stable OpenSyria district ID.',
      example: 'sy-al-hasakah-al-hasakah',
    },
    {
      name: 'subdistrictId',
      required: false,
      description: 'Filter localities by stable OpenSyria subdistrict ID.',
      example: 'sy-al-hasakah-al-hasakah-al-hasakeh',
    },
    {
      name: 'kind',
      required: false,
      enum: ['city', 'town', 'village', 'locality'],
      description: 'Filter records by locality kind.',
      example: 'city',
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
export class LocalityListDto extends createZodDto(localityListSchema) {}
export class LocalityDetailDto extends createZodDto(localityDetailSchema) {}

export type LocalitySummary = z.infer<typeof localitySummarySchema>;
export type LocalityRecord = z.infer<typeof localityRecordSchema>;
export type LocalityParams = z.infer<typeof localityParamsSchema>;
export type LocalityListQuery = z.infer<typeof localityListQuerySchema>;
export type LocalityList = z.infer<typeof localityListSchema>;
export type LocalityDetail = z.infer<typeof localityDetailSchema>;
