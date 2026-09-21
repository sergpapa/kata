import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyRelease } from './verify.js';
import type { VerificationOutcome, VerifiedRelease } from './types.js';
import { loadConfig, repoRoot } from '../../config.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  removeDir,
  replaceLessonFile,
  sha256,
  writeFixture,
  copyReleaseDir,
  patchManifest,
  type Fixture,
  type FixtureLabEntry,
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
    throw new Error(`Expected the release to be refused, but it verified`);
  }
  return outcome.failure;
}

function releaseOf(outcome: VerificationOutcome): VerifiedRelease {
  if (outcome.state !== 'verified') {
    throw new Error(
      `Expected the release to verify, but it was refused: ${outcome.failure.message}`,
    );
  }
  return outcome.release;
}

afterEach(() => {
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

describe('verifying the received bytes', () => {
  it('refuses a lesson whose bytes do not match the manifest hash, naming the file and both hashes', () => {
    const fixture = makeFixture();
    const expected = 'a'.repeat(64);
    const received = sha256(fixture.files.get('lessons/lesson-02.md') as Buffer);
    (fixture.manifest.lessons[1] as { sha256: string }).sha256 = expected;

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('hash_mismatch');
    expect(failure.file).toBe('lessons/lesson-02.md');
    expect(failure.message).toContain('lessons/lesson-02.md');
    expect(failure.message).toContain(expected);
    expect(failure.message).toContain(received);
  });

  it('refuses a release whose lab kit bytes do not match, so labs are hashed too', () => {
    const fixture = makeFixture();
    (fixture.manifest.lab_downloads[0] as { sha256: string }).sha256 = 'b'.repeat(64);

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('hash_mismatch');
    expect(failure.file).toBe('labs/kit-02.zip');
  });

  it('refuses a release whose activity file bytes do not match, so the activity file is hashed too', () => {
    const fixture = makeFixture();
    fixture.manifest.activities.sha256 = 'c'.repeat(64);

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('hash_mismatch');
    expect(failure.file).toBe('trial-activities.json');
  });

  it('refuses a release with a referenced file that is not there, naming the path', () => {
    const fixture = makeFixture();
    fixture.files.delete('lessons/lesson-02.md');

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('file_missing');
    expect(failure.file).toBe('lessons/lesson-02.md');
    expect(failure.message).toContain('lessons/lesson-02.md');
  });

  it('reports nothing at all from a refused release, rather than the lessons that did verify', () => {
    const fixture = makeFixture();
    fixture.files.delete('lessons/lesson-02.md');

    const outcome = verifyRelease(releaseDirFrom(fixture));

    expect(outcome.state).toBe('failed');
    expect(outcome).not.toHaveProperty('release');
  });
});

describe('reading the manifest itself', () => {
  it('refuses a release directory with no manifest, naming the file it looked for', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);

    const failure = refusalOf(verifyRelease(dir));

    expect(failure.code).toBe('manifest_missing');
    expect(failure.message).toContain('learning-release.json');
  });

  it('refuses a manifest that is not valid JSON', () => {
    const fixture = makeFixture();
    const dir = releaseDirFrom(fixture);
    fs.writeFileSync(path.join(dir, 'learning-release.json'), '{ not json', 'utf8');

    const failure = refusalOf(verifyRelease(dir));

    expect(failure.code).toBe('manifest_unreadable');
  });

  it('refuses a manifest missing a required field, naming the field', () => {
    const fixture = makeFixture();
    delete (fixture.manifest as Partial<typeof fixture.manifest>).release_id;

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('manifest_invalid');
    expect(failure.message).toContain('release_id');
  });

  it('reads a later 1.x manifest, because the schema promises those stay compatible', () => {
    const fixture = makeFixture();
    fixture.manifest.schema_version = '1.1.0';

    const outcome = verifyRelease(releaseDirFrom(fixture));

    expect(outcome.state).toBe('verified');
  });

  it('refuses a release that carries no lessons, rather than importing an empty one', () => {
    const fixture = makeFixture();
    fixture.manifest.lessons = [];
    fixture.manifest.lab_downloads = [];

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('manifest_invalid');
    expect(failure.message).toContain('no lessons');
  });

  it('refuses a manifest schema version it was not written for, rather than guessing', () => {
    const fixture = makeFixture();
    fixture.manifest.schema_version = '2.0.0';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('unsupported_manifest_schema');
    expect(failure.message).toContain('2.0.0');
  });
});

describe('conflicting identities between the manifest and the lesson files', () => {
  it('refuses two lesson entries sharing a lesson ID, naming the ID', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[1] as { lesson_id: string }).lesson_id = 'FIX-LS-01';

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('duplicate_lesson_id');
    expect(failure.message).toContain('FIX-LS-01');
  });

  it('refuses two lesson entries claiming the same position in the order', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[1] as { order: number }).order = 1;

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('duplicate_lesson_order');
  });

  it('refuses a lesson whose front-matter key differs from the manifest ID, naming both', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: FIX-DOC-02',
          'version: "1.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-99',
        ].join('\n'),
        '# Lesson 2: the authored title\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('conflicting_lesson_id');
    expect(failure.message).toContain('FIX-LS-02');
    expect(failure.message).toContain('FIX-LS-99');
    expect(failure.file).toBe('lessons/lesson-02.md');
  });

  it('refuses a lesson file that is a different document from the one the manifest entry names', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: FIX-DOC-OLD',
          'version: "1.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '# An older lesson\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('conflicting_document_id');
    expect(failure.message).toContain('FIX-DOC-OLD');
    expect(failure.message).toContain('FIX-DOC-02');
  });

  it('refuses a lesson whose front-matter version is not even a string, rather than skipping the check', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        // Unquoted, so YAML reads it as the number 2 — the shape that slips past a string-only check.
        [
          'document_id: FIX-DOC-02',
          'version: 2',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '# Lesson 2: the authored title\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('conflicting_version');
    expect(failure.file).toBe('lessons/lesson-02.md');
  });

  it('refuses a lesson whose front-matter document ID is not even a string', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: 999',
          'version: "1.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '# Lesson 2: the authored title\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('conflicting_document_id');
    expect(failure.message).toContain('999');
  });

  it('refuses a lesson file at a different content version from the manifest entry', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: FIX-DOC-02',
          'version: "0.9.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '# Lesson 2: the authored title\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('conflicting_version');
    expect(failure.message).toContain('0.9.0-draft');
  });
});

describe('reading the lesson file', () => {
  it('refuses a lesson with no front matter at all', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      '# Lesson 2\n\nProse with no front matter.\n',
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('front_matter_missing');
    expect(failure.file).toBe('lessons/lesson-02.md');
  });

  it('refuses a lesson whose front matter cannot be parsed', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      '---\ndocument_id: "unterminated\n  - [broken\n---\n\n# Lesson 2\n\nProse.\n',
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('front_matter_invalid');
  });

  it('refuses a lesson whose front matter carries no candidate_lesson_id', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        ['document_id: FIX-DOC-02', 'version: "1.0.0-draft"', 'module: M020'].join('\n'),
        '# Lesson 2: the authored title\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('front_matter_invalid');
    expect(failure.message).toContain('candidate_lesson_id');
  });

  it('refuses a lesson body with no H1, rather than falling back to the filename', () => {
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-02.md',
      lessonSource(
        [
          'document_id: FIX-DOC-02',
          'version: "1.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-02',
        ].join('\n'),
        '## Only a second-level heading\n\nProse.',
      ),
    );

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('title_missing');
    expect(failure.file).toBe('lessons/lesson-02.md');
  });

  it('takes the display title from the first H1 and keeps the manifest title beside it', () => {
    const release = releaseOf(verifyRelease(releaseDirFrom(makeFixture())));

    expect(release.lessons[0]?.displayTitle).toBe('Lesson 1: the authored title');
    expect(release.lessons[0]?.manifestTitle).toBe('Lesson 1 as the manifest names it');
  });

  it('preserves the authored front matter, including its prose lists', () => {
    const release = releaseOf(verifyRelease(releaseDirFrom(makeFixture())));

    expect(release.lessons[0]?.frontMatter).toMatchObject({
      document_id: 'FIX-DOC-01',
      module: 'M020',
      prerequisites: ['Has opened a web page'],
    });
  });

  it('keeps the lesson source text exactly as received', () => {
    const fixture = makeFixture();
    const source = (fixture.files.get('lessons/lesson-01.md') as Buffer).toString('utf8');

    const release = releaseOf(verifyRelease(releaseDirFrom(fixture)));

    expect(release.lessons[0]?.sourceText).toBe(source);
  });
});

describe('lab kits referenced by lessons', () => {
  it('refuses a lesson pointing at a lab the manifest does not carry, naming both', () => {
    const fixture = makeFixture();
    (fixture.manifest.lessons[1] as { lab_id: string }).lab_id = 'FIX-LAB-NOPE';
    fixture.manifest.lab_downloads = [];

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('lab_not_found');
    expect(failure.message).toContain('FIX-LAB-NOPE');
    expect(failure.message).toContain('FIX-LS-02');
  });

  it('refuses two lab entries sharing a lab ID', () => {
    const fixture = makeFixture();
    const first = fixture.manifest.lab_downloads[0] as FixtureLabEntry;
    fixture.manifest.lab_downloads = [first, { ...first, lesson_ids: [...first.lesson_ids] }];

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('duplicate_lab_id');
    expect(failure.message).toContain('FIX-LAB-02');
  });

  it('refuses a lab whose lesson list disagrees with the lessons pointing at it', () => {
    const fixture = makeFixture();
    (fixture.manifest.lab_downloads[0] as { lesson_ids: string[] }).lesson_ids = [
      'FIX-LS-01',
      'FIX-LS-02',
    ];

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('lab_lesson_mismatch');
    expect(failure.message).toContain('FIX-LAB-02');
    expect(failure.message).toContain('FIX-LS-01');
  });

  it('refuses a lab whose lesson list omits a lesson that points at it', () => {
    const fixture = makeFixture();
    (fixture.manifest.lab_downloads[0] as { lesson_ids: string[] }).lesson_ids = [];

    const failure = refusalOf(verifyRelease(releaseDirFrom(fixture)));

    expect(failure.code).toBe('lab_lesson_mismatch');
    expect(failure.message).toContain('FIX-LS-02');
  });

  it('records the verified lab kit by reference, with its version, hash and size', () => {
    const fixture = makeFixture();
    const bytes = fixture.files.get('labs/kit-02.zip') as Buffer;

    const release = releaseOf(verifyRelease(releaseDirFrom(fixture)));

    expect(release.labKits).toEqual([
      {
        labId: 'FIX-LAB-02',
        version: '1.0.0-draft',
        sourcePath: 'labs/kit-02.zip',
        sha256: sha256(bytes),
        byteSize: bytes.byteLength,
        lessonIds: ['FIX-LS-02'],
      },
    ]);
  });
});

describe('the release the author actually supplied', () => {
  it('verifies clean: fifteen lessons, authored order, authored versions, Lesson 1 with no lab', () => {
    const release = releaseOf(verifyRelease(loadConfig().releaseDir));

    expect(release.releaseId).toBe('FSSE-HTTP-FIRST-FIFTEEN');
    expect(release.version).toBe('1.0.0-draft');
    expect(release.lessons.map((lesson) => lesson.candidateLessonId)).toEqual([
      'LS-M020-01',
      'LS-M020-02',
      'LS-M020-03',
      'LS-M020-04',
      'LS-M020-05',
      'LS-M020-06',
      'LS-M020-07',
      'LS-M020-08',
      'LS-M021-01',
      'LS-M021-02',
      'LS-M021-03',
      'LS-M021-04',
      'LS-M021-05',
      'LS-M021-06',
      'LS-M021-07',
    ]);
    expect(release.lessons.map((lesson) => lesson.order)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    expect(release.lessons.map((lesson) => lesson.contentVersion)).toEqual([
      '2.0.0-draft',
      ...Array.from({ length: 14 }, () => '1.0.0-draft'),
    ]);
    expect(release.lessons[0]?.labId).toBeNull();
    expect(release.lessons.map((lesson) => lesson.labId).slice(1)).toEqual([
      'FSSE-HTTP-LAB-02',
      'FSSE-HTTP-LAB-03-05',
      'FSSE-HTTP-LAB-03-05',
      'FSSE-HTTP-LAB-03-05',
      'FSSE-HTTP-LAB-06-08',
      'FSSE-HTTP-LAB-06-08',
      'FSSE-HTTP-LAB-06-08',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-14-15',
      'FSSE-HTTP-LAB-14-15',
    ]);
  });

  it('reads each display title from the lesson file, not from the manifest or the filename', () => {
    const release = releaseOf(verifyRelease(loadConfig().releaseDir));

    expect(release.lessons[0]?.displayTitle).toBe(
      'Lesson 1: What happens when your browser asks for something?',
    );
    for (const lesson of release.lessons) {
      expect(lesson.displayTitle).not.toContain('.md');
      expect(lesson.sourceText.length).toBeGreaterThan(1000);
    }
  });

  it('carries the five lab kits and the 45-entry activity file it references', () => {
    const release = releaseOf(verifyRelease(loadConfig().releaseDir));

    expect(release.labKits.map((kit) => kit.labId)).toEqual([
      'FSSE-HTTP-LAB-02',
      'FSSE-HTTP-LAB-03-05',
      'FSSE-HTTP-LAB-06-08',
      'FSSE-HTTP-LAB-09-13',
      'FSSE-HTTP-LAB-14-15',
    ]);
    expect(release.activitySet.sourcePath).toBe('trial-activities.json');
    const activitySet = JSON.parse(release.activitySet.sourceText) as {
      activity_set_id: string;
      activities: unknown[];
    };
    expect(activitySet.activity_set_id).toBe('FSSE-HTTP-FIRST-FIFTEEN-ACTIVITIES');
    expect(activitySet.activities).toHaveLength(45);
  });

  it('carries the release identity the author published, not just its ID', () => {
    const release = releaseOf(verifyRelease(loadConfig().releaseDir));

    expect(release.date).toBe('2026-09-21');
    expect(release.status).toContain('owner-review candidate');
    expect(release.status).toContain('newly authored');
    expect(release.audience).toContain('caching mechanisms');
    expect(release.sourceOfTruth).toBe('The supplied UTF-8 Markdown lesson files');
  });

  it('catches a corrupted hash on the last lab kit, not only the first', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    copyReleaseDir(loadConfig().releaseDir, dir);
    patchManifest(dir, (manifest) => {
      (manifest.lab_downloads[4] as { sha256: string }).sha256 = 'd'.repeat(64);
    });

    const failure = refusalOf(verifyRelease(dir));

    expect(failure.code).toBe('hash_mismatch');
    expect(failure.file).toBe('labs/HTTP_Lessons_14_15_Investigation_Kit_v1.zip');
  });

  it('catches a corrupted hash on the last lesson, not only the first', () => {
    const dir = makeTempDir();
    tempDirs.push(dir);
    copyReleaseDir(loadConfig().releaseDir, dir);
    patchManifest(dir, (manifest) => {
      (manifest.lessons[14] as { sha256: string }).sha256 = 'e'.repeat(64);
    });

    const failure = refusalOf(verifyRelease(dir));

    expect(failure.code).toBe('hash_mismatch');
    expect(failure.file).toBe('lessons/HTTP_Lesson_15_Student_Edition_v1.md');
  });

  it('records the manifest hash it verified the release against', () => {
    const release = releaseOf(verifyRelease(loadConfig().releaseDir));
    const manifestBytes = fs.readFileSync(
      path.join(loadConfig().releaseDir, 'learning-release.json'),
    );

    expect(release.manifestSha256).toBe(sha256(manifestBytes));
  });
});

/**
 * Criterion C2 in docs/specs/content-release-first-fifteen.md (extending slice 5's C2). The
 * superseded packages stay in the repo as the baselines the fifteen-release's compatibility claim
 * is checked against: same IDs, same content versions, same bytes, same reading order for every
 * lesson they carry. When Milestone 2 keys learner state on (candidate_lesson_id,
 * content_version), this is what proves a release update cannot orphan it. Both baselines are
 * compared directly — first-five as well as thirteen — so the chain's oldest link is proven
 * against the current release, not left to transitivity through a test that no longer exists.
 */
describe('the superseded releases, still beside the fifteen', () => {
  const baselines = [
    {
      name: 'first-five',
      releaseId: 'FSSE-HTTP-FIRST-FIVE',
      lessonCount: 5,
      dir: path.join(repoRoot, 'content', 'releases', 'vs-code-first-five-v1', 'content'),
    },
    {
      name: 'thirteen',
      releaseId: 'FSSE-HTTP-FIRST-THIRTEEN',
      lessonCount: 13,
      dir: path.join(repoRoot, 'content', 'releases', 'http-lessons-09-13-release-v1', 'content'),
    },
  ] as const;

  it.each(baselines)('the $name release still verifies clean from its own directory', (base) => {
    const release = releaseOf(verifyRelease(base.dir));

    expect(release.releaseId).toBe(base.releaseId);
    expect(release.lessons).toHaveLength(base.lessonCount);
  });

  it.each(baselines)(
    'the $name release agrees with the fifteen on every key learner state will hang off',
    (base) => {
      const baseline = releaseOf(verifyRelease(base.dir));
      const fifteen = releaseOf(verifyRelease(loadConfig().releaseDir));

      // Guard against a vacuous pass: this comparison only says something while the two sides are
      // genuinely different releases.
      expect(fifteen.releaseId).toBe('FSSE-HTTP-FIRST-FIFTEEN');
      expect(fifteen.releaseId).not.toBe(baseline.releaseId);

      for (const before of baseline.lessons) {
        const after = fifteen.lessons.find(
          (lesson) => lesson.candidateLessonId === before.candidateLessonId,
        );
        expect(after, `${before.candidateLessonId} must survive the release update`).toBeDefined();
        expect({
          contentVersion: after?.contentVersion,
          sha256: after?.sha256,
          order: after?.order,
        }).toEqual({
          contentVersion: before.contentVersion,
          sha256: before.sha256,
          order: before.order,
        });
      }
    },
  );
});
