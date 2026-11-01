import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadEnv, parseEnv } from './env.js';

const messageOf = (action: () => unknown): string => {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error('Expected the call to throw');
};

describe('Environment validation (A1, ADR-009, D2)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('applies the documented defaults for an empty environment', () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: 'development',
      PORT: 8080,
      LOG_LEVEL: 'info',
      CORS_ALLOWED_ORIGINS: [],
      RATE_LIMIT_TTL_SECONDS: 60,
      RATE_LIMIT_MAX: 100,
    });
  });

  it('coerces numeric variables from strings', () => {
    const env = parseEnv({ PORT: '3000', RATE_LIMIT_TTL_SECONDS: '30', RATE_LIMIT_MAX: '5' });

    expect(env.PORT).toBe(3000);
    expect(env.RATE_LIMIT_TTL_SECONDS).toBe(30);
    expect(env.RATE_LIMIT_MAX).toBe(5);
  });

  it('keeps GCP_PROJECT_ID when provided', () => {
    expect(parseEnv({ GCP_PROJECT_ID: 'my-project' }).GCP_PROJECT_ID).toBe('my-project');
  });

  it('splits CORS_ALLOWED_ORIGINS into a list of exact origins', () => {
    const env = parseEnv({ CORS_ALLOWED_ORIGINS: 'https://a.example,https://b.example' });

    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it.each(['development', 'test', 'production'])('accepts NODE_ENV=%s', (value) => {
    expect(parseEnv({ NODE_ENV: value }).NODE_ENV).toBe(value);
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['PORT', 'abc'],
    ['PORT', '0'],
    ['PORT', '65536'],
    ['LOG_LEVEL', 'verbose'],
  ])('rejects %s=%s', (name, value) => {
    expect(() => parseEnv({ [name]: value })).toThrow();
  });

  it.each(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])(
    'accepts the pino level %s',
    (level) => {
      expect(parseEnv({ LOG_LEVEL: level }).LOG_LEVEL).toBe(level);
    },
  );

  it('names the offending variable in the error', () => {
    expect(messageOf(() => parseEnv({ PORT: 'abc' }))).toContain('PORT');
  });

  it('never echoes the offending value in the error', () => {
    expect(messageOf(() => parseEnv({ LOG_LEVEL: 'super-secret-value-123' }))).not.toContain(
      'super-secret-value-123',
    );
  });

  it('fails fast when the process environment is invalid', () => {
    vi.stubEnv('PORT', 'not-a-port');

    expect(() => loadEnv()).toThrow(/PORT/);
  });

  it('loads a valid process environment with defaults applied', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('LOG_LEVEL', 'warn');
    vi.stubEnv('RATE_LIMIT_MAX', '7');

    expect(loadEnv()).toMatchObject({ NODE_ENV: 'test', LOG_LEVEL: 'warn', RATE_LIMIT_MAX: 7 });
  });
});
