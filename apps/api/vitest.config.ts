import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolve @portfolio/shared to its TypeScript source in tests (no build needed). Vitest resolves
  // server-side imports through ssr.resolve, so the condition is set in both places.
  resolve: { conditions: ['@portfolio/source'] },
  ssr: { resolve: { conditions: ['@portfolio/source'] } },
  test: {
    // Each project passes with no files yet; the TDD branches add the first tests.
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // Projects run in parallel unless groupOrder differs: keep unit -> integration -> e2e.
          sequence: { groupOrder: 0 },
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          // Projects run in parallel unless groupOrder differs: keep unit -> integration -> e2e.
          sequence: { groupOrder: 1 },
          include: ['src/**/*.int-spec.ts'],
          // Integration tests share one PostgreSQL database and TRUNCATE between tests (D15).
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          // Projects run in parallel unless groupOrder differs: keep unit -> integration -> e2e.
          sequence: { groupOrder: 2 },
          include: ['test/e2e/**/*.e2e-spec.ts'],
          fileParallelism: false,
        },
      },
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/main.ts', '**/*.spec.ts', '**/*.int-spec.ts'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        // G10: unlike Jest, files matched by a glob threshold ALSO count toward the global
        // threshold above, and glob thresholds do not inherit `perFile`. Raising the bar for
        // domain/ and application/ therefore never lowers what the rest must reach overall.
        'src/modules/**/{domain,application}/**': {
          lines: 90,
          functions: 90,
          branches: 90,
          statements: 90,
        },
      },
    },
  },
});
