import { Inject, Injectable } from '@nestjs/common';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type GovernorateList,
  type GovernorateSummary,
  governoratesArtifactSchema,
} from './governorates.dto';

const GEOGRAPHY_DATASET_ID = 'opensyria-geography';
const GOVERNORATES_ARTIFACT_NAME = 'governorates';

@Injectable()
export class GovernoratesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listGovernorates(): Promise<GovernorateList> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: GOVERNORATES_ARTIFACT_NAME,
      schema: governoratesArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);
    const releaseVersion = manifest?.release.version;
    const releasedAt = manifest?.release.publishedAt;
    const items: GovernorateSummary[] = artifact?.data ?? [];

    return {
      items,
      count: items.length,
      dataset: {
        id: GEOGRAPHY_DATASET_ID,
        repository: 'data-geography',
        status: manifest?.release.status ?? 'pending_release',
      },
      release: releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null,
    };
  }
}
