import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

/**
 * Criterion C1 in docs/specs/content-release-first-fifteen.md and C4 in
 * docs/specs/content-release-first-thirteen.md, and C1 in docs/specs/multi-course.md — the defaults the app runs with when the owner
 * starts it plain, with no environment set.
 */
describe('the default configuration', () => {
  it('serves on 8317, leaving 4317 to the lessons 6–8 lab kit', () => {
    const config = loadConfig({});

    // Lessons 6–8 tell the learner to run their kit's server on 127.0.0.1:4317 and curl it there.
    // An app squatting on that port makes the kit fail to start — or worse, answers the curl
    // itself and teaches the wrong bytes. The author's kits so far climb 4315, 4317, 4319–4320.
    expect(config.port).toBe(8317);
    expect(config.host).toBe('127.0.0.1');
  });

  it('still lets EDUCODE_PORT choose the port', () => {
    expect(loadConfig({ EDUCODE_PORT: '5000' }).port).toBe(5000);
  });

  it('serves the full-stack course and then the QA course, in that order (multi-course C1)', () => {
    const courses = loadConfig({}).courses;

    expect(courses.map((course) => [course.courseId, course.title])).toEqual([
      ['FSSE', 'Full-Stack Software Engineering'],
      ['QAAE', 'QA Automation Engineering'],
    ]);
  });

  it('points the full-stack course at the corrected fifteen-lesson release, which really holds a manifest', () => {
    const fsse = loadConfig({}).courses.find((course) => course.courseId === 'FSSE');

    expect(fsse?.releaseDir.split(path.sep).join('/')).toContain(
      'content/releases/http-first-fifteen-v1_0_1/content',
    );
    expect(fs.existsSync(path.join(fsse?.releaseDir ?? '', 'learning-release.json'))).toBe(true);
  });

  it('points the QA course at its first-lesson release, which really holds a manifest (C15)', () => {
    const qaae = loadConfig({}).courses.find((course) => course.courseId === 'QAAE');

    expect(qaae?.releaseDir.split(path.sep).join('/')).toContain(
      'content/releases/qaae-lesson-01-v1/content',
    );
    expect(fs.existsSync(path.join(qaae?.releaseDir ?? '', 'learning-release.json'))).toBe(true);
  });

  it('lets EDUCODE_RELEASE_DIR_FSSE and EDUCODE_RELEASE_DIR_QAAE move each course on its own', () => {
    const elsewhere = path.join('somewhere', 'else');
    const courses = loadConfig({ EDUCODE_RELEASE_DIR_QAAE: elsewhere }).courses;

    expect(courses.find((course) => course.courseId === 'QAAE')?.releaseDir).toBe(elsewhere);
    expect(courses.find((course) => course.courseId === 'FSSE')?.releaseDir).not.toBe(elsewhere);
    expect(
      loadConfig({ EDUCODE_RELEASE_DIR_FSSE: elsewhere }).courses.find(
        (course) => course.courseId === 'FSSE',
      )?.releaseDir,
    ).toBe(elsewhere);
  });

  it('no longer reads EDUCODE_RELEASE_DIR, which named one release for a one-course app', () => {
    const elsewhere = path.join('somewhere', 'else');

    for (const course of loadConfig({ EDUCODE_RELEASE_DIR: elsewhere }).courses) {
      expect(course.releaseDir).not.toBe(elsewhere);
    }
  });
});
