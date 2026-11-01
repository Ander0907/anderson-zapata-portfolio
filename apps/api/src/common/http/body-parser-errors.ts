import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpException, type HttpExceptionOptions } from '@nestjs/common';
import { ERROR_CODES } from '@portfolio/shared/errors';

/** Keeps nothing of the parser error: its message and `body` can quote what the client sent. */
export class BodyRejectedException extends HttpException {
  constructor(status: number, options: HttpExceptionOptions) {
    super('Request body rejected', status, options);
  }
}

const isClientError = (error: unknown): error is { status: number } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number' &&
  error.status >= 400 &&
  error.status < 500;

/**
 * Express error middleware (the four parameters are what makes it one) that must follow the JSON
 * parser. Its errors are not HttpExceptions: untranslated, they would reach the filter as a 500.
 */
export function translateBodyParserError(
  error: unknown,
  _req: IncomingMessage,
  _res: ServerResponse,
  next: (error: unknown) => void,
): void {
  if (!isClientError(error)) {
    next(error);
    return;
  }
  next(
    new BodyRejectedException(
      error.status,
      error instanceof SyntaxError ? { errorCode: ERROR_CODES.MALFORMED_JSON } : {},
    ),
  );
}
