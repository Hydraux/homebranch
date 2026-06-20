export interface EnvironmentVariables {
  DATABASE_HOST: string;
  DATABASE_PORT: number;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_NAME: string;
  CORS_ORIGIN: string;
  JWT_ACCESS_SECRET: string;
  UPLOADS_DIRECTORY: string;
  STORAGE_LOCATION: string;
  APP_URL: string;
  R2_BUCKET: string;
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
}
