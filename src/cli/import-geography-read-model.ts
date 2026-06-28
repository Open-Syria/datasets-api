import '../config/load-env';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import cacheConfig from '../config/cache/cache.config';
import useCacheFactory from '../config/cache/cache.factory';
import databaseConfig from '../config/database/database.config';
import datasetsConfig from '../config/datasets/datasets.config';
import redisConfig from '../config/redis/redis.config';
import { GeographyReadModelModule } from '../read-model/geography/geography-read-model.module';
import { GeographyReadModelImportService } from '../read-model/geography/geography-read-model-import.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [redisConfig, cacheConfig, datasetsConfig, databaseConfig],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: useCacheFactory,
    }),
    GeographyReadModelModule,
  ],
})
class ImportGeographyReadModelCliModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(ImportGeographyReadModelCliModule);

  try {
    const importService = app.get(GeographyReadModelImportService);
    const result = await importService.importLatestRelease();

    console.log(
      [
        `Imported ${result.datasetId}@${result.version} into ${result.releaseId}.`,
        `governorates=${result.counts.governorates}`,
        `districts=${result.counts.districts}`,
        `subdistricts=${result.counts.subdistricts}`,
        `localities=${result.counts.localities}`,
        `sources=${result.counts.sources}`,
      ].join(' '),
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
