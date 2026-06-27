import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SourceAttribution } from '../../../common/dto/source-attribution.dto';
import type { DatasetReleaseManifest } from '../../../datasets/contracts/dataset-release-manifest.schema';
import { DatasetReleaseRegistryService } from '../../../datasets/dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from '../../../datasets/loaders/local-dataset-artifact-reader.service';
import {
  type GovernorateDetail,
  type GovernorateList,
  type GovernorateSummary,
  governoratesArtifactSchema,
} from './governorates.dto';

const GEOGRAPHY_DATASET_ID = 'opensyria-geography';
const GOVERNORATES_ARTIFACT_NAME = 'governorates';

type GovernorateReadModel = {
  items: GovernorateSummary[];
  manifest?: DatasetReleaseManifest;
};

@Injectable()
export class GovernoratesService {
  constructor(
    @Inject(DatasetReleaseRegistryService)
    private readonly datasetReleaseRegistryService: DatasetReleaseRegistryService,
    @Inject(LocalDatasetArtifactReaderService)
    private readonly localDatasetArtifactReaderService: LocalDatasetArtifactReaderService,
  ) {}

  async listGovernorates(): Promise<GovernorateList> {
    const readModel = await this.readGovernorates();

    return {
      items: readModel.items,
      count: readModel.items.length,
      dataset: this.buildDatasetContext(readModel.manifest),
      release: this.buildReleaseContext(readModel.manifest),
    };
  }

  async getGovernorate(governorateId: string): Promise<GovernorateDetail> {
    const readModel = await this.readGovernorates();
    const governorate = readModel.items.find((item) => item.id === governorateId);

    if (!governorate) {
      throw new NotFoundException('Governorate not found');
    }

    return {
      item: governorate,
      dataset: this.buildDatasetContext(readModel.manifest),
      release: this.buildReleaseContext(readModel.manifest),
      sources: this.mapSources(readModel.manifest),
    };
  }

  private async readGovernorates(): Promise<GovernorateReadModel> {
    const artifact = await this.localDatasetArtifactReaderService.readJsonArtifact({
      datasetId: GEOGRAPHY_DATASET_ID,
      artifactName: GOVERNORATES_ARTIFACT_NAME,
      schema: governoratesArtifactSchema,
    });
    const manifest =
      artifact?.manifest ??
      this.datasetReleaseRegistryService.getManifestByDatasetId(GEOGRAPHY_DATASET_ID);

    return {
      items: artifact?.data ?? [],
      manifest,
    };
  }

  private buildDatasetContext(manifest?: DatasetReleaseManifest): GovernorateList['dataset'] {
    return {
      id: GEOGRAPHY_DATASET_ID,
      repository: 'data-geography',
      status: manifest?.release.status ?? 'pending_release',
    };
  }

  private buildReleaseContext(manifest?: DatasetReleaseManifest): GovernorateList['release'] {
    const releaseVersion = manifest?.release.version;
    const releasedAt = manifest?.release.publishedAt;

    return releaseVersion && releasedAt ? { version: releaseVersion, releasedAt } : null;
  }

  private mapSources(manifest?: DatasetReleaseManifest): SourceAttribution[] {
    return (
      manifest?.sources.map((source) => ({
        id: source.id,
        title: source.title,
        url: source.url ?? null,
        license: source.license,
        accessedAt: source.accessedAt ?? null,
        fields: source.fields ?? [],
      })) ?? []
    );
  }
}
