/**
 * `npm run release:seed -- <package dir> <source dir>` and
 * `npm run release:build -- <source dir> <output package dir>`.
 *
 * Exit codes: 0 done, 1 refused (the reason is printed), 2 wrong arguments. A build ends by printing
 * the steps that make the release current, because doing them stays a deliberate act (spec C14).
 * The process entry point is `main.ts`, so importing this module never runs anything.
 */
import path from 'node:path';
import { buildRelease, type ReleaseChanges } from './build.js';
import { seedSource } from './seed.js';

const USAGE = [
  'Usage:',
  '  npm run release:seed -- <package dir> <source dir>',
  '  npm run release:build -- <source dir> <output package dir>',
];

const short = (sha: string) => sha.slice(0, 8);

function summary(changes: ReleaseChanges, outDir: string): string[] {
  const lines = [
    `Built ${changes.release_id} ${changes.previous_version} -> ${changes.version} at ${outDir}`,
  ];
  const moved = (entry: ReleaseChanges['lessons'][number] | ReleaseChanges['labs'][number]) =>
    entry.status === 'added'
      ? `added  ${entry.version}  ${short(entry.sha256)}`
      : `${entry.previous_version} -> ${entry.version}  ${short(entry.previous_sha256 ?? '')} -> ${short(entry.sha256)}`;
  for (const lesson of changes.lessons.filter((entry) => entry.status !== 'unchanged')) {
    lines.push(`  lesson ${lesson.lesson_id}  ${moved(lesson)}`);
  }
  for (const lab of changes.labs.filter((entry) => entry.status !== 'unchanged')) {
    lines.push(`  kit ${lab.lab_id}  ${moved(lab)}`);
  }
  if (changes.activities.status === 'changed') {
    const { previous_sha256: before, sha256: after } = changes.activities;
    lines.push(`  activities ${changes.activities.path}  ${short(before)} -> ${short(after)}`);
  }
  const unchanged =
    changes.lessons.filter((entry) => entry.status === 'unchanged').length +
    changes.labs.filter((entry) => entry.status === 'unchanged').length;
  lines.push(`  ${unchanged} lessons and kits unchanged, byte for byte.`);
  lines.push(
    '',
    'To make it the current release (not done for you):',
    `  1. Point the course's releaseDir in apps/server/src/config.ts at ${path.join(outDir, 'content')}`,
    '  2. Update the matching path in apps/server/src/config.test.ts',
    '  3. Add the release to content/RELEASES.md and mark it current',
    `  4. Set previous_release in release.json to ${outDir}, so the next build compares against this one`,
  );
  return lines;
}

/** Runs one command; `print` receives every output line. Returns the exit code. */
export function runCli(args: readonly string[], print: (line: string) => void): number {
  const [command, from, to, ...extra] = args;
  if ((command !== 'seed' && command !== 'build') || !from || !to || extra.length > 0) {
    USAGE.forEach((line) => print(line));
    return 2;
  }
  const source = path.resolve(from);
  const target = path.resolve(to);

  if (command === 'seed') {
    const outcome = seedSource(source, target);
    if (outcome.state === 'refused') {
      print(`Refused: ${outcome.reason}`);
      return 1;
    }
    print(`Seeded ${target} from ${source}`);
    return 0;
  }

  const outcome = buildRelease(source, target);
  if (outcome.state === 'refused') {
    print(`Refused: ${outcome.reason}`);
    return 1;
  }
  summary(outcome.changes, target).forEach((line) => print(line));
  return 0;
}
