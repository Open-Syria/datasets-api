const exampleTimestamp = '2026-07-14T00:00:00.000Z';

const exampleDataset = {
  id: 'opensyria-telecom',
  repository: 'data-telecom',
  status: 'released',
};

const exampleRelease = {
  version: 'v0.1.0',
  releasedAt: '2026-07-14T00:00:00.000Z',
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
    id: 'itu-syria-numbering-plan-2022',
    title: 'Syrian Arab Republic (country code +963), National Numbering Plan',
    url: 'https://www.itu.int/dms_pub/itu-t/oth/02/02/T02020000C90004PDFE.pdf',
    license: 'ITU website terms; public informational material with reuse limitations',
    accessedAt: null,
    fields: ['country code', 'fixed area codes', 'mobile prefixes', 'operator names'],
  },
];

const exampleCountryNumberingPlan = {
  id: 'sy-national-numbering-plan',
  countryCode: '963',
  countryIso2: 'SY',
  countryIso3: 'SYR',
  nationalPrefix: '0',
  internationalPrefix: null,
  planScope: 'fixed_and_mobile',
  sourceIds: ['itu-syria-numbering-plan-2022'],
  sourceReferences: [
    {
      sourceId: 'itu-syria-numbering-plan-2022',
      sourceRecordId: 'communication-2022-08-11',
      sourceRecordDate: '2022-08-11',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleOperator = {
  id: 'sy-syriatel',
  name: {
    en: 'Syriatel',
  },
  operatorType: 'mobile',
  numberingRole: 'mobile_operator',
  assignmentStatus: 'assigned',
  sourceIds: ['itu-syria-numbering-plan-2022'],
  sourceReferences: [
    {
      sourceId: 'itu-syria-numbering-plan-2022',
      sourceRecordId: 'communication-2022-08-11-mobile-093-098-099',
      sourceRecordDate: '2022-08-11',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleFixedAreaCode = {
  id: 'sy-fixed-area-code-11-damascus-rif-dimashq',
  name: {
    en: 'Damascus and Rif Dimashq',
  },
  areaCode: '11',
  dialingPrefix: '011',
  operatorId: 'sy-syrian-telecom',
  governorateIds: ['sy-damascus', 'sy-rif-dimashq'],
  subscriberNumberLength: {
    min: 7,
    max: 7,
  },
  nationalSignificantNumberLength: {
    min: 9,
    max: 9,
  },
  sourceIds: ['itu-syria-numbering-plan-2022', 'opensyria-data-geography'],
  sourceReferences: [
    {
      sourceId: 'itu-syria-numbering-plan-2022',
      sourceRecordId: 'fixed-damascus-rural-011',
      sourceRecordDate: '2022-08-11',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
    {
      sourceId: 'opensyria-data-geography',
      sourceRecordId: 'sy-damascus sy-rif-dimashq',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleMobilePrefix = {
  id: 'sy-mobile-prefix-093-syriatel',
  prefix: '93',
  dialingPrefix: '093',
  operatorId: 'sy-syriatel',
  subscriberNumberLength: 7,
  assignmentStatus: 'assigned',
  sourceIds: ['itu-syria-numbering-plan-2022'],
  sourceReferences: [
    {
      sourceId: 'itu-syria-numbering-plan-2022',
      sourceRecordId: 'mobile-093-syriatel',
      sourceRecordDate: '2022-08-11',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleNumberRange = {
  id: 'sy-mobile-prefix-090-reserved',
  name: {
    en: 'Reserved mobile prefix 090',
  },
  rangeType: 'reserved_mobile_prefix',
  ranges: ['090'],
  assignmentStatus: 'reserved',
  sourceIds: ['itu-syria-numbering-plan-2022'],
  sourceReferences: [
    {
      sourceId: 'itu-syria-numbering-plan-2022',
      sourceRecordId: 'mobile-090-reserved',
      sourceRecordDate: '2022-08-11',
      accessedAt: '2026-07-14T16:45:00.000Z',
    },
  ],
  sourceStatus: 'released',
};

function listResponse(items: unknown[], totalRecords = items.length) {
  return {
    success: true,
    status: 200,
    message: 'Telecom records fetched successfully',
    data: {
      items,
      pagination: {
        ...examplePagination,
        pageRecords: items.length,
        totalRecords,
      },
      dataset: exampleDataset,
      release: exampleRelease,
    },
    timestamp: exampleTimestamp,
  };
}

function detailResponse(item: unknown, message: string) {
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

export const telecomCountryNumberingPlanListResponseExample = listResponse([
  exampleCountryNumberingPlan,
]);
export const telecomCountryNumberingPlanDetailResponseExample = detailResponse(
  exampleCountryNumberingPlan,
  'Telecom country numbering plan fetched successfully',
);
export const telecomOperatorListResponseExample = listResponse([exampleOperator], 4);
export const telecomOperatorDetailResponseExample = detailResponse(
  exampleOperator,
  'Telecom operator fetched successfully',
);
export const telecomFixedAreaCodeListResponseExample = listResponse([exampleFixedAreaCode], 13);
export const telecomFixedAreaCodeDetailResponseExample = detailResponse(
  exampleFixedAreaCode,
  'Telecom fixed area code fetched successfully',
);
export const telecomMobilePrefixListResponseExample = listResponse([exampleMobilePrefix], 8);
export const telecomMobilePrefixDetailResponseExample = detailResponse(
  exampleMobilePrefix,
  'Telecom mobile prefix fetched successfully',
);
export const telecomNumberRangeListResponseExample = listResponse([exampleNumberRange], 7);
export const telecomNumberRangeDetailResponseExample = detailResponse(
  exampleNumberRange,
  'Telecom number range fetched successfully',
);
