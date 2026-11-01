import { STATUS_CODES } from 'node:http';
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ERROR_CODES, type ErrorCode } from '@portfolio/shared/errors';
import type { Logger } from 'pino';
import { BodyRejectedException } from '../http/body-parser-errors.js';
import { ValidationFailedException } from './validation-failed.exception.js';

/** What pino-http leaves on the request. `log` also works before nestjs-pino binds its context. */
interface LoggedRequest {
  id: string;
  log: Logger;
}

/** Fixed `detail` of every 5xx problem; the real cause only goes to the log (ADR-013). */
const GENERIC_DETAIL = 'An unexpected error occurred.';

/** Code of each status for exceptions without a catalogued `errorCode`; others get `HTTP_ERROR`. */
const CODE_BY_STATUS: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_REQUEST,
  [HttpStatus.UNAUTHORIZED]: ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ERROR_CODES.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ERROR_CODES.RATE_LIMITED,
  [HttpStatus.INTERNAL_SERVER_ERROR]: ERROR_CODES.INTERNAL_ERROR,
};

/**
 * Tells whether a code belongs to the catalogue, so an unknown one never reaches a client.
 *
 * `Object.hasOwn` keeps inherited names such as `toString` out.
 *
 * @param code - Value of an exception's `errorCode`.
 * @returns Whether it is a key of `ERROR_CODES`, whose keys equal their values.
 */
const isCatalogued = (code: string): code is ErrorCode => Object.hasOwn(ERROR_CODES, code);

/**
 * Picks the stable code of a problem document.
 *
 * @param exception - Whatever was thrown.
 * @param status - Status of the response.
 * @returns The `errorCode` of an HttpException when it is catalogued; otherwise the code of the
 *   status, or `HTTP_ERROR` when the status has none.
 */
function codeOf(exception: unknown, status: number): ErrorCode {
  const errorCode = exception instanceof HttpException ? exception.errorCode : undefined;
  if (errorCode !== undefined && isCatalogued(errorCode)) return errorCode;
  return CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;
}

/**
 * Tells server failures from client errors: only the former get the generic `detail`, and client
 * errors log an ERROR only after the headers were sent.
 *
 * @param status - Status of the response.
 * @returns Whether the status is 500 or above.
 */
const isServerError = (status: number): boolean => status >= 500;

/**
 * Resolves the status of the response for whatever was thrown.
 *
 * @param exception - Whatever was thrown.
 * @returns The status of an HttpException; 500 for anything else.
 */
const statusOf = (exception: unknown): number =>
  exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

/**
 * Builds the RFC 9457 document sent to the client, which never includes the exception's message.
 *
 * Only 5xx problems have a `detail`, always the generic one, and only validation failures have
 * `errors[]`.
 *
 * @param exception - Whatever was thrown.
 * @param status - Status of the response, which also selects the standard `title`.
 * @param traceId - Request id, the value that links the document to the log entries.
 * @returns The problem document.
 */
const problemOf = (exception: unknown, status: number, traceId: string): object => ({
  type: 'about:blank',
  title: STATUS_CODES[status] ?? 'Error',
  status,
  code: codeOf(exception, status),
  traceId,
  ...(isServerError(status) && { detail: GENERIC_DETAIL }),
  ...(exception instanceof ValidationFailedException && { errors: exception.errors }),
});

/**
 * Single exit for errors (ADR-013): RFC 9457 documents with a stable code, never internals.
 *
 * The empty `@Catch()` makes it receive everything, not only HttpExceptions.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  /**
   * Keeps the access to the HTTP adapter that writes the responses.
   *
   * @param adapterHost - Holder of the active HTTP adapter.
   */
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  /**
   * Logs the failure when the access log is not enough, and answers with a problem document.
   *
   * Once the headers are sent, the status and the body can no longer change, so the response is
   * only ended and the client gets no problem document.
   *
   * @param exception - Whatever was thrown.
   * @param host - Nest execution context, from which the HTTP request and response are taken.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const { httpAdapter } = this.adapterHost;
    const status = statusOf(exception);
    const request = http.getRequest<LoggedRequest>();
    const response: unknown = http.getResponse();
    const headersSent = Boolean(httpAdapter.isHeadersSent(response));

    this.log(exception, status, request, headersSent);

    if (headersSent) {
      httpAdapter.end(response);
      return;
    }
    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, problemOf(exception, status, request.id), status);
  }

  /**
   * Records the failures that the access log of pino-http would not explain by itself.
   *
   * Server errors and errors after the headers were sent log the exception as an ERROR. Rejected
   * bodies log a WARNING with the status and nothing from the body or the parser error (ADR-014).
   * Other client errors log nothing here.
   *
   * @param exception - Whatever was thrown.
   * @param status - Status of the response, or the one it would have had if headers were sent.
   * @param request - Request whose logger and id are used.
   * @param headersSent - Whether the response had already started.
   */
  private log(
    exception: unknown,
    status: number,
    request: LoggedRequest,
    headersSent: boolean,
  ): void {
    if (isServerError(status) || headersSent) {
      request.log.error({ err: exception, traceId: request.id }, 'Request failed');
    } else if (exception instanceof BodyRejectedException) {
      request.log.warn({ status }, 'Request body rejected');
    }
  }
}
