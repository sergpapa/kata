import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { escapesByConvention } from './releaseFiles.js';
import { verifyRelease } from './verify.js';
import type { VerificationOutcome } from './types.js';
import {
  makeFixture,
  makeTempDir,
  removeDir,
  writeFixture,
  type Fixture,
} from './testkit/releaseFixture.js';

const tempDirs: string[] = [];

function releaseDirFrom(fixture: Fixture): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  return writeFixture(dir, fixture);
}

/** Asserts the release was refused and hands back the failure, so each test reads as one claim. */
function refusalOf(outcome: VerificationOutcome) {
  if (outcome.state !== 'failed') {
    throw new Error('Expected the release to be refused, but it verified');
  }
  return outcome.failure;
}

afterEach(() => {
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

/**
 * Judged directly rather than through a release, because a release test can only ever exercise the
 * conventions of the machine it runs on. A manifest travels between machines; the check must not.
 */
describe('judging a path absolute by either convention', () => {
  it('rejects a POSIX absolute path', () => {
    expect(escapesByConvention('/etc/passwd')).toBe(true);
  });

  it('rejects a Windows drive-qualified path, on any host', () => {
    expect(escapesByConvention('C:\\Windows\\System32\\hosts')).toBe(true);
    expect(escapesByConvention('D:/data/lesson.md')).toBe(true);
  });

  it('rejects a UNC path, on any host', () => {
    expect(escapesByConvention('\\\\server\\share\\lesson.md')).toBe(true);
  });

  it('accepts the ordinary relative paths a release is made of', () => {
    expect(escapesByConvention('lessons/lesson-01.md')).toBe(false);
    expect(escapesByConvention('trial-activities.json')).toBe(false);
    expect(escapesByConvention('labs/kit-02.zip')).toBe(false);
  });

  it('leaves a climbing path to the resolver, which is what knows where the release sits', () => {
    expect(escapesByConvention('../outside/lesson.md')).toBe(false);
  });
});

describe('resolving manifest paths inside the release directory', () => {
  it('refuses a path that climbs out with ..', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[0] as { path: string }).path = '../outside/lesson-01.md';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('path_escapes_release');
    expect(failure.message).toContain('../outside/lesson-01.md');
  });

  it('refuses an absolute path', () => {
    const fixture = makeFixture();
    const absolute = path.resolve(path.sep, 'etc', 'passwd');
    (fixture.manifest.lessons[0] as { path: string }).path = absolute;

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('path_escapes_release');
  });

  it('refuses a Windows drive-qualified path whatever machine the app runs on', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[0] as { path: string }).path = 'C:\\Windows\\System32\\hosts';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('path_escapes_release');
  });

  it('refuses a UNC path whatever machine the app runs on', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[0] as { path: string }).path = '\\\\server\\share\\lesson.md';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('path_escapes_release');
  });

  it('refuses a lab path that climbs out with ..', () => {
    const fixture = makeFixture();
    (fixture.manifest.lab_downloads[0] as { path: string }).path = '../kit.zip';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('path_escapes_release');
  });

  it('refuses a path that stays inside lexically but resolves outside through a link', () => {
    const fixture = makeFixture();
    const dir = makeTempDir();
    tempDirs.push(dir);
    const outside = makeTempDir();
    tempDirs.push(outside);

    // Write the lessons somewhere else entirely, then point the release's lessons/ directory at it.
    fs.mkdirSync(path.join(outside, 'lessons'), { recursive: true });
    for (const [relativePath, bytes] of fixture.files) {
      if (!relativePath.startsWith('lessons/')) continue;
      fs.writeFileSync(path.join(outside, relativePath), bytes);
      fixture.files.delete(relativePath);
    }
    writeFixture(dir, fixture);
    try {
      fs.symlinkSync(path.join(outside, 'lessons'), path.join(dir, 'lessons'), 'junction');
    } catch (error) {
      throw new Error('This test needs a directory link and one could not be created', {
        cause: error,
      });
    }

    const failure = refusalOf(verifyRelease(dir));

    expect(failure.code).toBe('path_escapes_release');
  });
});
