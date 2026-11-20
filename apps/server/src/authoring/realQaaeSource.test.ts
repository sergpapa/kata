import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { repoRoot } from '../config.js';
import { buildRelease, type BuildOutcome } from './build.js';
import { readZip } from './zip.js';

/**
 * Criterion A9 in docs/specs/release-additions.md: the QA course's editable source builds the
 * current QA release, and the release in the repository is exactly what that source builds. A hand
 * edit to the release, or a source edit nobody rebuilt, fails here.
 *
 * The current release is the Q02 reissue of criterion KD19 in docs/specs/kata-diagrams.md: it
 * changes QA Lesson 1, which gains a Kata diagram, and nothing else.
 */

const SOURCE = path.join(repoRoot, 'content/source/qaae');
const COMMITTED = path.join(repoRoot, 'content/releases/qaae-q02-v1_0_1');

let parent: string;
let out: string;
let outcome: BuildOutcome;

// Building four kits is the slowest step of this project's suite, so the hook gets its own budget.
beforeAll(() => {
  parent = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-qaae-source-'));
  out = path.join(parent, 'qaae-q02-v1_0_1');
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
  it('builds, changing QA Lesson 1 and nothing else (KD19)', () => {
    expect(outcome.state, outcome.state === 'refused' ? outcome.reason : '').toBe('built');
    if (outcome.state !== 'built') return;
    const { changes } = outcome;

    expect(changes.release_id).toBe('QAAE-Q02');
    expect(changes.previous_version).toBe('1.2.0-draft');
    expect(changes.version).toBe('1.2.1-draft');
    expect(changes.lessons.map((lesson) => [lesson.lesson_id, lesson.status])).toEqual([
      ['LS-Q01-01', 'changed'],
      ['LS-M001-01', 'unchanged'],
      ['LS-M001-02', 'unchanged'],
      ['LS-Q01-02', 'unchanged'],
      ['LS-Q01-03', 'unchanged'],
      ['LS-M002-01', 'unchanged'],
      ['LS-M002-02', 'unchanged'],
      ['LS-M002-03', 'unchanged'],
      ['LS-M002-04', 'unchanged'],
      ['LS-M002-05', 'unchanged'],
      ['LS-M002-06', 'unchanged'],
      ['LS-M002-07', 'unchanged'],
    ]);
    expect(changes.labs.map((lab) => [lab.lab_id, lab.status])).toEqual([
      ['M001-LAB-01', 'unchanged'],
      ['QAAE-LAB-Q01-02', 'unchanged'],
      ['QAAE-LAB-Q01-03', 'unchanged'],
      ['M002-LAB-01', 'unchanged'],
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
