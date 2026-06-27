import { Module } from '@nestjs/common';
import { GovernoratesController } from './governorates.controller';
import { GovernoratesService } from './governorates.service';

@Module({
  controllers: [GovernoratesController],
  providers: [GovernoratesService],
})
export class GovernoratesModule {}
