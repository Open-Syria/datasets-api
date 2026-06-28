import { Module } from '@nestjs/common';
import { DatasetArtifactsModule } from '../../datasets/dataset-artifacts.module';
import { PublicDataCacheModule } from '../../shared/cache/public-data-cache.module';
import { ReleasesController } from './releases.controller';
import { ReleasesService } from './releases.service';

@Module({
  imports: [DatasetArtifactsModule, PublicDataCacheModule],
  controllers: [ReleasesController],
  providers: [ReleasesService],
})
export class ReleasesModule {}
