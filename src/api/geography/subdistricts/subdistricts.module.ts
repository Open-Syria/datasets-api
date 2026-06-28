import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { GeographyReadModelModule } from '../../../read-model/geography/geography-read-model.module';
import { SubdistrictsController } from './subdistricts.controller';
import { SubdistrictsService } from './subdistricts.service';

@Module({
  imports: [DatasetArtifactsModule, GeographyReadModelModule],
  controllers: [SubdistrictsController],
  providers: [SubdistrictsService],
})
export class SubdistrictsModule {}
