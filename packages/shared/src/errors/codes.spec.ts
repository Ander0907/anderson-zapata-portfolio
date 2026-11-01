import { describe, expect, it } from 'vitest';
import { ERROR_CODES, type ErrorCode } from './codes.js';

const EXPECTED = [
  'VALIDATION_FAILED',
  'VALIDATION_INVALID',
  'MALFORMED_JSON',
  'PAYLOAD_TOO_LARGE',
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'HTTP_ERROR',
];

describe('Error code catalogue (A4, ADR-013, ADR-009)', () => {
  it('contains exactly the agreed stable codes', () => {
    expect([...Object.values(ERROR_CODES)].sort()).toEqual([...EXPECTED].sort());
  });

  it.each(EXPECTED)('maps the key %s to the same string value', (code) => {
    expect((ERROR_CODES as Record<string, string>)[code]).toBe(code);
  });

  it('types a catalogue member as ErrorCode', () => {
    const codes: ErrorCode[] = Object.values(ERROR_CODES);

    expect(codes).toContain('NOT_FOUND');
  });
});
