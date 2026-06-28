import './config/load-env';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { setupApp } from './app.setup';
import { getConfig as getAppConfig } from './config/app/app.config';
import type { GlobalConfig } from './config/config.type';

async function bootstrap() {
  const appConfig = getAppConfig();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      trustProxy: appConfig.trustProxy,
      bodyLimit: appConfig.bodyLimitBytes,
    }),
    {
      bufferLogs: true,
    },
  );

  const configService = app.get(ConfigService<GlobalConfig>);
  const logger = app.get(Logger);

  app.useLogger(logger);
  await setupApp(app, configService);

  await app.listen({ port: appConfig.port, host: '0.0.0.0' });

  logger.log(`Server running at ${await app.getUrl()}`);
}
void bootstrap();
