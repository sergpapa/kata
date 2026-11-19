import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { CourseConfig } from './modules/content/types.js';

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
  /**
   * Every course the app serves, in the order the course list shows them and the order their IDs
   * are claimed in (ADR 0018). Which release serves a course is a deliberate choice made here, not
   * whatever directory is newest.
   */
  readonly courses: readonly CourseConfig[];
  /** Built client assets, served in production mode. */
  readonly webDistDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const dataDir = env.EDUCODE_DATA_DIR ?? path.join(repoRoot, 'data');
  return {
    host: '127.0.0.1',
    // 8317, not 4317: the author's lab kits climb 4315, 4317, 4319–4320, and lessons 6–8 tell the
    // learner to run their kit's server on 4317 while reading the lesson in this app.
    port: Number(env.EDUCODE_PORT ?? 8317),
    dataDir,
    databaseFile: path.join(dataDir, 'educode.sqlite'),
    courses: [
      {
        courseId: 'FSSE',
        title: 'Full-Stack Software Engineering',
        releaseDir:
          env.EDUCODE_RELEASE_DIR_FSSE ??
          path.join(repoRoot, 'content', 'releases', 'http-first-fifteen-v1_0_1', 'content'),
      },
      {
        courseId: 'QAAE',
        title: 'QA Automation Engineering',
        releaseDir:
          env.EDUCODE_RELEASE_DIR_QAAE ??
          path.join(repoRoot, 'content', 'releases', 'qaae-q01-v1', 'content'),
      },
    ],
    webDistDir: path.join(repoRoot, 'apps', 'web', 'dist'),
  };
}

export { repoRoot };
