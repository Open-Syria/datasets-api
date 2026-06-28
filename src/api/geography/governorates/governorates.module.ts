import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { GeographyReadModelModule } from '../../../read-model/geography/geography-read-model.module';
import { GovernoratesController } from './governorates.controller';
import { GovernoratesService } from './governorates.service';

@Module({
  imports: [DatasetArtifactsModule, GeographyReadModelModule],
  controllers: [GovernoratesController],
  providers: [GovernoratesService],
})
export class GovernoratesModule {}
