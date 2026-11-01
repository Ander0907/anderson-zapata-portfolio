import { z } from 'zod';

/**
 * Contract of the process environment, the only configuration source of the API.
 *
 * A plain `z.object`, not strict: the real environment holds many unrelated variables, which are
 * dropped here instead of rejected. Values arrive as strings, so numbers are coerced.
 * `CORS_ALLOWED_ORIGINS` is comma-separated: entries are trimmed and empty ones removed, so its
 * empty default becomes an empty list.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  GCP_PROJECT_ID: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((origins) =>
      origins
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  RATE_LIMIT_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
});

/** Validated configuration, with defaults applied; obtain it through {@link parseEnv}. */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates raw environment variables, so a bad deployment fails at startup, not at first use.
 *
 * The error lists only the names of the offending variables, because a rejected value may be a
 * secret.
 *
 * @param source - Raw variables by name: `process.env`, or a fixed map in tests and in the OpenAPI
 *   generator. Names the schema does not know are ignored.
 * @returns The typed configuration.
 * @throws {Error} When a variable is missing or invalid; the message names each one once.
 */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Only the variable names: a rejected value may be a secret.
    const names = new Set(result.error.issues.map((issue) => issue.path.join('.')));
    throw new Error(`Invalid environment variables: ${[...names].join(', ')}`);
  }
  return result.data;
}

/**
 * Reads the configuration from `process.env`, which nothing else in the API may touch (ADR-009).
 *
 * @returns The validated configuration.
 * @throws {Error} When a variable is missing or invalid, as reported by {@link parseEnv}.
 */
export function loadEnv(): Env {
  return parseEnv(process.env);
}
