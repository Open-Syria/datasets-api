import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { SubdistrictsController } from './subdistricts.controller';
import { SubdistrictsService } from './subdistricts.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [SubdistrictsController],
  providers: [SubdistrictsService],
})
export class SubdistrictsModule {}
