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
import { PinoLogger } from 'nestjs-pino';
import { ValidationFailedException } from './validation-failed.exception.js';

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
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const status = statusOf(exception);
    const traceId = http.getRequest<{ id: string }>().id;

    if (isServerError(status)) {
      this.logger.error({ err: exception, traceId }, 'Request failed');
    }

    const { httpAdapter } = this.adapterHost;
    const response: unknown = http.getResponse();
    httpAdapter.setHeader(response, 'Content-Type', 'application/problem+json');
    httpAdapter.reply(response, problemOf(exception, status, traceId), status);
  }
}
