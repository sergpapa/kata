/**
 * Tests added for the /code-review findings on the first build (spec slice log, 2026-11-03).
 * Kept apart from the guardian-approved suite so that suite stays exactly as pinned.
 */
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyRelease } from '../modules/content/verify.js';
import { buildRelease } from './build.js';
import { runCli } from './cli.js';
import { readZip } from './zip.js';
import {
  KIT_06_08,
  cleanTemps,
  correctLesson5,
  editReleaseJson,
  kitFolder,
  outputPath,
  seededSource,
  setKitVersion,
} from './testkit/sourceFixture.js';

afterEach(cleanTemps);

function bumpKit0608(source: string): void {
  setKitVersion(source, KIT_06_08, '1.0.2-draft');
  editReleaseJson(source, (release) => {
    release.release.version = '1.0.2-draft';
  });
}

function refusal(source: string): string {
  const out = outputPath();
  const outcome = buildRelease(source, out);
  expect(outcome.state).toBe('refused');
  expect(fs.readdirSync(path.dirname(out))).toEqual([]);
  return outcome.state === 'refused' ? outcome.reason : '';
}

describe('a kit whose top folder was renamed (review finding 1)', () => {
  it('ships every member once, under the new folder, and the importer accepts it', () => {
    const source = seededSource();
    const folder = kitFolder(source, KIT_06_08);
    const renamed = path.join(path.dirname(folder), 'http-lessons-06-08-lbb');
    fs.renameSync(folder, renamed);
    bumpKit0608(source);
    const out = outputPath();
    expect(buildRelease(source, out).state).toBe('built');

    expect(verifyRelease(path.join(out, 'content')).state).toBe('verified');
    const members = readZip(fs.readFileSync(path.join(out, 'content/labs', `${KIT_06_08}.zip`)));
    const paths = members.map((member) => member.path);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths.every((memberPath) => memberPath.startsWith('http-lessons-06-08-lbb/'))).toBe(
      true,
    );
    expect(paths).toHaveLength(25);
  });
});

describe('malformed source files are refused by name, not thrown (review finding 3)', () => {
  it('refuses a kit manifest that is not JSON', () => {
    const source = seededSource();
    fs.writeFileSync(path.join(kitFolder(source, KIT_06_08), 'manifest.json'), '{ not json');
    expect(refusal(source)).toMatch(/manifest\.json/);
  });

  it('refuses a release.json that is not JSON', () => {
    const source = seededSource();
    fs.writeFileSync(path.join(source, 'release.json'), '{ not json');
    expect(refusal(source)).toMatch(/release\.json/);
  });

  it('refuses a source directory with no release.json', () => {
    const source = seededSource();
    fs.rmSync(path.join(source, 'release.json'));
    expect(refusal(source)).toMatch(/release\.json/);
  });

  it('refuses an activity file whose activities are not a list', () => {
    const source = seededSource();
    correctLesson5(source);
    fs.writeFileSync(path.join(source, 'trial-activities.json'), '{ "activities": 5 }\n');
    expect(refusal(source)).toMatch(/trial-activities\.json/);
  });
});

describe('a kit manifest that lists itself (review finding 6)', () => {
  it('is refused, because its own hash can never be true', () => {
    const source = seededSource();
    const file = path.join(kitFolder(source, KIT_06_08), 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as { files: object[] };
    manifest.files.push({ path: 'manifest.json', sha256: '0'.repeat(64) });
    fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`);
    bumpKit0608(source);
    expect(refusal(source)).toMatch(/manifest\.json.*itself|itself.*manifest\.json/s);
  });
});

describe('the next build compares against this one (review finding 2)', () => {
  it('tells the author to point previous_release at the package just built', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = outputPath();
    const lines: string[] = [];
    expect(runCli(['build', source, out], (line) => lines.push(line))).toBe(0);
    const step = lines.find((line) => line.includes('previous_release'));
    expect(step).toBeDefined();
    expect(step).toContain(out);
  });
});
