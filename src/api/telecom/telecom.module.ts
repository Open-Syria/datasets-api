import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { TelecomController } from './telecom.controller';
import { TelecomService } from './telecom.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [TelecomController],
  providers: [TelecomService],
})
export class TelecomModule {}
