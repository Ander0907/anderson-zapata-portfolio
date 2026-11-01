import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  GCP_PROJECT_ID: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((origins) => origins.split(',').filter((origin) => origin.length > 0)),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only the variable names: a rejected value may be a secret.
    const names = new Set(result.error.issues.map((issue) => issue.path.join('.')));
    throw new Error(`Invalid environment variables: ${[...names].join(', ')}`);
  }
  return result.data;
}

export function loadEnv(): Env {
  return parseEnv(process.env);
}
