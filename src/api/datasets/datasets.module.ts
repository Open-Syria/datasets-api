import { Module } from '@nestjs/common';
import { PublicDataCacheModule } from '../../shared/cache/public-data-cache.module';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';

@Module({
  imports: [PublicDataCacheModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
})
export class DatasetsModule {}
