import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { importedRelease, lesson } from './testkit/apiFixture.js';
import { stubDownloads } from './testkit/responseFieldHarness.js';

/**
 * Criterion EX15's one-lesson case (docs/specs/export.md): a course with a single lesson has no
 * range to choose, so the card names that lesson instead of offering two pickers that can only
 * agree. Found by the owner on the QA course, 2026-11-19.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/courses/FSSE');
});

function stubOneLessonCourse() {
  const exportUrls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/courses/QAAE/export')) {
        exportUrls.push(url);
        return new Response('# Export\n', {
          status: 200,
          headers: {
            'content-type': 'text/markdown; charset=utf-8',
            'content-disposition':
              'attachment; filename="EduCode_QAAE_Lessons_01-01_2026-11-19.md"',
          },
        });
      }
      const body = url.startsWith('/api/courses/QAAE/release')
        ? importedRelease([lesson(1, 'Lesson 1: What changes when a machine runs your test?')])
        : { state: 'none' };
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return { exportUrls };
}

describe('a course with one lesson (EX15)', () => {
  it('names the lesson instead of offering From and To, and exports it', async () => {
    window.history.replaceState({}, '', '/courses/QAAE');
    const server = stubOneLessonCourse();
    stubDownloads();
    render(<App />);
    const heading = await screen.findByRole('heading', { name: 'Export your work' });
    const card = heading.closest('section') as HTMLElement;

    expect(within(card).queryByLabelText('From')).toBeNull();
    expect(within(card).queryByLabelText('To')).toBeNull();
    expect(card.textContent).toContain('Lesson 1: What changes when a machine runs your test?');

    fireEvent.click(within(card).getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(within(card).getByRole('status').textContent).toBe('Downloaded'));
    expect(server.exportUrls).toEqual([
      '/api/courses/QAAE/export?from=LS-M020-01&to=LS-M020-01&conversations=0',
    ]);
  });
});
