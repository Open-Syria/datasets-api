import { Module } from '@nestjs/common';
import { PublicDataCacheService } from './public-data-cache.service';

@Module({
  providers: [PublicDataCacheService],
  exports: [PublicDataCacheService],
})
export class PublicDataCacheModule {}
