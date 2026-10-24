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

const frameworkImportPatterns = (nestGroup, message) => ({
  group: [...nestGroup, '@prisma/*', '**/generated/**', 'express', 'resend'],
  message,
});

/** domain/ imports no framework at all (rule D14, manual 7.2). */
const domainRestrictedImports = {
  paths: processEnvImportPaths,
  patterns: [
    frameworkImportPatterns(
      ['@nestjs/*'],
      'domain/ must stay framework-free: no @nestjs/*, Prisma, Express or Resend.',
    ),
  ],
};

/** application/ may only use the DI decorators of @nestjs/common (rule D14, manual 7.2). */
const applicationRestrictedImports = {
  paths: [
    ...processEnvImportPaths,
    {
      name: '@nestjs/common',
      allowImportNames: ['Injectable', 'Inject'],
      message: 'application/ may import only Injectable and Inject from @nestjs/common.',
    },
  ],
  patterns: [
    frameworkImportPatterns(
      ['@nestjs/*', '!@nestjs/common'],
      'application/ must stay framework-free: only Injectable and Inject from @nestjs/common.',
    ),
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
        {
          selector:
            "MemberExpression[object.object.name='globalThis'][object.property.name='process'][property.name='env']",
          message:
            'Do not reach process.env through globalThis; read configuration through src/config.',
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
    // Config is the one reader of process.env; test/support holds DB helpers for integration tests (ADR-018).
    files: ['apps/api/src/config/**', 'apps/api/test/support/**'],
    rules: {
      'no-restricted-properties': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/domain/**'],
    rules: {
      'no-restricted-imports': ['error', domainRestrictedImports],
    },
  },
  {
    files: ['**/application/**'],
    rules: {
      'no-restricted-imports': ['error', applicationRestrictedImports],
    },
  },
  prettier,
);
