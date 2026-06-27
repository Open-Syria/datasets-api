import { Inject, Injectable } from '@nestjs/common';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import type { GovernorateList } from './governorates.dto';

@Injectable()
export class GovernoratesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
  ) {}

  listGovernorates(): GovernorateList {
    const manifest =
      this.datasetReleaseRegistryService.getManifestByDatasetId('opensyria-geography');
    const releaseVersion = manifest?.release.version;
    const releasedAt = manifest?.release.publishedAt;

    return {
      items: [],
      count: 0,
      dataset: {
        id: 'opensyria-geography',
        repository: 'data-geography',
        status: manifest?.release.status ?? 'pending_release',
      },
      release: releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null,
    };
  }
}
