import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { LocalitiesController } from './localities.controller';
import { LocalitiesService } from './localities.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [LocalitiesController],
  providers: [LocalitiesService],
})
export class LocalitiesModule {}
