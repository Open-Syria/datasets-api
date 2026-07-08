import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { buildOffsetPaginationQueryParameters } from '../../common/dto/offset-pagination/offset-page-options.dto';
import { sourceAttributionSchema } from '../../common/dto/source-attribution.dto';
import {
  offsetPaginationQuerySchema,
  offsetPaginationSchema,
} from '../../common/schemas/pagination.schema';
import {
  RECORD_SOURCE_STATUS_OPTIONS,
  RECORD_SOURCE_STATUS_VALUES,
} from '../../constants/app.constants';
import type { ApiParamParameter, ApiQueryParameter } from '../../decorators/api-request-dto';

const universityInstitutionTypes = [
  'public',
  'private',
  'virtual',
  'technical',
  'religious',
  'other',
] as const;
const universityOperationalStatuses = ['operating', 'planned', 'closed', 'unknown'] as const;
const universityRankScopes = ['global', 'regional', 'national', 'subject', 'other'] as const;
const universitySourceRecordDatePattern = /^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/;

export const universityLocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const universityAliasSchema = z.object({
  value: z.string().min(1),
  language: z.enum(['ar', 'en', 'und']).optional(),
  type: z
    .enum(['alias', 'formal', 'transliteration', 'historical', 'alternate_spelling'])
    .optional(),
});

export const universityPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const universityLocationSchema = z
  .object({
    governorate: universityLocalizedTextSchema.optional(),
    locality: universityLocalizedTextSchema.optional(),
    address: universityLocalizedTextSchema.optional(),
    centroid: universityPointSchema.nullish(),
  })
  .nullable();

export const universityExternalIdsSchema = z.object({
  wikidata: z
    .string()
    .regex(/^Q[0-9]+$/)
    .optional(),
  website: z.string().url().optional(),
  ministryId: z.string().min(1).optional(),
});

export const universitySourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1).optional(),
  sourceRecordDate: z.string().regex(universitySourceRecordDatePattern).optional(),
  accessedAt: z.string().datetime(),
});

export const universityRecordSchema = z.object({
  id: z.string().min(1),
  name: universityLocalizedTextSchema,
  aliases: z.array(universityAliasSchema),
  institutionType: z.enum(universityInstitutionTypes),
  operationalStatus: z.enum(universityOperationalStatuses),
  foundedYear: z.number().int().min(1).max(9999).nullable(),
  website: z.string().url().nullable(),
  location: universityLocationSchema,
  externalIds: universityExternalIdsSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(universitySourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
  notes: z.string().min(1).optional(),
});

export const universityAssetVariantSchema = z.object({
  url: z.string().url(),
  key: z.string().min(1),
  format: z.enum(['webp', 'avif']),
  contentType: z.enum(['image/webp', 'image/avif']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
});

export const universityAssetAttributionSchema = z.object({
  sourceProvider: z.string().min(1),
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  creator: z.string().min(1),
  credit: z.string().min(1).optional(),
  license: z.string().min(1),
  licenseUrl: z.string().url(),
  attributionRequired: z.boolean(),
});

export const universityLogoAssetSchema = z.object({
  id: z.string().min(1),
  universityId: z.string().min(1),
  assetType: z.literal('image'),
  assetRole: z.enum(['campus', 'logo', 'building', 'other']),
  title: universityLocalizedTextSchema,
  variants: z.array(universityAssetVariantSchema).min(1),
  attribution: universityAssetAttributionSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(universitySourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
  notes: z.string().min(1).optional(),
});

export const universityRankingSchema = z.object({
  id: z.string().min(1),
  universityId: z.string().min(1),
  rankingSystem: z.string().min(1),
  rankScope: z.enum(universityRankScopes),
  year: z.number().int().min(1900).max(9999),
  rank: z.number().int().positive().nullable(),
  rankDisplay: z.string().min(1).nullable(),
  sourceUrl: z.string().url(),
  retrievedAt: z.string().datetime(),
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(universitySourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
  notes: z.string().min(1).optional(),
});

export function universityArtifactSchema<TSchema extends z.ZodType>(recordSchema: TSchema) {
  return z
    .union([
      z.array(recordSchema),
      z.object({
        items: z.array(recordSchema),
      }),
    ])
    .transform((value) => (Array.isArray(value) ? value : value.items));
}

export const universityRecordsArtifactSchema = universityArtifactSchema(universityRecordSchema);
export const universityLogoAssetsArtifactSchema =
  universityArtifactSchema(universityLogoAssetSchema);
export const universityRankingsArtifactSchema = universityArtifactSchema(universityRankingSchema);

export const universitySummarySchema = universityRecordSchema.extend({
  logo: universityLogoAssetSchema.nullable(),
  rankings: z.array(universityRankingSchema),
});

export const universityListQuerySchema = offsetPaginationQuerySchema.extend({
  institutionType: z.enum(universityInstitutionTypes).optional(),
  governorate: z.string().trim().min(1).optional(),
  sourceStatus: z
    .enum(RECORD_SOURCE_STATUS_OPTIONS)
    .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
    .optional(),
  hasWebsite: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const universityParamsSchema = z.object({
  universityId: z.string().trim().min(1),
});

export const universityDatasetContextSchema = z.object({
  id: z.literal('opensyria-universities'),
  repository: z.literal('data-universities'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const universityReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

export const universityListSchema = z.object({
  items: z.array(universitySummarySchema),
  pagination: offsetPaginationSchema,
  dataset: universityDatasetContextSchema,
  release: universityReleaseContextSchema,
});

export const universityDetailSchema = z.object({
  item: universitySummarySchema,
  dataset: universityDatasetContextSchema,
  release: universityReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export class UniversitySummaryDto extends createZodDto(universitySummarySchema) {}
export class UniversityParamsDto extends createZodDto(universityParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'universityId',
      description: 'Stable OpenSyria university ID.',
      example: 'sy-damascus-university',
    },
  ] satisfies readonly ApiParamParameter[];
}
export class UniversityListQueryDto extends createZodDto(universityListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against ID, names, aliases, institution type, location, external IDs, source IDs, logo metadata, and ranking metadata.',
      searchExample: 'damascus',
    }),
    {
      name: 'institutionType',
      required: false,
      enum: universityInstitutionTypes,
      description: 'Filter universities by institution type.',
      example: 'public',
    },
    {
      name: 'governorate',
      required: false,
      description: 'Filter by English or Arabic governorate name.',
      example: 'Damascus',
    },
    {
      name: 'sourceStatus',
      required: false,
      enum: RECORD_SOURCE_STATUS_OPTIONS,
      description:
        'Filter records by source review or release status. pending_release=pending release, seed=seed data, released=released data, deprecated=deprecated data.',
      example: 'released',
    },
    {
      name: 'hasWebsite',
      required: false,
      enum: ['true', 'false'],
      description: 'Filter to universities with or without an approved public website URL.',
      example: 'true',
    },
  ];
}
export class UniversityListDto extends createZodDto(universityListSchema) {}
export class UniversityDetailDto extends createZodDto(universityDetailSchema) {}

export type UniversityRecord = z.infer<typeof universityRecordSchema>;
export type UniversityLogoAsset = z.infer<typeof universityLogoAssetSchema>;
export type UniversityRanking = z.infer<typeof universityRankingSchema>;
export type UniversitySummary = z.infer<typeof universitySummarySchema>;
export type UniversityParams = z.infer<typeof universityParamsSchema>;
export type UniversityListQuery = z.infer<typeof universityListQuerySchema>;
export type UniversityList = z.infer<typeof universityListSchema>;
export type UniversityDetail = z.infer<typeof universityDetailSchema>;
