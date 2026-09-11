import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Paths are resolved from this file's location rather than the working directory, so the app
 * behaves the same whether it is started from the repo root, from `apps/server`, or by an editor.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');

export interface Config {
  /** Loopback only. This build serves one learner on one machine; see docs/adr/0001. */
  readonly host: string;
  readonly port: number;
  /** Directory holding the learner's work. Never committed; see .gitignore. */
  readonly dataDir: string;
  readonly databaseFile: string;
  /** Directory containing `learning-release.json`. Read-only input, never written to. */
  readonly releaseDir: string;
  /** Built client assets, served in production mode. */
  readonly webDistDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = env.EDUCODE_DATA_DIR ?? path.join(repoRoot, 'data');
  return {
    host: '127.0.0.1',
    port: Number(env.EDUCODE_PORT ?? 4317),
    dataDir,
    databaseFile: path.join(dataDir, 'educode.sqlite'),
    releaseDir:
      env.EDUCODE_RELEASE_DIR ??
      path.join(
        repoRoot,
        'VS_Code_App_and_First_Five_Lessons_v1',
        'vs-code-first-five-v1',
        'content',
      ),
    webDistDir: path.join(repoRoot, 'apps', 'web', 'dist'),
  };
}

export { repoRoot };
