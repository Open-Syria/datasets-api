import { Injectable } from '@nestjs/common';
import type { ReleaseSummaryList } from './releases.dto';

const RELEASES: ReleaseSummaryList['items'] = [
  {
    id: 'opensyria-seed-planning',
    version: null,
    status: 'seed',
    publishedAt: null,
    datasets: [
      {
        datasetId: 'opensyria-geography',
        repository: 'data-geography',
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-universities',
        repository: 'data-universities',
        status: 'seed',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-transport',
        repository: 'data-transport',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-heritage',
        repository: 'data-heritage',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
      {
        datasetId: 'opensyria-telecom',
        repository: 'data-telecom',
        status: 'planned',
        releaseVersion: null,
        manifestPath: 'release-manifest.json',
      },
    ],
    artifacts: [],
    notes:
      'Initial release planning metadata. Dataset artifacts will be attached after the data repositories publish versioned releases.',
  },
];

@Injectable()
export class ReleasesService {
  listReleases(): ReleaseSummaryList {
    return {
      items: RELEASES,
      count: RELEASES.length,
    };
  }
}
