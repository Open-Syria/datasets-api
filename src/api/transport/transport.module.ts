import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';

@Module({
  imports: [DatasetArtifactsModule],
  controllers: [TransportController],
  providers: [TransportService],
})
export class TransportModule {}
