import type { IncomingMessage, ServerResponse } from 'node:http';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { translateBodyParserError } from './body-parser-errors.js';

const run = (error: unknown): unknown[] => {
  const next = vi.fn();
  translateBodyParserError(error, {} as IncomingMessage, {} as ServerResponse, next);
  return next.mock.calls.map(([passed]) => passed as unknown);
};

describe('Body parser error translation (B3, ADR-013)', () => {
  it('passes a 5xx error through unchanged', () => {
    const error = Object.assign(new Error('upstream'), { status: 503 });

    expect(run(error)).toEqual([error]);
    expect(run(error)[0]).toBe(error);
  });

  it('passes an error without a status through unchanged', () => {
    const error = new Error('plain');

    expect(run(error)[0]).toBe(error);
  });

  it('passes a non-object error through unchanged', () => {
    expect(run('boom')).toEqual(['boom']);
  });

  it('translates a 4xx error into an HttpException with the same status', () => {
    const [passed] = run(Object.assign(new Error('too large'), { status: 413 }));

    expect(passed).toBeInstanceOf(HttpException);
    expect((passed as HttpException).getStatus()).toBe(413);
  });
});
