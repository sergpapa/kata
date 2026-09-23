import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Two projects because the two halves need different runtimes: the server talks to SQLite and the
 * filesystem under Node, the client renders into a DOM. One `npm test` runs both.
 */
export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        test: {
          name: 'server',
          environment: 'node',
          include: ['apps/server/src/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'web',
          environment: 'jsdom',
          /**
           * One jsdom per worker instead of one per file, keeping each file its own module
           * registry and its own `document`.
           *
           * The default pool built jsdom 22 times — 223s of construction inside a 64s wall clock
           * on 14 cores — which stretched every test's own clock about 3.5x and timed out
           * `realActivityPlacement.test.tsx` roughly one full-suite run in three. The failure was
           * always a 5000ms timeout and never a wrong value, which is the signature of harness
           * saturation rather than a race in the app. Measured, not guessed: 64.4s with one
           * failure by default, 9.8s and 810/810 here. `isolate: false` is the cheaper-looking
           * alternative and was rejected — it shares the environment *across* files and broke two
           * `unsavedNavigation.test.tsx` assertions outright.
           */
          pool: 'vmThreads',
          include: ['apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
        },
      },
    ],
  },
});
