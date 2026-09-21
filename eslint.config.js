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
      'HTTP_Curriculum_Depth_and_Lessons_06_08_v1/**',
      'HTTP_Caching_Lessons_09_13_v1/**',
      // Supplied reference material, like the releases above: not this application's source to lint.
      'engineering-practice-ui-design-v1/**',
      // Other tools' worktrees. A second checkout inside the repo is not a second project.
      '.kilo/**',
    ],
  },
  {
    // Stated rather than detected: a worktree checked out inside the repo (see `.kilo/**` above)
    // makes root detection ambiguous, and the lint run must not depend on what other tools left
    // behind.
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
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
