import type { IncomingMessage } from 'node:http';
import { type DestinationStream, pino } from 'pino';
import type { Options } from 'pino-http';
import { assignRequestId, traceIdOf } from '../http/request-id.js';
import type { Env } from '../../config/env.js';

/** The pino-http middleware; `configureApp` mounts it ahead of everything that can reject. */
export const REQUEST_LOGGER = Symbol('REQUEST_LOGGER');

const TRACE_FIELD = 'logging.googleapis.com/trace';

const REDACTED_PATHS = ['name', 'email', 'message'];

const MAX_LOGGED_URL_LENGTH = 2048;

/** Drops the query first, so that a cut URL can never keep part of it. */
function loggedUrl(url: string): { url: string; urlTruncated?: true } {
  const [path = ''] = url.split('?');
  return path.length > MAX_LOGGED_URL_LENGTH
    ? { url: path.slice(0, MAX_LOGGED_URL_LENGTH), urlTruncated: true }
    : { url: path };
}

/** Allowlists: headers and query strings carry secrets and personal data, so none are logged. */
const REQUEST_SERIALIZERS = {
  req: ({ id, method, url }: { id: unknown; method: string; url: string }) => ({
    id,
    method,
    ...loggedUrl(url),
  }),
  res: ({ statusCode }: { statusCode: number | null }) => ({ statusCode }),
};

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

/** One pino instance, shared by the request logger and nestjs-pino's out-of-request logger. */
export function buildRequestLoggerOptions(env: Env, destination?: DestinationStream): Options {
  const logger = pino(
    {
      level: env.LOG_LEVEL,
      formatters: {
        level: (label) => ({ severity: SEVERITY_OVERRIDES[label] ?? label.toUpperCase() }),
      },
      redact: REDACTED_PATHS,
    },
    destination,
  );
  return {
    logger,
    serializers: REQUEST_SERIALIZERS,
    genReqId: assignRequestId,
    customProps: (req) => traceFieldOf(req, env.GCP_PROJECT_ID),
  };
}
