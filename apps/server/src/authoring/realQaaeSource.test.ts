import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../config.js';
import { buildRelease, type BuildOutcome } from './build.js';
import { readZip } from './zip.js';

/**
 * Criterion A9 in docs/specs/release-additions.md: the QA course's editable source builds the Q01
 * release, and the release in the repository is exactly what that source builds. A hand edit to the
 * release, or a source edit nobody rebuilt, fails here.
 */

const SOURCE = path.join(repoRoot, 'content/source/qaae');
const COMMITTED = path.join(repoRoot, 'content/releases/qaae-q01-v1');

let parent: string;
let out: string;
let outcome: BuildOutcome;

// Building three kits is the slowest step of this project's suite, so the hook gets its own budget.
beforeAll(() => {
  parent = fs.mkdtempSync(path.join(os.tmpdir(), 'educode-qaae-source-'));
  out = path.join(parent, 'qaae-q01-v1');
  outcome = buildRelease(SOURCE, out);
}, 60_000);

afterAll(() => {
  fs.rmSync(parent, { recursive: true, force: true });
});

/** Every file under a directory, as sorted forward-slash paths relative to it. */
function filesUnder(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else found.push(path.relative(root, full).split(path.sep).join('/'));
    }
  };
  walk(root);
  return found.sort();
}

describe('the QA course’s source and its release (A9)', () => {
  it('builds, adding four lessons and three kits and correcting Lesson 1', () => {
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;
    const { changes } = outcome;

    expect(changes.release_id).toBe('QAAE-Q01');
    expect(changes.previous_version).toBe('1.0.0-draft');
    expect(changes.version).toBe('1.1.0-draft');
    expect(changes.lessons.map((lesson) => [lesson.lesson_id, lesson.status])).toEqual([
      ['LS-Q01-01', 'changed'],
      ['LS-M001-01', 'added'],
      ['LS-M001-02', 'added'],
      ['LS-Q01-02', 'added'],
      ['LS-Q01-03', 'added'],
    ]);
    expect(changes.lessons[0]).toMatchObject({
      previous_version: '1.0.0-draft',
      version: '1.0.1-draft',
    });
    expect(changes.labs.map((lab) => [lab.lab_id, lab.status])).toEqual([
      ['M001-LAB-01', 'added'],
      ['QAAE-LAB-Q01-02', 'added'],
      ['QAAE-LAB-Q01-03', 'added'],
    ]);
    expect(changes.activities.status).toBe('changed');
  });

  it('ships no node_modules in any kit', () => {
    if (outcome.state !== 'built') throw new Error(outcome.reason);
    for (const lab of outcome.changes.labs) {
      const members = readZip(fs.readFileSync(path.join(out, 'content', lab.path)));
      const generated = members.filter((member) => member.path.includes('node_modules/'));
      expect(
        generated.map((member) => member.path),
        lab.lab_id,
      ).toEqual([]);
    }
  });

  it('is byte for byte the release in the repository', () => {
    if (outcome.state !== 'built') throw new Error(outcome.reason);
    const built = filesUnder(out);
    expect(filesUnder(COMMITTED)).toEqual(built);
    for (const file of built) {
      expect(
        fs.readFileSync(path.join(COMMITTED, file)).equals(fs.readFileSync(path.join(out, file))),
        file,
      ).toBe(true);
    }
  });
});
