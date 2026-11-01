import {
  type StandardSchemaValidationPipeOptions,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ERROR_CODES } from '@portfolio/shared/errors';

/** Signature that `StandardSchemaValidationPipe` expects from its `exceptionFactory` option. */
type ExceptionFactory = NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>;
/** One Standard Schema validation issue, as the pipe hands it to the factory. */
type Issue = Parameters<ExceptionFactory>[0][number];

/** One rejected input location, as listed in the `errors[]` member of a 422 problem document. */
export interface ValidationError {
  /** RFC 6901 JSON Pointer to the rejected value; the empty string is the whole input. */
  pointer: string;
  /** Code emitted by the schema, or `VALIDATION_INVALID` when the schema emitted none. */
  code: string;
}

/** Schemas emit codes as messages; anything else is raw zod English and must not reach a client. */
const CODE_CONVENTION = /^[A-Z][A-Z0-9_]*$/;

/**
 * Escapes one path segment per RFC 6901, so `~` and `/` in a key cannot be read as structure.
 *
 * `~` goes first: the other way round, the `~` of each new `~1` would be escaped again.
 *
 * @param segment - Object key or array index, already as a string.
 * @returns The segment, safe to place after a `/` in a pointer.
 */
const escapePointerSegment = (segment: string): string =>
  segment.replaceAll('~', '~0').replaceAll('/', '~1');

/**
 * Locates an issue in the input as an RFC 6901 JSON Pointer; the empty string is the root.
 *
 * @param issue - Validation issue. Its path is optional, and each segment is either a bare key or
 *   an object holding the key.
 * @returns The pointer, with every segment escaped.
 */
const pointerOf = ({ path = [] }: Issue): string =>
  path
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map((key) => `/${escapePointerSegment(String(key))}`)
    .join('');

/**
 * Picks the code a client may see for an issue.
 *
 * @param issue - Validation issue, whose message is a code when the schema set one.
 * @returns The message when it follows {@link CODE_CONVENTION}, otherwise `VALIDATION_INVALID`.
 */
const codeOf = ({ message }: Issue): string =>
  CODE_CONVENTION.test(message) ? message : ERROR_CODES.VALIDATION_INVALID;

/**
 * Signals that a well-formed input failed its schema, which ADR-013 answers with a 422.
 *
 * `ProblemDetailsFilter` copies {@link ValidationFailedException.errors} into the problem document.
 */
export class ValidationFailedException extends UnprocessableEntityException {
  /**
   * Creates the exception with a fixed message and the `VALIDATION_FAILED` code.
   *
   * @param errors - Every rejected location; they reach the client as they are.
   */
  constructor(readonly errors: ValidationError[]) {
    super('Validation failed', { errorCode: ERROR_CODES.VALIDATION_FAILED });
  }
}

/**
 * Turns the issues of a failed validation into the exception the global pipe throws (ADR-013).
 *
 * It replaces the pipe's default 400, which would not tell invalid data from malformed JSON.
 *
 * @param issues - Issues reported by the schema; each one becomes an item of `errors[]`.
 * @returns The exception, for the pipe to throw.
 */
export const toValidationFailedException: ExceptionFactory = (issues) =>
  new ValidationFailedException(
    issues.map((issue) => ({ pointer: pointerOf(issue), code: codeOf(issue) })),
  );
