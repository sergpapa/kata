import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Criterion C4 in docs/specs/content-release-first-thirteen.md, for the dev half of the app. The
 * server moving off 4317 is only half a fix: if the dev client keeps proxying /api to the
 * abandoned port, every request fails in `npm run dev` and no other test notices — the server
 * suite proves its own default and the client suite never dials a port at all.
 */

interface ProxyShape {
  server: { proxy: Record<string, { target: string }> };
}

const savedPort = process.env.KATA_PORT;

afterEach(() => {
  if (savedPort === undefined) delete process.env.KATA_PORT;
  else process.env.KATA_PORT = savedPort;
});

/** The config reads the environment at import time, so each claim needs a fresh module. */
async function apiProxyTarget(): Promise<string> {
  vi.resetModules();
  const config = (await import('../vite.config.js')).default as unknown as ProxyShape;
  return config.server.proxy['/api']?.target ?? 'no /api proxy configured';
}

describe('the dev proxy', () => {
  it('follows the server to 8317 by default', async () => {
    delete process.env.KATA_PORT;

    expect(await apiProxyTarget()).toBe('http://127.0.0.1:8317');
  });

  it('follows KATA_PORT wherever it points, as the server does', async () => {
    process.env.KATA_PORT = '5000';

    expect(await apiProxyTarget()).toBe('http://127.0.0.1:5000');
  });
});
