/**
 * Catalogue of the stable, machine-readable error codes of the API contract.
 *
 * Clients branch on these values instead of parsing text (ADR-013), so changing one is a breaking
 * change. Every key equals its value.
 */
export const ERROR_CODES = {
  /** 422: the input is well formed but failed its schema; `errors[]` lists each location. */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** Item of `errors[]` whose schema issue carried no code of its own. */
  VALIDATION_INVALID: 'VALIDATION_INVALID',
  /** 400: the request body is not valid JSON. */
  MALFORMED_JSON: 'MALFORMED_JSON',
  /** 413: the request body exceeds the size limit. */
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  /** 400 without a more specific code. */
  BAD_REQUEST: 'BAD_REQUEST',
  /** 401 without a more specific code. */
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** 403 without a more specific code. */
  FORBIDDEN: 'FORBIDDEN',
  /** 404, including routes that do not exist. */
  NOT_FOUND: 'NOT_FOUND',
  /** 409 without a more specific code. */
  CONFLICT: 'CONFLICT',
  /** 429: the client exceeded the rate limit. */
  RATE_LIMITED: 'RATE_LIMITED',
  /** 500: an unexpected failure, whose cause only goes to the log. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  /** Any other error status, such as a 415 from the body parser. */
  HTTP_ERROR: 'HTTP_ERROR',
} as const;

/** Any value of the {@link ERROR_CODES} catalogue. */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
