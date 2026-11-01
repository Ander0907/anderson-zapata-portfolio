import {
  type StandardSchemaValidationPipeOptions,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ERROR_CODES } from '@portfolio/shared/errors';

type ExceptionFactory = NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>;
type Issue = Parameters<ExceptionFactory>[0][number];

export interface ValidationError {
  pointer: string;
  code: string;
}

/** Schemas emit codes as messages; anything else is raw zod English and must not reach a client. */
const CODE_CONVENTION = /^[A-Z][A-Z0-9_]*$/;

const escapePointerSegment = (segment: string): string =>
  segment.replaceAll('~', '~0').replaceAll('/', '~1');

/** RFC 6901 JSON Pointer of the issue path; the empty string is the root. */
const pointerOf = ({ path = [] }: Issue): string =>
  path
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map((key) => `/${escapePointerSegment(String(key))}`)
    .join('');

const codeOf = ({ message }: Issue): string =>
  CODE_CONVENTION.test(message) ? message : ERROR_CODES.VALIDATION_INVALID;

export class ValidationFailedException extends UnprocessableEntityException {
  constructor(readonly errors: ValidationError[]) {
    super('Validation failed', { errorCode: ERROR_CODES.VALIDATION_FAILED });
  }
}

export const toValidationFailedException: ExceptionFactory = (issues) =>
  new ValidationFailedException(
    issues.map((issue) => ({ pointer: pointerOf(issue), code: codeOf(issue) })),
  );
