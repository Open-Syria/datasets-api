export type DatabaseConfig = {
  enabled: boolean;
  required: boolean;
  url: string | null;
  logQueries: boolean;
};
