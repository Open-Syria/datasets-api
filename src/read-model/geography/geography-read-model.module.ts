import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { GeographyReadModelImportService } from './geography-read-model-import.service';
import { GeographyReadModelQueryService } from './geography-read-model-query.service';

@Module({
  imports: [DatabaseModule, DatasetArtifactsModule],
  providers: [GeographyReadModelImportService, GeographyReadModelQueryService],
  exports: [GeographyReadModelImportService, GeographyReadModelQueryService],
})
export class GeographyReadModelModule {}
