import { z } from 'zod';
import { RECORD_SOURCE_STATUSES } from '../../constants/app.constants';

export const geographyLocalizedTextSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1).optional(),
});

export const geographyGeographicPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const geographyAliasSchema = z.object({
  value: z.string().min(1),
  language: z.enum(['ar', 'en', 'und']).optional(),
  type: z
    .enum(['alias', 'formal', 'transliteration', 'historical', 'alternate_spelling'])
    .optional(),
});

export const geographySourceIdsSchema = z.array(z.string().min(1));

const geographySourceRecordDatePattern = /^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/;

export const geographySourceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1).optional(),
  sourceRecordDate: z.string().regex(geographySourceRecordDatePattern).optional(),
  accessedAt: z.string().datetime(),
});

export const geographyExternalIdsSchema = z.object({
  wikidata: z
    .string()
    .regex(/^Q[0-9]+$/)
    .optional(),
  geonames: z
    .string()
    .regex(/^[0-9]+$/)
    .optional(),
  geoboundaries: z.string().min(1).optional(),
  ochaPcode: z.string().min(1).optional(),
});

export const geographyAreaMeasurementSchema = z.object({
  value: z.number().positive(),
  unit: z.literal('km2'),
  sourceIds: geographySourceIdsSchema,
  notes: z.string().min(1).optional(),
});

export const geographyPopulationMeasurementSchema = z.object({
  value: z.number().int().min(0),
  year: z.number().int().min(1).max(9999),
  date: z
    .string()
    .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
    .optional(),
  sourceIds: geographySourceIdsSchema,
  notes: z.string().min(1).optional(),
});

const geographyBaseRecordSchema = z.object({
  id: z.string().min(1),
  name: geographyLocalizedTextSchema,
  aliases: z.array(geographyAliasSchema),
  centroid: geographyGeographicPointSchema.nullable(),
  externalIds: geographyExternalIdsSchema,
  sourceIds: geographySourceIdsSchema,
  sourceReferences: z.array(geographySourceReferenceSchema).min(1),
  sourceStatus: z.enum(RECORD_SOURCE_STATUSES),
  notes: z.string().min(1).optional(),
});

export const geographyAdministrativeRecordFieldsSchema = geographyBaseRecordSchema.extend({
  area: geographyAreaMeasurementSchema.nullable(),
  population: geographyPopulationMeasurementSchema.nullable(),
  populationHistory: z.array(geographyPopulationMeasurementSchema).min(1).optional(),
});

export const geographyGovernorateRecordSchema = geographyAdministrativeRecordFieldsSchema.extend({
  iso31662: z
    .string()
    .regex(/^SY-[A-Z]{2}$/)
    .nullable(),
});

export const geographyDistrictRecordSchema = geographyAdministrativeRecordFieldsSchema.extend({
  governorateId: z.string().min(1),
});

export const geographySubdistrictRecordSchema = geographyAdministrativeRecordFieldsSchema.extend({
  governorateId: z.string().min(1),
  districtId: z.string().min(1),
});

export const geographyLocalityKindSchema = z.enum(['city', 'town', 'village', 'locality']);

export const geographyLocalityRecordSchema = geographyBaseRecordSchema.extend({
  governorateId: z.string().min(1),
  districtId: z.string().min(1).optional(),
  subdistrictId: z.string().min(1).optional(),
  kind: geographyLocalityKindSchema,
});

export function geographyArtifactSchema<TSchema extends z.ZodType>(recordSchema: TSchema) {
  return z
    .union([
      z.array(recordSchema),
      z.object({
        items: z.array(recordSchema),
      }),
    ])
    .transform((value) => (Array.isArray(value) ? value : value.items));
}

export type GeographyPopulationMeasurement = z.infer<typeof geographyPopulationMeasurementSchema>;
export type GeographyAreaMeasurement = z.infer<typeof geographyAreaMeasurementSchema>;
export type GeographySourceReference = z.infer<typeof geographySourceReferenceSchema>;
