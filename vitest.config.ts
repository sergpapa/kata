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
          include: ['apps/web/src/**/*.test.ts', 'apps/web/src/**/*.test.tsx'],
        },
      },
    ],
  },
});
