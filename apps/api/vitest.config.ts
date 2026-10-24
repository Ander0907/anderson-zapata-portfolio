import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each project passes with no files yet; the TDD branches add the first tests.
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.spec.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.int-spec.ts'],
          // Integration tests share one PostgreSQL database and TRUNCATE between tests (D15).
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/**/*.e2e-spec.ts'],
          fileParallelism: false,
        },
      },
    ],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src'],
      exclude: [
        'src/generated/**',
        '**/*.module.ts',
        'src/main.ts',
        '**/*.spec.ts',
        '**/*.int-spec.ts',
      ],
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
