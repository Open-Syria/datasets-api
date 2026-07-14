import { Module } from '@nestjs/common';
import { DatasetsModule } from './datasets/datasets.module';
import { GeographyModule } from './geography/geography.module';
import { HealthModule } from './health/health.module';
import { ReleasesModule } from './releases/releases.module';
import { TelecomModule } from './telecom/telecom.module';
import { TransportModule } from './transport/transport.module';
import { UniversitiesModule } from './universities/universities.module';

@Module({
  imports: [
    HealthModule,
    DatasetsModule,
    ReleasesModule,
    GeographyModule,
    UniversitiesModule,
    TransportModule,
    TelecomModule,
  ],
})
export class ApiModule {}
