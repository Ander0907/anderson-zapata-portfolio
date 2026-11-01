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

const GENERIC_DETAIL = 'An unexpected error occurred.';

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

const isCatalogued = (code: string): code is ErrorCode => Object.hasOwn(ERROR_CODES, code);

function codeOf(exception: unknown, status: number): ErrorCode {
  const errorCode = exception instanceof HttpException ? exception.errorCode : undefined;
  if (errorCode !== undefined && isCatalogued(errorCode)) return errorCode;
  return CODE_BY_STATUS[status] ?? ERROR_CODES.HTTP_ERROR;
}

const isServerError = (status: number): boolean => status >= 500;

const statusOf = (exception: unknown): number =>
  exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

const problemOf = (exception: unknown, status: number, traceId: string): object => ({
  type: 'about:blank',
  title: STATUS_CODES[status] ?? 'Error',
  status,
  code: codeOf(exception, status),
  traceId,
  ...(isServerError(status) && { detail: GENERIC_DETAIL }),
  ...(exception instanceof ValidationFailedException && { errors: exception.errors }),
});

/** Single exit for errors (ADR-013): RFC 9457 documents with a stable code, never internals. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

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
