import { describe, expect, it } from 'vitest';
import { lessonHref, parseRoute } from './route.js';

/** Criterion C1 in docs/specs/markdown-rendering.md: a lesson is an address, not a piece of state. */

describe('reading a route out of the address bar', () => {
  it('treats the root as the lesson list', () => {
    expect(parseRoute('/')).toEqual({ kind: 'home' });
  });

  it('reads the lesson key out of /lessons/<id>', () => {
    expect(parseRoute('/lessons/LS-M020-03')).toEqual({
      kind: 'lesson',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('decodes a lesson key that was percent-encoded into the path', () => {
    expect(parseRoute('/lessons/LS%2DM020%2D03')).toEqual({
      kind: 'lesson',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('ignores a trailing slash rather than reading an empty lesson key', () => {
    expect(parseRoute('/lessons/LS-M020-03/')).toEqual({
      kind: 'lesson',
      candidateLessonId: 'LS-M020-03',
    });
  });

  it('reports an address it does not serve, instead of silently showing the list', () => {
    expect(parseRoute('/lessons')).toMatchObject({ kind: 'unknown' });
    expect(parseRoute('/lessons/')).toMatchObject({ kind: 'unknown' });
    expect(parseRoute('/something-else')).toMatchObject({ kind: 'unknown' });
    expect(parseRoute('/lessons/LS-M020-03/notes')).toMatchObject({ kind: 'unknown' });
  });
});

describe('building a lesson address', () => {
  it('round-trips a lesson key through the address it produces', () => {
    expect(parseRoute(lessonHref('LS-M020-05'))).toEqual({
      kind: 'lesson',
      candidateLessonId: 'LS-M020-05',
    });
  });

  it('encodes a key containing characters a path would otherwise split on', () => {
    const href = lessonHref('LS/M020 01');

    expect(href).not.toContain('LS/M020 01');
    expect(parseRoute(href)).toEqual({ kind: 'lesson', candidateLessonId: 'LS/M020 01' });
  });
});
