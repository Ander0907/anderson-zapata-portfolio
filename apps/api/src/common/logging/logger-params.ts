import type { IncomingMessage } from 'node:http';
import { type DestinationStream, pino } from 'pino';
import type { Options } from 'pino-http';
import { assignRequestId, traceIdOf } from '../http/request-id.js';
import type { Env } from '../../config/env.js';

/**
 * Injection token of the pino-http middleware.
 *
 * `configureApp` mounts it first, ahead of every middleware that can reject; Node's own rejections
 * never reach it.
 */
export const REQUEST_LOGGER = Symbol('REQUEST_LOGGER');

/** Log field that Cloud Logging reads to link an entry to its trace (ADR-014). */
const TRACE_FIELD = 'logging.googleapis.com/trace';

/**
 * Personal fields of the contact form, masked in the logs (ADR-014).
 *
 * Paths without wildcards match exactly, so these cover top-level keys of a log entry only, not
 * nested ones.
 */
const REDACTED_PATHS = ['name', 'email', 'message'];

/** Longest logged URL; it limits the log volume that a client can cause (ADR-014). */
const MAX_LOGGED_URL_LENGTH = 2048;

/**
 * Drops the query first, so that a cut URL can never keep part of it.
 *
 * @param url - Request URL, which may have a query string.
 * @returns The URL without its query string, cut to `MAX_LOGGED_URL_LENGTH` with `urlTruncated` set
 *   when longer.
 */
function loggedUrl(url: string): { url: string; urlTruncated?: true } {
  const [path = ''] = url.split('?');
  return path.length > MAX_LOGGED_URL_LENGTH
    ? { url: path.slice(0, MAX_LOGGED_URL_LENGTH), urlTruncated: true }
    : { url: path };
}

/** Allowlists: headers and query strings carry secrets and personal data, so none are logged. */
const REQUEST_SERIALIZERS = {
  /**
   * Reduces a request to the fields that are safe to log.
   *
   * @param req - Request as pino-http presents it to serializers; its URL may have a query string.
   * @returns The id, the method and the URL without its query string, cut to
   *   `MAX_LOGGED_URL_LENGTH` with `urlTruncated` set when longer.
   */
  req: ({ id, method, url }: { id: unknown; method: string; url: string }) => ({
    id,
    method,
    ...loggedUrl(url),
  }),
  /**
   * Reduces a response to the field that is safe to log.
   *
   * @param res - Response as pino-http presents it to serializers.
   * @returns The status code, which is `null` while the headers have not been sent.
   */
  res: ({ statusCode }: { statusCode: number | null }) => ({ statusCode }),
};

/** Pino levels whose uppercase name is not a Cloud Logging severity. */
const SEVERITY_OVERRIDES: Partial<Record<string, string>> = {
  trace: 'DEBUG',
  warn: 'WARNING',
  fatal: 'CRITICAL',
};

/**
 * Builds the log field that links an entry to its trace, when both of its parts are known.
 *
 * @param req - Incoming request, source of the trace id.
 * @param projectId - Google Cloud project id; `undefined` when it is not configured.
 * @returns An object to merge into a log entry: the trace field, or nothing.
 */
function traceFieldOf(req: IncomingMessage, projectId: string | undefined): object {
  const traceId = traceIdOf(req);
  return projectId && traceId ? { [TRACE_FIELD]: `projects/${projectId}/traces/${traceId}` } : {};
}

/**
 * Builds the pino-http options that make every log line a redacted Cloud Logging entry.
 *
 * One pino instance, shared by the request logger and nestjs-pino's out-of-request logger: both
 * receive these options, and pino-http derives its logger from that instance.
 *
 * @param env - Validated configuration; sets the log level and the project of the trace field.
 * @param destination - Stream that receives the log lines; without it, pino writes to stdout.
 * @returns Options for pino-http and for the `pinoHttp` setting of nestjs-pino.
 */
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
