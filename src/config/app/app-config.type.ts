import type { AppLogLevel, Environment } from '../../constants/app.constants';

export type AppCorsOrigin = false | true | '*' | string[];

export type AppConfig = {
  name: string;
  nodeEnv: Environment;
  port: number;
  url: string;
  apiPrefix: string;
  apiVersion: string;
  isHttps: boolean;
  trustProxy: boolean;
  corsOrigin: AppCorsOrigin;
  corsCredentials: boolean;
  docsEnabled: boolean;
  debug: boolean;
  logLevel: AppLogLevel;
  logPretty: boolean;
};
