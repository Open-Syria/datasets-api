import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { GeographyReadModelModule } from '../../../read-model/geography/geography-read-model.module';
import { DistrictsController } from './districts.controller';
import { DistrictsService } from './districts.service';

@Module({
  imports: [DatasetArtifactsModule, GeographyReadModelModule],
  controllers: [DistrictsController],
  providers: [DistrictsService],
})
export class DistrictsModule {}
