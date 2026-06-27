import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import type { GlobalConfig } from '../../config/config.type';
import { loggingRedactPaths } from '../../constants/app.constants';

export default function useLoggerFactory(configService: ConfigService<GlobalConfig>): Params {
  const appConfig = configService.getOrThrow('app', { infer: true });

  return {
    pinoHttp: {
      level: appConfig.logLevel,
      redact: {
        paths: loggingRedactPaths,
        remove: true,
      },
      autoLogging: appConfig.logLevel !== 'silent',
    },
  };
}
