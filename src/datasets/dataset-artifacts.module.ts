import { Module } from '@nestjs/common';
import { DatasetReleaseRegistryService } from './dataset-release-registry.service';
import { LocalDatasetManifestLoader } from './loaders/local-dataset-manifest-loader.service';

@Module({
  providers: [DatasetReleaseRegistryService, LocalDatasetManifestLoader],
  exports: [DatasetReleaseRegistryService],
})
export class DatasetArtifactsModule {}
