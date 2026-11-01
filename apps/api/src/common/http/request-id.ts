import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

/** Trace id that opens `X-Cloud-Trace-Context`; whatever follows it is ignored. */
const TRACE_ID = /^[0-9a-f]{32}/i;
/** Shape a client `X-Request-Id` must have: short, and with no characters that could forge logs. */
const CLIENT_REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Reads a request header as a single string, so callers validate only one shape.
 *
 * @param req - Incoming request.
 * @param name - Lowercase header name, as Node stores it.
 * @returns The value, or an empty string when the header is absent or not a single string.
 */
function headerOf(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return typeof value === 'string' ? value : '';
}

/**
 * Extracts the Google Cloud trace id, which ties a request to its trace in Cloud Logging.
 *
 * @param req - Incoming request.
 * @returns The 32 hexadecimal characters of the trace id, or `undefined` when
 *   `X-Cloud-Trace-Context` is absent or does not start with them.
 */
export const traceIdOf = (req: IncomingMessage): string | undefined =>
  TRACE_ID.exec(headerOf(req, 'x-cloud-trace-context'))?.[0];

/**
 * Chooses the id that correlates a request across logs, response headers and problem documents.
 *
 * Preference order: the Google trace id, then the client's `X-Request-Id`, then a new UUID. Header
 * values only count when they match a strict pattern, so the id cannot carry arbitrary text.
 *
 * @param req - Incoming request.
 * @returns The id of the request.
 */
function requestIdOf(req: IncomingMessage): string {
  const clientId = headerOf(req, 'x-request-id');
  return traceIdOf(req) ?? (CLIENT_REQUEST_ID.test(clientId) ? clientId : randomUUID());
}

/**
 * Gives a request its id and tells the client, so a report can be matched to its log entries.
 *
 * The `genReqId` of pino-http, which stores the result in `req.id`. Sets the `X-Request-Id`
 * response header as a side effect.
 *
 * @param req - Incoming request.
 * @param res - Response that receives the header.
 * @returns The id of the request.
 */
export function assignRequestId(req: IncomingMessage, res: ServerResponse): string {
  const requestId = requestIdOf(req);
  res.setHeader('X-Request-Id', requestId);
  return requestId;
}
