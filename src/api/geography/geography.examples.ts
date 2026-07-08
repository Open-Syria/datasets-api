const exampleTimestamp = '2026-06-27T00:00:00.000Z';

const exampleDataset = {
  id: 'opensyria-geography',
  repository: 'data-geography',
  status: 'released',
};

const exampleRelease = {
  version: 'v0.1.4',
  releasedAt: '2026-07-08T00:00:00.000Z',
};

const examplePagination = {
  limit: 10,
  currentPage: 1,
  pageRecords: 1,
  totalRecords: 1,
  totalPages: 1,
  nextPage: null,
  previousPage: null,
};

const exampleSources = [
  {
    id: 'geonames-sy',
    title: 'GeoNames Syrian Arab Republic Gazetteer Extract',
    url: 'https://download.geonames.org/export/dump/SY.zip',
    license: 'CC BY 4.0',
    accessedAt: '2026-06-28T00:00:00.000Z',
    fields: ['names', 'alternateNames', 'featureCodes', 'coordinates'],
  },
];

const exampleFixtureSourceReferences = [
  {
    sourceId: 'fixture-source',
    accessedAt: '2026-01-01T00:00:00.000Z',
  },
];

const exampleLocalitySourceReferences = [
  {
    sourceId: 'geonames-sy',
    sourceRecordId: '170654',
    accessedAt: '2026-06-28T00:00:00.000Z',
  },
  {
    sourceId: 'hdx-syr-populated-places',
    sourceRecordId: 'C1000',
    accessedAt: '2026-06-28T00:00:00.000Z',
  },
];

const exampleGovernorate = {
  id: 'sy-damascus',
  name: {
    en: 'Damascus',
    ar: '\u062f\u0645\u0634\u0642',
  },
  aliases: [
    {
      value: 'Dimashq',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  iso31662: 'SY-DI',
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  area: {
    value: 105,
    unit: 'km2',
    sourceIds: ['fixture-source'],
  },
  population: {
    value: 1796000,
    year: 2016,
    sourceIds: ['fixture-source'],
  },
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C1000',
  },
  sourceIds: ['fixture-source'],
  sourceReferences: exampleFixtureSourceReferences,
  sourceStatus: 'released',
};

const exampleDistrict = {
  id: 'sy-damascus-damascus',
  governorateId: 'sy-damascus',
  name: {
    en: 'Damascus',
    ar: '\u062f\u0645\u0634\u0642',
  },
  aliases: [
    {
      value: 'Dimashq District',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  area: {
    value: 105,
    unit: 'km2',
    sourceIds: ['fixture-source'],
  },
  population: {
    value: 1552161,
    year: 2004,
    sourceIds: ['fixture-source'],
  },
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C1000001',
  },
  sourceIds: ['fixture-source'],
  sourceReferences: exampleFixtureSourceReferences,
  sourceStatus: 'released',
};

const exampleSubdistrict = {
  id: 'sy-damascus-damascus-damascus',
  governorateId: 'sy-damascus',
  districtId: 'sy-damascus-damascus',
  name: {
    en: 'Damascus',
    ar: '\u062f\u0645\u0634\u0642',
  },
  aliases: [
    {
      value: 'Dimashq Subdistrict',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  area: {
    value: 105,
    unit: 'km2',
    sourceIds: ['fixture-source'],
  },
  population: {
    value: 1552161,
    year: 2004,
    sourceIds: ['fixture-source'],
  },
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C100000101',
  },
  sourceIds: ['fixture-source'],
  sourceReferences: exampleFixtureSourceReferences,
  sourceStatus: 'released',
};

const exampleLocality = {
  id: 'sy-damascus-damascus-damascus-damascus',
  governorateId: 'sy-damascus',
  districtId: 'sy-damascus-damascus',
  subdistrictId: 'sy-damascus-damascus-damascus',
  kind: 'city',
  name: {
    en: 'Damascus',
    ar: '\u062f\u0645\u0634\u0642',
  },
  aliases: [
    {
      value: 'Dimashq',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C1000',
  },
  sourceIds: ['geonames-sy', 'hdx-syr-populated-places'],
  sourceReferences: exampleLocalitySourceReferences,
  sourceStatus: 'released',
};

function createListExample(message: string, item: unknown) {
  return {
    success: true,
    status: 200,
    message,
    data: {
      items: [item],
      pagination: examplePagination,
      dataset: exampleDataset,
      release: exampleRelease,
    },
    timestamp: exampleTimestamp,
  };
}

function createDetailExample(message: string, item: unknown) {
  return {
    success: true,
    status: 200,
    message,
    data: {
      item,
      dataset: exampleDataset,
      release: exampleRelease,
      sources: exampleSources,
    },
    timestamp: exampleTimestamp,
  };
}

export const governorateListResponseExample = createListExample(
  'Governorates fetched successfully',
  exampleGovernorate,
);
export const governorateDetailResponseExample = createDetailExample(
  'Governorate fetched successfully',
  exampleGovernorate,
);
export const districtListResponseExample = createListExample(
  'Districts fetched successfully',
  exampleDistrict,
);
export const districtDetailResponseExample = createDetailExample(
  'District fetched successfully',
  exampleDistrict,
);
export const subdistrictListResponseExample = createListExample(
  'Subdistricts fetched successfully',
  exampleSubdistrict,
);
export const subdistrictDetailResponseExample = createDetailExample(
  'Subdistrict fetched successfully',
  exampleSubdistrict,
);
export const localityListResponseExample = createListExample(
  'Localities fetched successfully',
  exampleLocality,
);
export const localityDetailResponseExample = createDetailExample(
  'Locality fetched successfully',
  exampleLocality,
);
