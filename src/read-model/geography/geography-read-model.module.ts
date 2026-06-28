import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { GeographyReadModelImportService } from './geography-read-model-import.service';

@Module({
  imports: [DatabaseModule, DatasetArtifactsModule],
  providers: [GeographyReadModelImportService],
  exports: [GeographyReadModelImportService],
})
export class GeographyReadModelModule {}
