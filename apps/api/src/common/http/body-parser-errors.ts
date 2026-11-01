import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpException, type HttpExceptionOptions } from '@nestjs/common';
import { ERROR_CODES } from '@portfolio/shared/errors';

/**
 * Replaces a body parser error, so a rejected request can be answered and logged safely.
 *
 * Keeps only its status: its message and `body` can quote what the client sent.
 */
export class BodyRejectedException extends HttpException {
  /**
   * Creates the exception with a fixed message that reveals nothing about the body.
   *
   * @param status - Client error status reported by the parser, such as 400, 413 or 415.
   * @param options - Exception options: at most the `errorCode`, never the parser error as `cause`.
   */
  constructor(status: number, options: HttpExceptionOptions) {
    super('Request body rejected', status, options);
  }
}

/**
 * Tells whether a thrown value declares a client error, as body parser errors do.
 *
 * @param error - Value that reached the error middleware; it can be anything.
 * @returns Whether it is an object with a numeric `status` from 400 to 499.
 */
const isClientError = (error: unknown): error is { status: number } =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  typeof error.status === 'number' &&
  error.status >= 400 &&
  error.status < 500;

/**
 * Translates a body parser rejection into an HttpException, so the client gets its real 4xx.
 *
 * Express error middleware (the four parameters are what makes it one) that must follow the JSON
 * parser. Its errors are not HttpExceptions: untranslated, a `SyntaxError` would become a plain 400
 * without `MALFORMED_JSON` (the only parser error Nest maps by itself) and the others would reach
 * the filter as a 500. Anything that is not a client error passes through unchanged.
 *
 * @param error - Error raised by the middleware before this one.
 * @param _req - Unused; it exists so that Express counts four parameters.
 * @param _res - Unused; it exists so that Express counts four parameters.
 * @param next - Continues the Express error chain, which ends in the exception filter.
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
