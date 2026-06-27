import { Module } from '@nestjs/common';
import { DatasetReleaseRegistryService } from './dataset-release-registry.service';
import { LocalDatasetArtifactReaderService } from './loaders/local-dataset-artifact-reader.service';
import { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';

@Module({
  providers: [
    DatasetReleaseRegistryService,
    LocalDatasetArtifactReaderService,
    LocalDatasetManifestLoader,
  ],
  exports: [DatasetReleaseRegistryService, LocalDatasetArtifactReaderService],
})
export class DatasetArtifactsModule {}
