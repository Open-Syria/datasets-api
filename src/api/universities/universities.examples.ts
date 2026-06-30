const exampleTimestamp = '2026-06-30T00:00:00.000Z';

const exampleDataset = {
  id: 'opensyria-universities',
  repository: 'data-universities',
  status: 'released',
};

const exampleRelease = {
  version: 'v0.2.0',
  releasedAt: '2026-06-30T00:46:15.000Z',
};

const examplePagination = {
  limit: 10,
  currentPage: 1,
  pageRecords: 1,
  totalRecords: 57,
  totalPages: 6,
  nextPage: 2,
  previousPage: null,
};

const exampleSources = [
  {
    id: 'wikipedia-list-universities-syria',
    title: 'Wikipedia list of universities in Syria',
    url: 'https://en.wikipedia.org/wiki/List_of_universities_in_Syria',
    license: 'CC BY-SA 4.0',
    accessedAt: '2026-06-29T00:00:00.000Z',
    fields: ['identity', 'location', 'website'],
  },
];

const exampleLogo = {
  id: 'sy-damascus-university-logo',
  universityId: 'sy-damascus-university',
  assetType: 'image',
  assetRole: 'logo',
  title: {
    en: 'Damascus University logo',
    ar: '\u0634\u0639\u0627\u0631 \u062c\u0627\u0645\u0639\u0629 \u062f\u0645\u0634\u0642',
  },
  variants: [
    {
      url: 'https://cdn.opensyria.org/universities/sy-damascus-university/logo-v1/w256.webp',
      key: 'universities/sy-damascus-university/logo-v1/w256.webp',
      format: 'webp',
      contentType: 'image/webp',
      width: 256,
      height: 256,
      sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
      sizeBytes: 12345,
    },
  ],
  attribution: {
    sourceProvider: 'Official university website',
    sourceTitle: 'Damascus University official logo',
    sourceUrl: 'https://damascusuniversity.edu.sy/',
    creator: 'Damascus University',
    license: 'Official institutional logo; trademark rights may apply',
    licenseUrl: 'https://damascusuniversity.edu.sy/',
    attributionRequired: false,
  },
  sourceIds: ['sy-damascus-university-official-logo'],
  sourceStatus: 'seed',
};

const exampleRanking = {
  id: 'sy-damascus-university-arab-ranking-for-universities-national-2025',
  universityId: 'sy-damascus-university',
  rankingSystem: 'Arab Ranking for Universities',
  rankScope: 'national',
  year: 2025,
  rank: 1,
  rankDisplay: '1',
  sourceUrl: 'https://www.auranking.aaru.edu.jo/rank%20results/',
  retrievedAt: '2026-06-30T00:00:00.000Z',
  sourceIds: ['arab-ranking-for-universities-2025'],
  sourceStatus: 'seed',
};

const exampleUniversity = {
  id: 'sy-damascus-university',
  name: {
    en: 'Damascus University',
    ar: '\u062c\u0627\u0645\u0639\u0629 \u062f\u0645\u0634\u0642',
  },
  aliases: [],
  institutionType: 'public',
  operationalStatus: 'unknown',
  foundedYear: 1923,
  website: 'https://damascusuniversity.edu.sy/',
  location: {
    governorate: {
      en: 'Damascus',
      ar: '\u062f\u0645\u0634\u0642',
    },
    locality: {
      en: 'Damascus',
      ar: '\u062f\u0645\u0634\u0642',
    },
    centroid: {
      latitude: 33.5102,
      longitude: 36.2925,
    },
  },
  externalIds: {
    wikidata: 'Q821075',
    website: 'https://damascusuniversity.edu.sy/',
  },
  sourceIds: ['wikidata', 'wikipedia-list-universities-syria'],
  sourceStatus: 'seed',
  logo: exampleLogo,
  rankings: [exampleRanking],
};

export const universityListResponseExample = {
  success: true,
  status: 200,
  message: 'Universities fetched successfully',
  data: {
    items: [exampleUniversity],
    pagination: examplePagination,
    dataset: exampleDataset,
    release: exampleRelease,
  },
  timestamp: exampleTimestamp,
};

export const universityDetailResponseExample = {
  success: true,
  status: 200,
  message: 'University fetched successfully',
  data: {
    item: exampleUniversity,
    dataset: exampleDataset,
    release: exampleRelease,
    sources: exampleSources,
  },
  timestamp: exampleTimestamp,
};
