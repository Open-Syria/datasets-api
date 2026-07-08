const exampleTimestamp = '2026-07-08T00:00:00.000Z';

const exampleDataset = {
  id: 'opensyria-transport',
  repository: 'data-transport',
  status: 'released',
};

const exampleRelease = {
  version: 'v0.1.1',
  releasedAt: '2026-07-08T00:00:00.000Z',
};

const examplePagination = {
  limit: 10,
  currentPage: 1,
  pageRecords: 1,
  totalRecords: 90,
  totalPages: 9,
  nextPage: 2,
  previousPage: null,
};

const exampleSources = [
  {
    id: 'logistics-cluster-middle-east-regional-coordination-minutes-2026-05-21',
    title: 'Middle East Regional Coordination Meeting Minutes, 21 May 2026',
    url: 'https://logcluster.org/en/documents/middle-east-regional-coordination-meeting-minutes-21-may-2026',
    license:
      'Logistics Cluster Terms of Use; non-commercial humanitarian or academic use with attribution',
    accessedAt: null,
    fields: ['airport status observations', 'source airport names', 'source meeting date'],
  },
];

const exampleLocation = {
  id: 'sy-damascus-international-airport',
  name: {
    en: 'Damascus International Airport',
  },
  aliases: [],
  locationTypes: ['airport'],
  transportModes: ['air'],
  operationalStatus: 'unknown',
  coordinates: {
    latitude: 33.411499,
    longitude: 36.515598,
  },
  administrativeLocation: {
    governorateId: 'sy-rif-dimashq',
    localityName: {
      en: 'Damascus',
    },
  },
  externalIds: {
    iata: 'DAM',
    icao: 'OSDI',
    unLocode: 'SYDAM',
    wikidata: 'Q175162',
  },
  sourceIds: ['ourairports', 'datahub-un-locode'],
  sourceReferences: [
    {
      sourceId: 'ourairports',
      sourceRecordId: 'OSDI',
      accessedAt: '2026-07-07T21:51:07.081Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleStatusSnapshot = {
  id: 'sy-damascus-international-airport-status-2026-05-21-logistics-cluster',
  locationId: 'sy-damascus-international-airport',
  observedStatus: 'active',
  statusAsOf: '2026-05-21',
  sourceNames: ['Damascus International Airport'],
  statusNote: 'Reported operational with cargo handling capacity.',
  sourceIds: ['logistics-cluster-middle-east-regional-coordination-minutes-2026-05-21'],
  sourceReferences: [
    {
      sourceId: 'logistics-cluster-middle-east-regional-coordination-minutes-2026-05-21',
      sourceRecordId: '2026-05-21:syria-logistics-cluster-update:airports:damascus',
      sourceRecordDate: '2026-05-25',
      accessedAt: '2026-07-08T10:33:17.978Z',
    },
  ],
  sourceStatus: 'released',
};

const exampleRouteSnapshot = {
  id: 'sy-route-jordan-syria-corridor-status-2026-05-25-logistics-cluster',
  name: {
    en: 'Jordan-Syria Corridor',
  },
  routeType: 'corridor',
  transportModes: ['road'],
  observedStatus: 'active',
  statusAsOf: '2026-05-25',
  origin: {
    en: 'Jordan',
  },
  destination: {
    en: 'Syria',
  },
  transitCountries: [],
  locationIds: ['sy-nasib-border-crossing'],
  sourceNames: ['Nasib/Jaber'],
  indicativeLeadTime: '2 days',
  routeNote: 'Timing depends on border congestion and customs clearance.',
  sourceIds: ['logistics-cluster-regional-supply-routes-2026-05-25'],
  sourceReferences: [
    {
      sourceId: 'logistics-cluster-regional-supply-routes-2026-05-25',
      sourceRecordId: '2026-05-25:corridors-into-syria:jordan-syria',
      sourceRecordDate: '2026-05-25',
      accessedAt: '2026-07-08T10:12:08.051Z',
    },
  ],
  sourceStatus: 'released',
};

export const transportLocationListResponseExample = {
  success: true,
  status: 200,
  message: 'Transport locations fetched successfully',
  data: {
    items: [exampleLocation],
    pagination: examplePagination,
    dataset: exampleDataset,
    release: exampleRelease,
  },
  timestamp: exampleTimestamp,
};

export const transportLocationDetailResponseExample = {
  success: true,
  status: 200,
  message: 'Transport location fetched successfully',
  data: {
    item: exampleLocation,
    dataset: exampleDataset,
    release: exampleRelease,
    sources: exampleSources,
  },
  timestamp: exampleTimestamp,
};

export const transportStatusSnapshotListResponseExample = {
  success: true,
  status: 200,
  message: 'Transport status snapshots fetched successfully',
  data: {
    items: [exampleStatusSnapshot],
    pagination: examplePagination,
    dataset: exampleDataset,
    release: exampleRelease,
  },
  timestamp: exampleTimestamp,
};

export const transportStatusSnapshotDetailResponseExample = {
  success: true,
  status: 200,
  message: 'Transport status snapshot fetched successfully',
  data: {
    item: exampleStatusSnapshot,
    dataset: exampleDataset,
    release: exampleRelease,
    sources: exampleSources,
  },
  timestamp: exampleTimestamp,
};

export const transportRouteSnapshotListResponseExample = {
  success: true,
  status: 200,
  message: 'Transport route snapshots fetched successfully',
  data: {
    items: [exampleRouteSnapshot],
    pagination: {
      ...examplePagination,
      totalRecords: 5,
      totalPages: 1,
      nextPage: null,
    },
    dataset: exampleDataset,
    release: exampleRelease,
  },
  timestamp: exampleTimestamp,
};

export const transportRouteSnapshotDetailResponseExample = {
  success: true,
  status: 200,
  message: 'Transport route snapshot fetched successfully',
  data: {
    item: exampleRouteSnapshot,
    dataset: exampleDataset,
    release: exampleRelease,
    sources: exampleSources,
  },
  timestamp: exampleTimestamp,
};
