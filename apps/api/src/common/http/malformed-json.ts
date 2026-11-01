import type { IncomingMessage, ServerResponse } from 'node:http';
import { BadRequestException } from '@nestjs/common';
import { ERROR_CODES } from '@portfolio/shared/errors';

/**
 * Express error middleware (the four parameters are what makes it one) that must follow the JSON
 * parser: past this point Nest turns a SyntaxError into a plain 400 and the code would be lost.
 */
export function rejectMalformedJson(
  error: unknown,
  _req: IncomingMessage,
  _res: ServerResponse,
  next: (error: unknown) => void,
): void {
  next(
    error instanceof SyntaxError
      ? new BadRequestException('Malformed JSON', { errorCode: ERROR_CODES.MALFORMED_JSON })
      : error,
  );
}
