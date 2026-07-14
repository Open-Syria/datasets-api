export type PublicDatasetEndpointContract = {
  owner: 'Open-Syria';
  repository: string;
  datasetId: string;
  slug: string;
  openApiDocumentPath: string;
  routes: readonly string[];
};

export const publicDatasetEndpointContracts = [
  {
    owner: 'Open-Syria',
    repository: 'data-geography',
    datasetId: 'opensyria-geography',
    slug: 'geography',
    openApiDocumentPath: '/openapi/geography.json',
    routes: [
      '/api/v1/geography/governorates',
      '/api/v1/geography/governorates/{governorateId}',
      '/api/v1/geography/districts',
      '/api/v1/geography/districts/{districtId}',
      '/api/v1/geography/subdistricts',
      '/api/v1/geography/subdistricts/{subdistrictId}',
      '/api/v1/geography/localities',
      '/api/v1/geography/localities/{localityId}',
    ],
  },
  {
    owner: 'Open-Syria',
    repository: 'data-universities',
    datasetId: 'opensyria-universities',
    slug: 'universities',
    openApiDocumentPath: '/openapi/universities.json',
    routes: ['/api/v1/universities', '/api/v1/universities/{universityId}'],
  },
  {
    owner: 'Open-Syria',
    repository: 'data-transport',
    datasetId: 'opensyria-transport',
    slug: 'transport',
    openApiDocumentPath: '/openapi/transport.json',
    routes: [
      '/api/v1/transport/locations',
      '/api/v1/transport/locations/{locationId}',
      '/api/v1/transport/status-snapshots',
      '/api/v1/transport/status-snapshots/{statusSnapshotId}',
      '/api/v1/transport/route-snapshots',
      '/api/v1/transport/route-snapshots/{routeSnapshotId}',
    ],
  },
  {
    owner: 'Open-Syria',
    repository: 'data-telecom',
    datasetId: 'opensyria-telecom',
    slug: 'telecom',
    openApiDocumentPath: '/openapi/telecom.json',
    routes: [
      '/api/v1/telecom/country-numbering-plans',
      '/api/v1/telecom/country-numbering-plans/{countryNumberingPlanId}',
      '/api/v1/telecom/operators',
      '/api/v1/telecom/operators/{operatorId}',
      '/api/v1/telecom/fixed-area-codes',
      '/api/v1/telecom/fixed-area-codes/{fixedAreaCodeId}',
      '/api/v1/telecom/mobile-prefixes',
      '/api/v1/telecom/mobile-prefixes/{mobilePrefixId}',
      '/api/v1/telecom/number-ranges',
      '/api/v1/telecom/number-ranges/{numberRangeId}',
    ],
  },
] as const satisfies readonly PublicDatasetEndpointContract[];

export function findPublicDatasetEndpointContract(owner: string, repository: string) {
  return publicDatasetEndpointContracts.find(
    (contract) => contract.owner === owner && contract.repository === repository,
  );
}

export function getPublicDatasetEndpointRoutes(repository: string) {
  return (
    publicDatasetEndpointContracts.find((contract) => contract.repository === repository)?.routes ??
    []
  );
}
