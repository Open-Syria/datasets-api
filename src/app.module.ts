import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { ApiModule } from './api/api.module';
import appConfig from './config/app/app.config';
import cacheConfig from './config/cache/cache.config';
import useCacheFactory from './config/cache/cache.factory';
import i18nConfig from './config/i18n/i18n.config';
import redisConfig from './config/redis/redis.config';
import throttlerConfig from './config/throttler/throttler.config';
import useThrottlerFactory from './config/throttler/throttler.factory';
import { Environment } from './constants/app.constants';
import { GlobalHttpExceptionFilter } from './exception-filters/http-exception.filter';
import { ZodValidationExceptionFilter } from './exception-filters/zod-validation-exception.filter';
import useI18nFactory from './i18n/i18n.factory';
import { RedisConnectionsModule } from './shared/redis/redis-connections.module';
import useLoggerFactory from './tools/logger/logger-factory';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      load: [appConfig, redisConfig, cacheConfig, throttlerConfig, i18nConfig],
    }),
    ...(process.env.NODE_ENV === Environment.Test ? [] : [GracefulShutdownModule.forRoot()]),
    I18nModule.forRootAsync({
      loader: I18nJsonLoader,
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
      inject: [ConfigService],
      useFactory: useI18nFactory,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: useLoggerFactory,
    }),
    RedisConnectionsModule,
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: useCacheFactory,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: useThrottlerFactory,
    }),
    ApiModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalHttpExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ZodValidationExceptionFilter,
    },
  ],
})
export class AppModule {}
