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

const telecomOperatorTypes = ['fixed', 'mobile'] as const;
const telecomNumberingRoles = ['fixed_operator', 'mobile_operator'] as const;
const telecomOperatorAssignmentStatuses = ['assigned', 'reserved', 'inactive', 'unknown'] as const;
const telecomPlanScopes = ['fixed_and_mobile'] as const;
const telecomRangeTypes = [
  'reserved_mobile_prefix',
  'used_range',
  'unused_range',
  'short_number',
  'private_numbering',
] as const;
const telecomRangeAssignmentStatuses = [
  'assigned',
  'reserved',
  'unused',
  'used',
  'private_numbering',
] as const;

const datePattern = /^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/;
const syIdPattern = /^sy-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const twoDigitPrefixPattern = /^[1-9][0-9]$/;
const nationalDialingPrefixPattern = /^0[1-9][0-9]$/;

export const telecomLocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const telecomSourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1).optional(),
  sourceRecordDate: z.string().regex(datePattern).optional(),
  accessedAt: z.string().datetime(),
});

const telecomSourcedRecordFields = {
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(telecomSourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
  notes: z.string().min(1).optional(),
};

export const telecomLengthRangeSchema = z.object({
  min: z.number().int().positive(),
  max: z.number().int().positive(),
});

export const telecomCountryNumberingPlanSchema = z.object({
  id: z.string().regex(syIdPattern),
  countryCode: z.string().regex(/^[0-9]{1,3}$/),
  countryIso2: z.string().regex(/^[A-Z]{2}$/),
  countryIso3: z.string().regex(/^[A-Z]{3}$/),
  nationalPrefix: z
    .string()
    .regex(/^[0-9]+$/)
    .nullable(),
  internationalPrefix: z
    .string()
    .regex(/^[0-9]+$/)
    .nullable(),
  planScope: z.enum(telecomPlanScopes),
  ...telecomSourcedRecordFields,
});

export const telecomOperatorSchema = z.object({
  id: z.string().regex(syIdPattern),
  name: telecomLocalizedTextSchema,
  operatorType: z.enum(telecomOperatorTypes),
  numberingRole: z.enum(telecomNumberingRoles),
  assignmentStatus: z.enum(telecomOperatorAssignmentStatuses),
  ...telecomSourcedRecordFields,
});

export const telecomFixedAreaCodeSchema = z.object({
  id: z.string().regex(syIdPattern),
  name: telecomLocalizedTextSchema,
  areaCode: z.string().regex(twoDigitPrefixPattern),
  dialingPrefix: z.string().regex(nationalDialingPrefixPattern),
  operatorId: z.string().regex(syIdPattern),
  governorateIds: z.array(z.string().regex(syIdPattern)).min(1),
  subscriberNumberLength: telecomLengthRangeSchema,
  nationalSignificantNumberLength: telecomLengthRangeSchema,
  ...telecomSourcedRecordFields,
});

export const telecomMobilePrefixSchema = z.object({
  id: z.string().regex(syIdPattern),
  prefix: z.string().regex(twoDigitPrefixPattern),
  dialingPrefix: z.string().regex(nationalDialingPrefixPattern),
  operatorId: z.string().regex(syIdPattern),
  subscriberNumberLength: z.number().int().positive(),
  assignmentStatus: z.enum(telecomOperatorAssignmentStatuses),
  ...telecomSourcedRecordFields,
});

export const telecomNumberRangeSchema = z.object({
  id: z.string().regex(syIdPattern),
  name: telecomLocalizedTextSchema,
  rangeType: z.enum(telecomRangeTypes),
  ranges: z.array(z.string().regex(/^[0-9x]+$/)).min(1),
  assignmentStatus: z.enum(telecomRangeAssignmentStatuses),
  ...telecomSourcedRecordFields,
});

export function telecomArtifactSchema<TSchema extends z.ZodType>(recordSchema: TSchema) {
  return z
    .union([
      z.array(recordSchema),
      z.object({
        items: z.array(recordSchema),
      }),
    ])
    .transform((value) => (Array.isArray(value) ? value : value.items));
}

export const telecomCountryNumberingPlansArtifactSchema = telecomArtifactSchema(
  telecomCountryNumberingPlanSchema,
);
export const telecomOperatorsArtifactSchema = telecomArtifactSchema(telecomOperatorSchema);
export const telecomFixedAreaCodesArtifactSchema = telecomArtifactSchema(
  telecomFixedAreaCodeSchema,
);
export const telecomMobilePrefixesArtifactSchema = telecomArtifactSchema(telecomMobilePrefixSchema);
export const telecomNumberRangesArtifactSchema = telecomArtifactSchema(telecomNumberRangeSchema);

const sourceStatusQuerySchema = z
  .enum(RECORD_SOURCE_STATUS_OPTIONS)
  .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
  .optional();

export const telecomCountryNumberingPlanListQuerySchema = offsetPaginationQuerySchema.extend({
  countryCode: z
    .string()
    .regex(/^[0-9]{1,3}$/)
    .optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const telecomOperatorListQuerySchema = offsetPaginationQuerySchema.extend({
  operatorType: z.enum(telecomOperatorTypes).optional(),
  assignmentStatus: z.enum(telecomOperatorAssignmentStatuses).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const telecomFixedAreaCodeListQuerySchema = offsetPaginationQuerySchema.extend({
  areaCode: z.string().regex(twoDigitPrefixPattern).optional(),
  dialingPrefix: z.string().regex(nationalDialingPrefixPattern).optional(),
  operatorId: z.string().regex(syIdPattern).optional(),
  governorateId: z.string().regex(syIdPattern).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const telecomMobilePrefixListQuerySchema = offsetPaginationQuerySchema.extend({
  prefix: z.string().regex(twoDigitPrefixPattern).optional(),
  dialingPrefix: z.string().regex(nationalDialingPrefixPattern).optional(),
  operatorId: z.string().regex(syIdPattern).optional(),
  assignmentStatus: z.enum(telecomOperatorAssignmentStatuses).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const telecomNumberRangeListQuerySchema = offsetPaginationQuerySchema.extend({
  rangeType: z.enum(telecomRangeTypes).optional(),
  assignmentStatus: z.enum(telecomRangeAssignmentStatuses).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const telecomCountryNumberingPlanParamsSchema = z.object({
  countryNumberingPlanId: z.string().trim().min(1),
});

export const telecomOperatorParamsSchema = z.object({
  operatorId: z.string().trim().min(1),
});

export const telecomFixedAreaCodeParamsSchema = z.object({
  fixedAreaCodeId: z.string().trim().min(1),
});

export const telecomMobilePrefixParamsSchema = z.object({
  mobilePrefixId: z.string().trim().min(1),
});

export const telecomNumberRangeParamsSchema = z.object({
  numberRangeId: z.string().trim().min(1),
});

export const telecomDatasetContextSchema = z.object({
  id: z.literal('opensyria-telecom'),
  repository: z.literal('data-telecom'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const telecomReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

const telecomListEnvelopeSchema = z.object({
  pagination: offsetPaginationSchema,
  dataset: telecomDatasetContextSchema,
  release: telecomReleaseContextSchema,
});

const telecomDetailEnvelopeSchema = z.object({
  dataset: telecomDatasetContextSchema,
  release: telecomReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export const telecomCountryNumberingPlanListSchema = telecomListEnvelopeSchema.extend({
  items: z.array(telecomCountryNumberingPlanSchema),
});

export const telecomCountryNumberingPlanDetailSchema = telecomDetailEnvelopeSchema.extend({
  item: telecomCountryNumberingPlanSchema,
});

export const telecomOperatorListSchema = telecomListEnvelopeSchema.extend({
  items: z.array(telecomOperatorSchema),
});

export const telecomOperatorDetailSchema = telecomDetailEnvelopeSchema.extend({
  item: telecomOperatorSchema,
});

export const telecomFixedAreaCodeListSchema = telecomListEnvelopeSchema.extend({
  items: z.array(telecomFixedAreaCodeSchema),
});

export const telecomFixedAreaCodeDetailSchema = telecomDetailEnvelopeSchema.extend({
  item: telecomFixedAreaCodeSchema,
});

export const telecomMobilePrefixListSchema = telecomListEnvelopeSchema.extend({
  items: z.array(telecomMobilePrefixSchema),
});

export const telecomMobilePrefixDetailSchema = telecomDetailEnvelopeSchema.extend({
  item: telecomMobilePrefixSchema,
});

export const telecomNumberRangeListSchema = telecomListEnvelopeSchema.extend({
  items: z.array(telecomNumberRangeSchema),
});

export const telecomNumberRangeDetailSchema = telecomDetailEnvelopeSchema.extend({
  item: telecomNumberRangeSchema,
});

const sourceStatusQueryParameter = {
  name: 'sourceStatus',
  required: false,
  enum: RECORD_SOURCE_STATUS_OPTIONS,
  description:
    'Filter records by source review or release status. pending_release=pending release, seed=seed data, released=released data, deprecated=deprecated data.',
  example: 'released',
} as const satisfies ApiQueryParameter;

export class TelecomCountryNumberingPlanDto extends createZodDto(
  telecomCountryNumberingPlanSchema,
) {}
export class TelecomOperatorDto extends createZodDto(telecomOperatorSchema) {}
export class TelecomFixedAreaCodeDto extends createZodDto(telecomFixedAreaCodeSchema) {}
export class TelecomMobilePrefixDto extends createZodDto(telecomMobilePrefixSchema) {}
export class TelecomNumberRangeDto extends createZodDto(telecomNumberRangeSchema) {}

export class TelecomCountryNumberingPlanParamsDto extends createZodDto(
  telecomCountryNumberingPlanParamsSchema,
) {
  static readonly openApiParamParameters = [
    {
      name: 'countryNumberingPlanId',
      description: 'Stable OpenSyria country numbering-plan ID.',
      example: 'sy-national-numbering-plan',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TelecomOperatorParamsDto extends createZodDto(telecomOperatorParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'operatorId',
      description: 'Stable OpenSyria telecom operator/reference entity ID.',
      example: 'sy-syriatel',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TelecomFixedAreaCodeParamsDto extends createZodDto(telecomFixedAreaCodeParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'fixedAreaCodeId',
      description: 'Stable OpenSyria fixed area-code record ID.',
      example: 'sy-fixed-area-code-11-damascus-rif-dimashq',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TelecomMobilePrefixParamsDto extends createZodDto(telecomMobilePrefixParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'mobilePrefixId',
      description: 'Stable OpenSyria mobile prefix record ID.',
      example: 'sy-mobile-prefix-093-syriatel',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TelecomNumberRangeParamsDto extends createZodDto(telecomNumberRangeParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'numberRangeId',
      description: 'Stable OpenSyria public numbering range record ID.',
      example: 'sy-mobile-prefix-090-reserved',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TelecomCountryNumberingPlanListQueryDto extends createZodDto(
  telecomCountryNumberingPlanListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, country codes, prefixes, source IDs, source references, and notes.',
      searchExample: '963',
    }),
    {
      name: 'countryCode',
      required: false,
      description: 'Filter by E.164 country calling code without the plus sign.',
      example: '963',
    },
    sourceStatusQueryParameter,
  ];
}

export class TelecomOperatorListQueryDto extends createZodDto(telecomOperatorListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, operator names, roles, assignment status, source IDs, source references, and notes.',
      searchExample: 'syriatel',
    }),
    {
      name: 'operatorType',
      required: false,
      enum: telecomOperatorTypes,
      description: 'Filter by fixed or mobile operator/reference entity type.',
      example: 'mobile',
    },
    {
      name: 'assignmentStatus',
      required: false,
      enum: telecomOperatorAssignmentStatuses,
      description: 'Filter by numbering assignment status.',
      example: 'assigned',
    },
    sourceStatusQueryParameter,
  ];
}

export class TelecomFixedAreaCodeListQueryDto extends createZodDto(
  telecomFixedAreaCodeListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, names, area codes, dialing prefixes, operator IDs, governorate IDs, source IDs, source references, and notes.',
      searchExample: 'damascus',
    }),
    {
      name: 'areaCode',
      required: false,
      description: 'Filter by two-digit fixed area code without the trunk prefix.',
      example: '11',
    },
    {
      name: 'dialingPrefix',
      required: false,
      description: 'Filter by national fixed dialing prefix including the trunk prefix.',
      example: '011',
    },
    {
      name: 'operatorId',
      required: false,
      description: 'Filter by stable OpenSyria operator ID.',
      example: 'sy-syrian-telecom',
    },
    {
      name: 'governorateId',
      required: false,
      description: 'Filter by linked OpenSyria governorate ID.',
      example: 'sy-damascus',
    },
    sourceStatusQueryParameter,
  ];
}

export class TelecomMobilePrefixListQueryDto extends createZodDto(
  telecomMobilePrefixListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, prefixes, dialing prefixes, operator IDs, assignment status, source IDs, source references, and notes.',
      searchExample: '093',
    }),
    {
      name: 'prefix',
      required: false,
      description: 'Filter by two-digit mobile prefix without the trunk prefix.',
      example: '93',
    },
    {
      name: 'dialingPrefix',
      required: false,
      description: 'Filter by national mobile dialing prefix including the trunk prefix.',
      example: '093',
    },
    {
      name: 'operatorId',
      required: false,
      description: 'Filter by stable OpenSyria operator ID.',
      example: 'sy-syriatel',
    },
    {
      name: 'assignmentStatus',
      required: false,
      enum: telecomOperatorAssignmentStatuses,
      description: 'Filter by mobile prefix assignment status.',
      example: 'assigned',
    },
    sourceStatusQueryParameter,
  ];
}

export class TelecomNumberRangeListQueryDto extends createZodDto(
  telecomNumberRangeListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, names, range types, range values, assignment status, source IDs, source references, and notes.',
      searchExample: 'reserved',
    }),
    {
      name: 'rangeType',
      required: false,
      enum: telecomRangeTypes,
      description: 'Filter by public numbering range classification.',
      example: 'reserved_mobile_prefix',
    },
    {
      name: 'assignmentStatus',
      required: false,
      enum: telecomRangeAssignmentStatuses,
      description: 'Filter by range assignment status.',
      example: 'reserved',
    },
    sourceStatusQueryParameter,
  ];
}

export class TelecomCountryNumberingPlanListDto extends createZodDto(
  telecomCountryNumberingPlanListSchema,
) {}
export class TelecomCountryNumberingPlanDetailDto extends createZodDto(
  telecomCountryNumberingPlanDetailSchema,
) {}
export class TelecomOperatorListDto extends createZodDto(telecomOperatorListSchema) {}
export class TelecomOperatorDetailDto extends createZodDto(telecomOperatorDetailSchema) {}
export class TelecomFixedAreaCodeListDto extends createZodDto(telecomFixedAreaCodeListSchema) {}
export class TelecomFixedAreaCodeDetailDto extends createZodDto(telecomFixedAreaCodeDetailSchema) {}
export class TelecomMobilePrefixListDto extends createZodDto(telecomMobilePrefixListSchema) {}
export class TelecomMobilePrefixDetailDto extends createZodDto(telecomMobilePrefixDetailSchema) {}
export class TelecomNumberRangeListDto extends createZodDto(telecomNumberRangeListSchema) {}
export class TelecomNumberRangeDetailDto extends createZodDto(telecomNumberRangeDetailSchema) {}

export type TelecomCountryNumberingPlan = z.infer<typeof telecomCountryNumberingPlanSchema>;
export type TelecomOperator = z.infer<typeof telecomOperatorSchema>;
export type TelecomFixedAreaCode = z.infer<typeof telecomFixedAreaCodeSchema>;
export type TelecomMobilePrefix = z.infer<typeof telecomMobilePrefixSchema>;
export type TelecomNumberRange = z.infer<typeof telecomNumberRangeSchema>;
export type TelecomCountryNumberingPlanParams = z.infer<
  typeof telecomCountryNumberingPlanParamsSchema
>;
export type TelecomOperatorParams = z.infer<typeof telecomOperatorParamsSchema>;
export type TelecomFixedAreaCodeParams = z.infer<typeof telecomFixedAreaCodeParamsSchema>;
export type TelecomMobilePrefixParams = z.infer<typeof telecomMobilePrefixParamsSchema>;
export type TelecomNumberRangeParams = z.infer<typeof telecomNumberRangeParamsSchema>;
export type TelecomCountryNumberingPlanListQuery = z.infer<
  typeof telecomCountryNumberingPlanListQuerySchema
>;
export type TelecomOperatorListQuery = z.infer<typeof telecomOperatorListQuerySchema>;
export type TelecomFixedAreaCodeListQuery = z.infer<typeof telecomFixedAreaCodeListQuerySchema>;
export type TelecomMobilePrefixListQuery = z.infer<typeof telecomMobilePrefixListQuerySchema>;
export type TelecomNumberRangeListQuery = z.infer<typeof telecomNumberRangeListQuerySchema>;
export type TelecomCountryNumberingPlanList = z.infer<typeof telecomCountryNumberingPlanListSchema>;
export type TelecomCountryNumberingPlanDetail = z.infer<
  typeof telecomCountryNumberingPlanDetailSchema
>;
export type TelecomOperatorList = z.infer<typeof telecomOperatorListSchema>;
export type TelecomOperatorDetail = z.infer<typeof telecomOperatorDetailSchema>;
export type TelecomFixedAreaCodeList = z.infer<typeof telecomFixedAreaCodeListSchema>;
export type TelecomFixedAreaCodeDetail = z.infer<typeof telecomFixedAreaCodeDetailSchema>;
export type TelecomMobilePrefixList = z.infer<typeof telecomMobilePrefixListSchema>;
export type TelecomMobilePrefixDetail = z.infer<typeof telecomMobilePrefixDetailSchema>;
export type TelecomNumberRangeList = z.infer<typeof telecomNumberRangeListSchema>;
export type TelecomNumberRangeDetail = z.infer<typeof telecomNumberRangeDetailSchema>;
