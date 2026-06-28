import '../config/load-env';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from '../app.module';
import { GeographyReadModelImportService } from '../read-model/geography/geography-read-model-import.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(Logger);
  app.useLogger(logger);

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
