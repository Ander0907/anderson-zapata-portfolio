export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  LOG_LEVEL: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  GCP_PROJECT_ID?: string;
  CORS_ALLOWED_ORIGINS: string[];
  RATE_LIMIT_TTL_SECONDS: number;
  RATE_LIMIT_MAX: number;
}

// Inert seam: the validating implementation arrives with the GREEN step.
export function parseEnv(source: Record<string, string | undefined>): Env {
  return source as unknown as Env;
}

export function loadEnv(): Env {
  return process.env as unknown as Env;
}
