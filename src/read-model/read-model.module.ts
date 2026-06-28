import { Module } from '@nestjs/common';
import { GeographyReadModelModule } from './geography/geography-read-model.module';

@Module({
  imports: [GeographyReadModelModule],
  exports: [GeographyReadModelModule],
})
export class ReadModelModule {}
