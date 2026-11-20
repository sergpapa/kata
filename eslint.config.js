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
      // Local data and run output, never source: the acceptance run extracts lab kits here.
      'data/**',
      'content/releases/**',
      // The editable source of the next release: authored kit code, some of it faulty on purpose.
      'content/source/**',
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
      '@typescript-eslint/no-unused-vars': [
        'error',
        // `ignoreRestSiblings` so `const { secret: _secret, ...rest } = row` is allowed: naming a
        // field in order to drop it is the clearest way to say which field is being dropped, and a
        // hand-written copy list of the survivors silently loses any field added later.
        { argsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['tools/**/*.mjs', 'apps/server/src/index.ts', 'apps/server/src/**/testkit/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
  {
    // Code that runs inside the browser: the client, and page.evaluate bodies in tools/.
    files: ['apps/web/src/**/*.{ts,tsx}', 'tools/**/*.mjs'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
