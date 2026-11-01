import type { DestinationStream } from 'pino';

export type LogEntry = Record<string, unknown>;

export interface LogCollector {
  readonly destination: DestinationStream;
  entries(): LogEntry[];
  raw(): string;
}

/** In-memory pino destination: lets tests assert on what the application logged. */
export function createLogCollector(): LogCollector {
  const lines: string[] = [];
  return {
    destination: {
      write(chunk: string): void {
        lines.push(...chunk.split('\n').filter((line) => line.length > 0));
      },
    },
    entries: () =>
      lines.map((line) => {
        try {
          return JSON.parse(line) as LogEntry;
        } catch {
          return { unparsable: line };
        }
      }),
    raw: () => lines.join('\n'),
  };
}
