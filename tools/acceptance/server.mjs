/**
 * Shared ground for the acceptance run (docs/specs/acceptance-run.md): where things live, and the
 * built EduCode server started on a throwaway data directory with a chosen FSSE release.
 *
 * Everything the run writes goes under `data/acceptance/`, which .gitignore covers. The owner's
 * `data/educode.sqlite` is never opened: the server is always started with its own data directory.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const outDir = path.join(repoRoot, 'data', 'acceptance');
/** Where kits.mjs extracts the downloaded kits, and the rehearsals run them. */
export const kitsDir = path.join(outDir, 'kits');
/** 8319: clear of the app's 8317, the screenshot gate's 8318 and every lab kit's ports. */
export const port = Number(process.env.EDUCODE_ACCEPTANCE_PORT ?? 8319);
export const baseUrl = `http://127.0.0.1:${port}`;
export const releaseDir = (name) => path.join(repoRoot, 'content', 'releases', name, 'content');

/** Starts the built server on `dataDir`, serving `fsseRelease` for the FSSE course. */
export async function startServer(dataDir, fsseRelease) {
  const child = spawn(process.execPath, [path.join(repoRoot, 'apps/server/dist/index.js')], {
    cwd: repoRoot,
    env: {
      ...process.env,
      EDUCODE_PORT: String(port),
      EDUCODE_DATA_DIR: dataDir,
      EDUCODE_RELEASE_DIR_FSSE: releaseDir(fsseRelease),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 100; i += 1) {
    try {
      const r = await fetch(`${baseUrl}/api/health`);
      if (r.ok) return { child, log: () => log };
    } catch {
      // Not listening yet.
    }
    if (child.exitCode !== null) throw new Error(`server exited: ${log}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`server did not start: ${log}`);
}

export async function stopServer(server) {
  if (server.child.exitCode !== null || server.child.signalCode !== null) return;
  const done = new Promise((r) => server.child.once('exit', r));
  server.child.kill();
  await done;
}

/** One API call, answering status, headers and the parsed body. */
export async function api(pathname, init) {
  const r = await fetch(`${baseUrl}/api${pathname}`, init);
  const type = r.headers.get('content-type') ?? '';
  return {
    status: r.status,
    headers: r.headers,
    body: type.includes('json') ? await r.json() : await r.text(),
  };
}
