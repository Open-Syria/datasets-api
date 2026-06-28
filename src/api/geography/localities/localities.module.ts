import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { GeographyReadModelModule } from '../../../read-model/geography/geography-read-model.module';
import { LocalitiesController } from './localities.controller';
import { LocalitiesService } from './localities.service';

@Module({
  imports: [DatasetArtifactsModule, GeographyReadModelModule],
  controllers: [LocalitiesController],
  providers: [LocalitiesService],
})
export class LocalitiesModule {}
