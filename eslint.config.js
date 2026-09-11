import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'screenshots/**',
      'test-results/**',
      'playwright-report/**',
      'VS_Code_App_and_First_Five_Lessons_v1/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tools/**/*.mjs', 'apps/server/src/index.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // Code that runs inside the browser: the client, and page.evaluate bodies in tools/.
    files: ['apps/web/src/**/*.{ts,tsx}', 'tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
