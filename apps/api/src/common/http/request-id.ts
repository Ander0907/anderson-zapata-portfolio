import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const TRACE_ID = /^[0-9a-f]{32}/i;
const CLIENT_REQUEST_ID = /^[A-Za-z0-9-]{1,64}$/;

function headerOf(req: IncomingMessage, name: string): string {
  const value = req.headers[name];
  return typeof value === 'string' ? value : '';
}

export const traceIdOf = (req: IncomingMessage): string | undefined =>
  TRACE_ID.exec(headerOf(req, 'x-cloud-trace-context'))?.[0];

function requestIdOf(req: IncomingMessage): string {
  const clientId = headerOf(req, 'x-request-id');
  return traceIdOf(req) ?? (CLIENT_REQUEST_ID.test(clientId) ? clientId : randomUUID());
}

/**
 * Runs before the body parser, unlike the pino-http middleware, so that requests rejected there
 * still carry a request id. pino-http keeps an existing `req.id`.
 */
export function assignRequestId(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const requestId = requestIdOf(req);
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}
