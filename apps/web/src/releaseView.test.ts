import { describe, expect, it } from 'vitest';
import { releaseViewOf } from './releaseView.js';

/** Code review, 2026-11-03: the sidebar reads `course.title`, so an answer without it is unreadable. */
describe('reading a course release answer', () => {
  it('treats an imported answer that names no course as a shape it cannot read', () => {
    const view = releaseViewOf({
      state: 'answered',
      status: 200,
      body: { state: 'imported', release: {}, lessons: [] },
    });

    expect(view.state).toBe('unavailable');
  });
});
