import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from './cli.js';
import {
  KIT_03_05,
  REAL_PACKAGE,
  cleanTemps,
  correctLesson5,
  outputPath,
  seededSource,
  sha256,
  tempDir,
} from './testkit/sourceFixture.js';

afterEach(cleanTemps);

function run(args: string[]): { code: number; output: string } {
  const lines: string[] = [];
  const code = runCli(args, (line) => lines.push(line));
  return { code, output: lines.join('\n') };
}

describe('the release command line (C14)', () => {
  it('seeds a source tree and exits 0', () => {
    const source = path.join(tempDir(), 'source');
    const { code } = run(['seed', REAL_PACKAGE, source]);
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(source, 'release.json'))).toBe(true);
  });

  it('builds, prints each changed lesson and kit with its transition, then the make-current steps', () => {
    const source = seededSource();
    correctLesson5(source);
    const out = outputPath();
    const { code, output } = run(['build', source, out]);

    expect(code).toBe(0);
    const lessonLine = output.split('\n').find((line) => line.includes('LS-M020-05'));
    expect(lessonLine).toMatch(/1\.0\.0-draft.*1\.0\.1-draft/);
    const newLessonSha = sha256(
      fs.readFileSync(path.join(out, 'content/lessons/HTTP_Lesson_05_Student_Edition_v1.md')),
    );
    expect(output).toContain(newLessonSha.slice(0, 8));
    const kitLine = output.split('\n').find((line) => line.includes('FSSE-HTTP-LAB-03-05'));
    expect(kitLine).toMatch(/1\.0\.0-draft.*1\.0\.1-draft/);
    const newKitSha = sha256(fs.readFileSync(path.join(out, `content/labs/${KIT_03_05}.zip`)));
    expect(output).toContain(newKitSha.slice(0, 8));
    expect(output).not.toMatch(/LS-M020-01\b/);

    const stepsAt = output.search(/config\.ts/);
    expect(stepsAt).toBeGreaterThan(output.indexOf('FSSE-HTTP-LAB-03-05'));
    expect(output).toMatch(/RELEASES\.md/);
  });

  it('prints the reason and exits 1 when the build refuses', () => {
    const source = seededSource();
    const { code, output } = run(['build', source, outputPath()]);
    expect(code).toBe(1);
    expect(output).toMatch(/1\.0\.1-draft|nothing/i);
  });

  it('prints the reason and exits 1 when the seed refuses', () => {
    const target = path.join(tempDir(), 'source');
    fs.mkdirSync(target);
    const { code, output } = run(['seed', REAL_PACKAGE, target]);
    expect(code).toBe(1);
    expect(output).toMatch(/exists/i);
  });

  it.each([[[]], [['build']], [['seed', REAL_PACKAGE]], [['publish', 'a', 'b']]])(
    'prints usage and exits 2 for arguments %j',
    (args) => {
      const { code, output } = run(args);
      expect(code).toBe(2);
      expect(output).toMatch(/usage/i);
    },
  );
});
