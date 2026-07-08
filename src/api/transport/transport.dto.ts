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

const transportLocationTypes = [
  'airport',
  'airfield',
  'heliport',
  'seaport',
  'oil_terminal',
  'rail_terminal',
  'road_terminal',
  'postal_exchange',
  'trade_location',
  'border_crossing',
  'terminal',
  'other',
] as const;

const transportModes = [
  'air',
  'maritime',
  'rail',
  'road',
  'postal',
  'multimodal',
  'border',
  'other',
] as const;

const transportLocationOperationalStatuses = ['active', 'inactive', 'closed', 'unknown'] as const;
const transportObservedStatuses = ['active', 'limited', 'closed', 'inactive', 'unknown'] as const;
const transportRouteObservedStatuses = [
  'active',
  'limited',
  'disrupted',
  'inaccessible',
  'unknown',
] as const;
const transportRouteTypes = ['corridor', 'route'] as const;

const datePattern = /^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/;
const dayDatePattern = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const syIdPattern = /^sy-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const transportLocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const transportAliasSchema = z.object({
  value: z.string().min(1),
  language: z.enum(['ar', 'en', 'und']).optional(),
  type: z
    .enum(['alias', 'formal', 'transliteration', 'historical', 'alternate_spelling'])
    .optional(),
});

export const transportPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const transportAdministrativeLocationSchema = z
  .object({
    governorateId: z.string().regex(syIdPattern).optional(),
    districtId: z.string().regex(syIdPattern).optional(),
    subdistrictId: z.string().regex(syIdPattern).optional(),
    localityId: z.string().regex(syIdPattern).optional(),
    localityName: transportLocalizedTextSchema.optional(),
  })
  .nullable();

export const transportExternalIdsSchema = z.object({
  ourairportsIdent: z.string().min(1).optional(),
  iata: z
    .string()
    .regex(/^[A-Z0-9]{3}$/)
    .optional(),
  icao: z
    .string()
    .regex(/^[A-Z0-9]{4}$/)
    .optional(),
  unLocode: z
    .string()
    .regex(/^SY[A-Z0-9]{3}$/)
    .optional(),
  wikidata: z
    .string()
    .regex(/^Q[0-9]+$/)
    .optional(),
  geonames: z
    .string()
    .regex(/^[0-9]+$/)
    .optional(),
  worldPortIndex: z
    .string()
    .regex(/^[0-9]+$/)
    .optional(),
  website: z.string().url().optional(),
});

export const transportSourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1).optional(),
  sourceRecordDate: z.string().regex(datePattern).optional(),
  accessedAt: z.string().datetime(),
});

export const transportLocationSchema = z.object({
  id: z.string().regex(syIdPattern),
  name: transportLocalizedTextSchema,
  aliases: z.array(transportAliasSchema),
  locationTypes: z.array(z.enum(transportLocationTypes)).min(1),
  transportModes: z.array(z.enum(transportModes)).min(1),
  operationalStatus: z.enum(transportLocationOperationalStatuses),
  coordinates: transportPointSchema.nullable(),
  administrativeLocation: transportAdministrativeLocationSchema,
  externalIds: transportExternalIdsSchema,
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(transportSourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
  notes: z.string().min(1).optional(),
});

export const transportStatusSnapshotSchema = z.object({
  id: z.string().regex(syIdPattern),
  locationId: z.string().regex(syIdPattern),
  observedStatus: z.enum(transportObservedStatuses),
  statusAsOf: z.string().regex(dayDatePattern),
  countryPair: z.string().min(1).optional(),
  sourceNames: z.array(z.string().min(1)).min(1),
  statusNote: z.string().min(1),
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(transportSourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
});

export const transportRouteSnapshotSchema = z.object({
  id: z.string().regex(syIdPattern),
  name: transportLocalizedTextSchema,
  routeType: z.enum(transportRouteTypes),
  transportModes: z.array(z.enum(transportModes)).min(1),
  observedStatus: z.enum(transportRouteObservedStatuses),
  statusAsOf: z.string().regex(dayDatePattern),
  origin: transportLocalizedTextSchema,
  destination: transportLocalizedTextSchema,
  transitCountries: z.array(z.string().min(1)),
  locationIds: z.array(z.string().regex(syIdPattern)).min(1),
  sourceNames: z.array(z.string().min(1)).min(1),
  indicativeLeadTime: z.string().min(1).optional(),
  routeNote: z.string().min(1).optional(),
  sourceIds: z.array(z.string().min(1)).min(1),
  sourceReferences: z.array(transportSourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUS_OPTIONS),
});

export function transportArtifactSchema<TSchema extends z.ZodType>(recordSchema: TSchema) {
  return z
    .union([
      z.array(recordSchema),
      z.object({
        items: z.array(recordSchema),
      }),
    ])
    .transform((value) => (Array.isArray(value) ? value : value.items));
}

export const transportLocationsArtifactSchema = transportArtifactSchema(transportLocationSchema);
export const transportStatusSnapshotsArtifactSchema = transportArtifactSchema(
  transportStatusSnapshotSchema,
);
export const transportRouteSnapshotsArtifactSchema = transportArtifactSchema(
  transportRouteSnapshotSchema,
);

const sourceStatusQuerySchema = z
  .enum(RECORD_SOURCE_STATUS_OPTIONS)
  .transform((sourceStatus) => RECORD_SOURCE_STATUS_VALUES[sourceStatus])
  .optional();

export const transportLocationListQuerySchema = offsetPaginationQuerySchema.extend({
  locationType: z.enum(transportLocationTypes).optional(),
  transportMode: z.enum(transportModes).optional(),
  operationalStatus: z.enum(transportLocationOperationalStatuses).optional(),
  governorateId: z.string().regex(syIdPattern).optional(),
  sourceStatus: sourceStatusQuerySchema,
  hasCoordinates: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const transportStatusSnapshotListQuerySchema = offsetPaginationQuerySchema.extend({
  locationId: z.string().regex(syIdPattern).optional(),
  observedStatus: z.enum(transportObservedStatuses).optional(),
  statusAsOf: z.string().regex(dayDatePattern).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const transportRouteSnapshotListQuerySchema = offsetPaginationQuerySchema.extend({
  routeType: z.enum(transportRouteTypes).optional(),
  transportMode: z.enum(transportModes).optional(),
  observedStatus: z.enum(transportRouteObservedStatuses).optional(),
  statusAsOf: z.string().regex(dayDatePattern).optional(),
  locationId: z.string().regex(syIdPattern).optional(),
  sourceStatus: sourceStatusQuerySchema,
});

export const transportLocationParamsSchema = z.object({
  locationId: z.string().trim().min(1),
});

export const transportStatusSnapshotParamsSchema = z.object({
  statusSnapshotId: z.string().trim().min(1),
});

export const transportRouteSnapshotParamsSchema = z.object({
  routeSnapshotId: z.string().trim().min(1),
});

export const transportDatasetContextSchema = z.object({
  id: z.literal('opensyria-transport'),
  repository: z.literal('data-transport'),
  status: z.enum(['pending_release', 'planned', 'seed', 'released', 'deprecated']),
});

export const transportReleaseContextSchema = z
  .object({
    version: z.string(),
    releasedAt: z.string().datetime(),
  })
  .nullable();

const transportListEnvelopeSchema = z.object({
  pagination: offsetPaginationSchema,
  dataset: transportDatasetContextSchema,
  release: transportReleaseContextSchema,
});

const transportDetailEnvelopeSchema = z.object({
  dataset: transportDatasetContextSchema,
  release: transportReleaseContextSchema,
  sources: z.array(sourceAttributionSchema),
});

export const transportLocationListSchema = transportListEnvelopeSchema.extend({
  items: z.array(transportLocationSchema),
});

export const transportLocationDetailSchema = transportDetailEnvelopeSchema.extend({
  item: transportLocationSchema,
});

export const transportStatusSnapshotListSchema = transportListEnvelopeSchema.extend({
  items: z.array(transportStatusSnapshotSchema),
});

export const transportStatusSnapshotDetailSchema = transportDetailEnvelopeSchema.extend({
  item: transportStatusSnapshotSchema,
});

export const transportRouteSnapshotListSchema = transportListEnvelopeSchema.extend({
  items: z.array(transportRouteSnapshotSchema),
});

export const transportRouteSnapshotDetailSchema = transportDetailEnvelopeSchema.extend({
  item: transportRouteSnapshotSchema,
});

const sourceStatusQueryParameter = {
  name: 'sourceStatus',
  required: false,
  enum: RECORD_SOURCE_STATUS_OPTIONS,
  description:
    'Filter records by source review or release status. pending_release=pending release, seed=seed data, released=released data, deprecated=deprecated data.',
  example: 'seed',
} as const satisfies ApiQueryParameter;

export class TransportLocationDto extends createZodDto(transportLocationSchema) {}
export class TransportStatusSnapshotDto extends createZodDto(transportStatusSnapshotSchema) {}
export class TransportRouteSnapshotDto extends createZodDto(transportRouteSnapshotSchema) {}

export class TransportLocationParamsDto extends createZodDto(transportLocationParamsSchema) {
  static readonly openApiParamParameters = [
    {
      name: 'locationId',
      description: 'Stable OpenSyria transport location ID.',
      example: 'sy-damascus-international-airport',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TransportStatusSnapshotParamsDto extends createZodDto(
  transportStatusSnapshotParamsSchema,
) {
  static readonly openApiParamParameters = [
    {
      name: 'statusSnapshotId',
      description: 'Stable OpenSyria transport status snapshot ID.',
      example: 'sy-damascus-international-airport-status-2026-05-21-logistics-cluster',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TransportRouteSnapshotParamsDto extends createZodDto(
  transportRouteSnapshotParamsSchema,
) {
  static readonly openApiParamParameters = [
    {
      name: 'routeSnapshotId',
      description: 'Stable OpenSyria transport route snapshot ID.',
      example: 'sy-route-jordan-syria-corridor-status-2026-05-25-logistics-cluster',
    },
  ] satisfies readonly ApiParamParameter[];
}

export class TransportLocationListQueryDto extends createZodDto(transportLocationListQuerySchema) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, names, aliases, types, modes, administrative location, external IDs, source IDs, source references, and notes.',
      searchExample: 'airport',
    }),
    {
      name: 'locationType',
      required: false,
      enum: transportLocationTypes,
      description: 'Filter by transport location type.',
      example: 'airport',
    },
    {
      name: 'transportMode',
      required: false,
      enum: transportModes,
      description: 'Filter by transport mode.',
      example: 'road',
    },
    {
      name: 'operationalStatus',
      required: false,
      enum: transportLocationOperationalStatuses,
      description:
        'Filter by stable location-level operating status. This is not live status; use status snapshots for dated observations.',
      example: 'unknown',
    },
    {
      name: 'governorateId',
      required: false,
      description: 'Filter by linked OpenSyria governorate ID.',
      example: 'sy-aleppo',
    },
    sourceStatusQueryParameter,
    {
      name: 'hasCoordinates',
      required: false,
      enum: ['true', 'false'],
      description: 'Filter to records with or without source-backed coordinates.',
      example: 'true',
    },
  ];
}

export class TransportStatusSnapshotListQueryDto extends createZodDto(
  transportStatusSnapshotListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against IDs, location IDs, observed status, dates, country pairs, source names, notes, source IDs, and source references.',
      searchExample: 'border',
      orderDescription: 'Sort order by status date and snapshot ID. asc=oldest, desc=newest.',
    }),
    {
      name: 'locationId',
      required: false,
      description: 'Filter dated status observations by transport location ID.',
      example: 'sy-damascus-international-airport',
    },
    {
      name: 'observedStatus',
      required: false,
      enum: transportObservedStatuses,
      description: 'Filter by dated observed status.',
      example: 'active',
    },
    {
      name: 'statusAsOf',
      required: false,
      description: 'Filter by exact observation date in YYYY-MM-DD format.',
      example: '2026-05-21',
    },
    sourceStatusQueryParameter,
  ];
}

export class TransportRouteSnapshotListQueryDto extends createZodDto(
  transportRouteSnapshotListQuerySchema,
) {
  static readonly openApiQueryParameters: readonly ApiQueryParameter[] = [
    ...buildOffsetPaginationQueryParameters({
      searchDescription:
        'Search term matched against route IDs, names, modes, origin, destination, transit countries, linked locations, source names, notes, source IDs, and dates.',
      searchExample: 'corridor',
      orderDescription: 'Sort order by status date and route ID. asc=oldest, desc=newest.',
    }),
    {
      name: 'routeType',
      required: false,
      enum: transportRouteTypes,
      description: 'Filter by high-level route observation type.',
      example: 'corridor',
    },
    {
      name: 'transportMode',
      required: false,
      enum: transportModes,
      description: 'Filter by route transport mode.',
      example: 'road',
    },
    {
      name: 'observedStatus',
      required: false,
      enum: transportRouteObservedStatuses,
      description: 'Filter by dated route observation status.',
      example: 'active',
    },
    {
      name: 'statusAsOf',
      required: false,
      description: 'Filter by exact observation date in YYYY-MM-DD format.',
      example: '2026-05-25',
    },
    {
      name: 'locationId',
      required: false,
      description: 'Filter route observations linked to a transport location ID.',
      example: 'sy-nasib-border-crossing',
    },
    sourceStatusQueryParameter,
  ];
}

export class TransportLocationListDto extends createZodDto(transportLocationListSchema) {}
export class TransportLocationDetailDto extends createZodDto(transportLocationDetailSchema) {}
export class TransportStatusSnapshotListDto extends createZodDto(
  transportStatusSnapshotListSchema,
) {}
export class TransportStatusSnapshotDetailDto extends createZodDto(
  transportStatusSnapshotDetailSchema,
) {}
export class TransportRouteSnapshotListDto extends createZodDto(transportRouteSnapshotListSchema) {}
export class TransportRouteSnapshotDetailDto extends createZodDto(
  transportRouteSnapshotDetailSchema,
) {}

export type TransportLocation = z.infer<typeof transportLocationSchema>;
export type TransportStatusSnapshot = z.infer<typeof transportStatusSnapshotSchema>;
export type TransportRouteSnapshot = z.infer<typeof transportRouteSnapshotSchema>;
export type TransportLocationParams = z.infer<typeof transportLocationParamsSchema>;
export type TransportStatusSnapshotParams = z.infer<typeof transportStatusSnapshotParamsSchema>;
export type TransportRouteSnapshotParams = z.infer<typeof transportRouteSnapshotParamsSchema>;
export type TransportLocationListQuery = z.infer<typeof transportLocationListQuerySchema>;
export type TransportStatusSnapshotListQuery = z.infer<
  typeof transportStatusSnapshotListQuerySchema
>;
export type TransportRouteSnapshotListQuery = z.infer<typeof transportRouteSnapshotListQuerySchema>;
export type TransportLocationList = z.infer<typeof transportLocationListSchema>;
export type TransportLocationDetail = z.infer<typeof transportLocationDetailSchema>;
export type TransportStatusSnapshotList = z.infer<typeof transportStatusSnapshotListSchema>;
export type TransportStatusSnapshotDetail = z.infer<typeof transportStatusSnapshotDetailSchema>;
export type TransportRouteSnapshotList = z.infer<typeof transportRouteSnapshotListSchema>;
export type TransportRouteSnapshotDetail = z.infer<typeof transportRouteSnapshotDetailSchema>;
