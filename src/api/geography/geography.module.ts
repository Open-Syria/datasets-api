import { Module } from '@nestjs/common';
import { GovernoratesModule } from './governorates/governorates.module';

@Module({
  imports: [GovernoratesModule],
})
export class GeographyModule {}
