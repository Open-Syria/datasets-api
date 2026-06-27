import { Module } from '@nestjs/common';
import { DatasetsModule } from './datasets/datasets.module';
import { GeographyModule } from './geography/geography.module';
import { HealthModule } from './health/health.module';
import { ReleasesModule } from './releases/releases.module';

@Module({
  imports: [HealthModule, DatasetsModule, ReleasesModule, GeographyModule],
})
export class ApiModule {}
