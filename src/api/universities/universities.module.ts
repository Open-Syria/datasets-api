import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { UniversitiesController } from './universities.controller';
import { UniversitiesService } from './universities.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [UniversitiesController],
  providers: [UniversitiesService],
})
export class UniversitiesModule {}
