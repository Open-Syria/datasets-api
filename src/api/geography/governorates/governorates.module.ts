import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../../datasets/dataset-artifacts.module';
import { GovernoratesController } from './governorates.controller';
import { GovernoratesService } from './governorates.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [GovernoratesController],
  providers: [GovernoratesService],
})
export class GovernoratesModule {}
