import { Module } from '@nestjs/common';
import { RedisConnectionsService } from './redis-connections.service';

@Module({
  providers: [RedisConnectionsService],
  exports: [RedisConnectionsService],
})
export class RedisConnectionsModule {}
