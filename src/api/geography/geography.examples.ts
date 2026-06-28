const exampleTimestamp = '2026-06-27T00:00:00.000Z';

const exampleDataset = {
  id: 'opensyria-geography',
  repository: 'data-geography',
  status: 'released',
};

const exampleRelease = {
  version: 'v0.1.0',
  releasedAt: '2026-06-27T00:00:00.000Z',
};

const examplePagination = {
  limit: 10,
  currentPage: 1,
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
    accessedAt: null,
    fields: ['names', 'alternateNames', 'featureCodes', 'coordinates'],
  },
];

const exampleGovernorate = {
  id: 'sy-damascus',
  name: {
    en: 'Damascus',
    ar: 'دمشق',
  },
  iso31662: 'SY-DI',
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  sourceStatus: 'released',
};

const exampleDistrict = {
  id: 'sy-damascus-damascus',
  governorateId: 'sy-damascus',
  name: {
    en: 'Damascus',
    ar: 'دمشق',
  },
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  sourceStatus: 'released',
};

const exampleSubdistrict = {
  id: 'sy-damascus-damascus-damascus',
  governorateId: 'sy-damascus',
  districtId: 'sy-damascus-damascus',
  name: {
    en: 'Damascus',
    ar: 'دمشق',
  },
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
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
    ar: 'دمشق',
  },
  centroid: {
    latitude: 33.5138,
    longitude: 36.2765,
  },
  sourceStatus: 'released',
};

const exampleLocalityDetail = {
  ...exampleLocality,
  aliases: [
    {
      value: 'Dimashq',
      language: 'en',
      type: 'alternate_spelling',
    },
  ],
  externalIds: {
    geonames: '170654',
    ochaPcode: 'C1000',
  },
  sourceIds: ['geonames-sy', 'hdx-syr-populated-places'],
};

function createListExample(message: string, item: unknown) {
  return {
    success: true,
    status: 200,
    message,
    data: {
      items: [item],
      count: 1,
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
  exampleLocalityDetail,
);
