import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import type { Options } from 'pino-http';
import { traceIdOf } from '../http/request-id.js';
import type { Env } from '../../config/env.js';

const TRACE_FIELD = 'logging.googleapis.com/trace';

const REDACTED_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  'name',
  'email',
  'message',
];

/** Pino levels whose uppercase name is not a Cloud Logging severity. */
const SEVERITY_OVERRIDES: Partial<Record<string, string>> = {
  trace: 'DEBUG',
  warn: 'WARNING',
  fatal: 'CRITICAL',
};

function traceFieldOf(req: IncomingMessage, projectId: string | undefined): object {
  const traceId = traceIdOf(req);
  return projectId && traceId ? { [TRACE_FIELD]: `projects/${projectId}/traces/${traceId}` } : {};
}

export function buildLoggerParams(env: Env, destination?: DestinationStream): Params {
  const options: Options = {
    level: env.LOG_LEVEL,
    formatters: {
      level: (label) => ({ severity: SEVERITY_OVERRIDES[label] ?? label.toUpperCase() }),
    },
    redact: REDACTED_PATHS,
    customProps: (req) => traceFieldOf(req, env.GCP_PROJECT_ID),
  };
  return { pinoHttp: destination ? [options, destination] : options };
}
