/**
 * The kits' starting state (9–13 handoff check 4, 14–15 handoff check 4): extracts the archives
 * run.mjs downloaded through the app and runs each starter check, which must give exactly the
 * counts the kit's own README states. The deliberate failures are the exercise; a kit that passes
 * more than its README says has been repaired, and one that passes less is broken.
 *
 * Runs the kits' tests on this machine only, as a learner would. Leaves the extractions in
 * data/acceptance/kits for the two rehearsals.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { kitsDir, outDir } from './server.mjs';

const downloads = path.join(outDir, 'downloads');

const KITS = [
  {
    zip: 'HTTP_Lessons_09_13_Local_Kit_v1.zip',
    root: 'http-lessons-09-13-lab',
    files: [
      'data/cafe.json',
      'practice/decision.mjs',
      'reference/decision.mjs',
      'Instructor_Notes.md',
    ],
    checks: [{ file: 'checks/practice.test.mjs', pass: 4, fail: 10, skipped: 0 }],
  },
  {
    zip: 'HTTP_Lessons_14_15_Investigation_Kit_v1.zip',
    root: 'http-lessons-14-15-lab',
    files: [
      'reference/incident-representation.mjs',
      'reference/transfer-representation.mjs',
      'reference/learner-regression.test.mjs',
      'Instructor_Notes.md',
    ],
    checks: [
      { file: 'checks/incident.test.mjs', pass: 17, fail: 5, skipped: 0 },
      { file: 'checks/transfer.test.mjs', pass: 3, fail: 5, skipped: 0 },
      { file: 'checks/learner-regression.test.mjs', pass: 0, fail: 0, skipped: 1 },
    ],
  },
];

let failed = 0;
for (const kit of KITS) {
  const into = path.join(kitsDir, kit.zip.replace(/\.zip$/, ''));
  fs.rmSync(into, { recursive: true, force: true });
  fs.mkdirSync(into, { recursive: true });
  execFileSync('tar', ['-xf', path.join(downloads, kit.zip), '-C', into]);
  const root = path.join(into, kit.root);
  const missing = kit.files.filter((f) => !fs.existsSync(path.join(root, f)));
  console.log(
    `${missing.length ? 'FAIL' : 'PASS'} ${kit.zip} contents: ${missing.length ? `missing ${missing.join(', ')}` : kit.files.join(', ')}`,
  );
  if (missing.length) failed += 1;
  for (const check of kit.checks) {
    const run = spawnSync(process.execPath, ['--test', check.file], {
      cwd: root,
      encoding: 'utf8',
    });
    const count = (word) =>
      Number((run.stdout.match(new RegExp(`^\\S* ?${word} (\\d+)\\s*$`, 'm')) ?? [])[1]);
    const got = { pass: count('pass'), fail: count('fail'), skipped: count('skipped') };
    const ok = got.pass === check.pass && got.fail === check.fail && got.skipped === check.skipped;
    if (!ok) failed += 1;
    console.log(
      `${ok ? 'PASS' : 'FAIL'} ${kit.root}/${check.file}: ${got.pass} pass, ${got.fail} fail, ${got.skipped} skipped (README: ${check.pass}/${check.fail}/${check.skipped})`,
    );
  }
}
if (failed > 0) process.exitCode = 1;
