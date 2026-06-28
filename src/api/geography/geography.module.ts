import { Module } from '@nestjs/common';
import { DistrictsModule } from './districts/districts.module';
import { GovernoratesModule } from './governorates/governorates.module';
import { LocalitiesModule } from './localities/localities.module';
import { SubdistrictsModule } from './subdistricts/subdistricts.module';

@Module({
  imports: [GovernoratesModule, DistrictsModule, SubdistrictsModule, LocalitiesModule],
})
export class GeographyModule {}
