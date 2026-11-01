import type { DestinationStream } from 'pino';

export type LogEntry = Record<string, unknown>;

export interface LogCollector {
  readonly destination: DestinationStream;
  entries(): LogEntry[];
  raw(): string;
  clear(): void;
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
    clear: () => {
      lines.length = 0;
    },
  };
}

/**
 * Process-wide collector. nestjs-pino keeps one pino-http instance per module registry, so the
 * first app built in a spec file fixes the log destination for every later app in that file.
 * Every test therefore shares this destination and clears it in beforeEach. Vitest isolates
 * modules per spec file, so each file gets its own logger configuration.
 */
export const sharedLogs: LogCollector = createLogCollector();
