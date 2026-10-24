import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const processEnvImportPaths = ['node:process', 'process'].map((name) => ({
  name,
  importNames: ['env', 'default'],
  message: 'Read configuration through src/config only.',
}));

/** Imports that domain/ and application/ must never reach (rule D14, manual 7.2). */
const layerRestrictedImports = {
  paths: processEnvImportPaths,
  patterns: [
    {
      group: ['@prisma/*', '**/generated/**', '@nestjs/*', '!@nestjs/common', 'express', 'resend'],
      message:
        'domain/ and application/ must stay framework-free: only @nestjs/common (for @Injectable/@Inject) is allowed.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', 'apps/api/src/generated/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    languageOptions: { globals: globals.node },
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],
      // Configuration is read in one place only (manual 7.5, rule D14).
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read configuration through src/config only; do not touch process.env here.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "VariableDeclarator[init.name='process'] > ObjectPattern > Property[key.name='env']",
          message: 'Do not destructure env from process; read configuration through src/config.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: processEnvImportPaths,
        },
      ],
    },
  },
  {
    files: ['apps/api/src/config/**'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/domain/**', '**/application/**'],
    rules: {
      'no-restricted-imports': ['error', layerRestrictedImports],
    },
  },
  prettier,
);
