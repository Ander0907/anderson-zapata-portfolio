import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src'],
      exclude: ['**/*.spec.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
