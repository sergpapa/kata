import { describe, expect, it } from 'vitest';
import { courseHref, lessonHref, parseRoute } from './route.js';

/**
 * Criterion C1 in docs/specs/markdown-rendering.md — a lesson is an address, not a piece of state —
 * as re-scoped by C10–C12 in docs/specs/multi-course.md: every lesson address names its course.
 */

describe('reading a route out of the address bar', () => {
  it('treats the root as the course list', () => {
    expect(parseRoute('/')).toEqual({ kind: 'home' });
  });

  it('reads a course dashboard out of /courses/<id>', () => {
    expect(parseRoute('/courses/QAAE')).toEqual({ kind: 'course', courseId: 'QAAE' });
    expect(parseRoute('/courses/QAAE/')).toEqual({ kind: 'course', courseId: 'QAAE' });
  });

  it('reads the course and the lesson key out of /courses/<id>/lessons/<id>', () => {
    expect(parseRoute('/courses/FSSE/lessons/LS-M020-03')).toEqual({
      kind: 'lesson',
      courseId: 'FSSE',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('decodes a lesson key that was percent-encoded into the path', () => {
    expect(parseRoute('/courses/FSSE/lessons/LS%2DM020%2D03')).toEqual({
      kind: 'lesson',
      courseId: 'FSSE',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('ignores a trailing slash rather than reading an empty lesson key', () => {
    expect(parseRoute('/courses/FSSE/lessons/LS-M020-03/')).toEqual({
      kind: 'lesson',
      courseId: 'FSSE',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('reads the old one-course lesson address as a forward to be made, not as a lesson (C12)', () => {
    expect(parseRoute('/lessons/LS-M020-03')).toEqual({
      kind: 'legacyLesson',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('reports an address it does not serve, instead of silently showing a list', () => {
    for (const path of [
      '/lessons',
      '/lessons/',
      '/lessons/LS-M020-03/notes',
      '/courses',
      '/courses/',
      '/courses/FSSE/lessons',
      '/courses/FSSE/lessons/',
      '/courses/FSSE/notes',
      '/courses/FSSE/lessons/LS-M020-03/notes',
      '/courses/FSSE/lessons/%',
      '/something-else',
    ]) {
      expect(parseRoute(path), path).toMatchObject({ kind: 'unknown' });
    }
  });
});

describe('building course and lesson addresses', () => {
  it('round-trips a course id through the dashboard address it produces', () => {
    expect(parseRoute(courseHref('QAAE'))).toEqual({ kind: 'course', courseId: 'QAAE' });
  });

  it('round-trips a course and lesson key through the address it produces', () => {
    expect(parseRoute(lessonHref('QAAE', 'LS-Q01-01'))).toEqual({
      kind: 'lesson',
      courseId: 'QAAE',
      candidateLessonId: 'LS-Q01-01',
    });
  });

  it('encodes a key containing characters a path would otherwise split on', () => {
    const href = lessonHref('FSSE', 'LS/M020 01');

    expect(href).not.toContain('LS/M020 01');
    expect(parseRoute(href)).toEqual({
      kind: 'lesson',
      courseId: 'FSSE',
      candidateLessonId: 'LS/M020 01',
    });
  });
});

/** Criterion P1 in docs/specs/visual-design-integration.md: the sidebar's other three
 *  destinations are addresses, not labels. */
describe('the destinations whose work is not built yet', () => {
  it.each([
    ['/practice', 'practice'],
    ['/reviews', 'reviews'],
    ['/progress', 'progress'],
  ])('reads %s as the %s section', (path, section) => {
    expect(parseRoute(path)).toEqual({ kind: 'standby', section });
  });

  it('does not invent a section for an address that merely starts like one', () => {
    expect(parseRoute('/practices')).toMatchObject({ kind: 'unknown' });
    expect(parseRoute('/practice/lab-02')).toMatchObject({ kind: 'unknown' });
  });
});
