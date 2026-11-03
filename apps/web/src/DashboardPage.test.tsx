import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { App } from './App.js';
import {
  answerRoutes,
  fifteenLessons,
  fiveLessons,
  importedRelease,
  lesson,
} from './testkit/apiFixture.js';

/**
 * Criteria D1–D6 in docs/specs/visual-design-integration.md.
 *
 * The rule underneath most of these: the dashboard answers "where do I begin?" out of the release
 * and out of nothing else. This application records nothing about what has been read, so a page
 * that says a lesson was studied — or shows a bar implying it — is stating something it cannot
 * know. Criterion D3 is the one that catches that, and it is written as an absence on purpose.
 */

// The dashboard used to be at `/`, which every test started on without asking; it is now
// `/courses/FSSE` (multi-course C11). The first test in the file runs before any afterEach reset.
beforeEach(() => {
  window.history.replaceState({}, '', '/courses/FSSE');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/courses/FSSE');
});

function firstCard(): HTMLElement {
  return screen.getByTestId('current-lesson');
}

describe('the card that says where to begin', () => {
  it('names the first lesson in manifest order, by its authored title', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);
    await screen.findByTestId('current-lesson');

    expect(firstCard().textContent).toContain(
      'Lesson 1: What happens when your browser asks for something?',
    );
  });

  it('offers Start, not Continue, because nothing records that anything was read', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);
    await screen.findByTestId('current-lesson');

    const action = within(firstCard()).getByRole('link', { name: /start lesson/i });
    expect(action.getAttribute('href')).toBe('/courses/FSSE/lessons/LS-M020-01');
    expect(firstCard().textContent).not.toMatch(/continue/i);
  });

  it('takes the first lesson from the release, not from its position in the file', async () => {
    // The manifest's own order, arriving out of array order: the card must follow `order`.
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease([
        lesson(3, 'Third by order, first in the array'),
        lesson(1, 'First by order'),
      ]),
    });

    render(<App />);
    await screen.findByTestId('current-lesson');

    expect(firstCard().textContent).toContain('First by order');
  });
});

describe('the counts on the dashboard', () => {
  it('derives every total from the release, so a three-lesson release says three', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease([
        lesson(1, 'One'),
        lesson(2, 'Two'),
        lesson(3, 'Three'),
      ]),
    });

    render(<App />);
    await screen.findByTestId('current-lesson');

    expect(document.body.textContent).toContain('3 lessons');
    expect(document.body.textContent).not.toContain('5 lessons');
    expect(document.body.textContent).not.toContain('/ 8');
  });

  it('claims no lesson has been read, studied or completed', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);
    await screen.findByTestId('current-lesson');

    const page = screen.getByRole('main').textContent ?? '';
    // Both spellings of the same false claim. The ratio has a prose form — "2 of 5 lessons" —
    // carrying no slash and no banned word, and that is the one an implementation reaches for.
    expect(page).not.toMatch(/\bstudied\b/i);
    expect(page).not.toMatch(/\bcompleted\b/i);
    expect(page).not.toMatch(/\bso far\b/i);
    expect(page).not.toMatch(/\bremaining\b/i);
    expect(page).not.toMatch(/\d\s*\/\s*\d/);
    expect(page).not.toMatch(/\d+\s+of\s+\d+/i);
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });

  // Re-aimed in slice 4, declared in docs/specs/reader-navigation-and-resume.md: "nothing is
  // recorded" stopped being true when the resume point arrived. The card now has to state both
  // truths — what is kept, and what still is not.
  it('says plainly what is kept and what is not recorded yet', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    expect(await screen.findByText(/lesson you last open/i)).toBeTruthy();
    expect(screen.getByText(/not recorded yet/i)).toBeTruthy();
    expect(screen.getByText(/milestone 2/i)).toBeTruthy();
  });
});

describe('the list of lessons', () => {
  it('gives every lesson a row, in manifest order, carrying its authored title', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const rows = await within(screen.getByRole('main')).findAllByRole('listitem');
    expect(rows).toHaveLength(5);

    // Every row, not just the ends: a sort that scrambles the middle three is the likely bug, and
    // a title rendered as inert text rather than a link is the other one.
    expect(rows.map((row) => within(row).getByRole('link').textContent?.trim())).toEqual(
      fiveLessons.map((entry) => entry.displayTitle),
    );
    expect(rows.map((row) => within(row).getByRole('link').getAttribute('href'))).toEqual(
      fiveLessons.map((entry) => `/courses/FSSE/lessons/${entry.candidateLessonId}`),
    );
  });

  it('scales to the fifteen-lesson release without truncating or reordering', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease(fifteenLessons) });

    render(<App />);

    const rows = await within(screen.getByRole('main')).findAllByRole('listitem');
    expect(rows).toHaveLength(15);
    expect(rows.map((row) => within(row).getByRole('link').textContent?.trim())).toEqual(
      fifteenLessons.map((entry) => entry.displayTitle),
    );
    expect(rows.map((row) => within(row).getByRole('link').getAttribute('href'))).toEqual(
      fifteenLessons.map((entry) => `/courses/FSSE/lessons/${entry.candidateLessonId}`),
    );
  });

  it('keeps release identifiers, lab kits and hashes out of an ordinary row', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const rows = await within(screen.getByRole('main')).findAllByRole('listitem');
    for (const row of rows) {
      const text = row.textContent ?? '';
      expect(text).not.toContain('FSSE-HTTP-FIRST-FIVE');
      expect(text).not.toContain('FSSE-HTTP-LAB');
      expect(text).not.toMatch(/[0-9a-f]{64}/);
    }
  });

  it('keeps those facts on the page, behind a closed disclosure rather than deleted', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    // Reached through its summary rather than by role. `details` does map to `group`, but `group`
    // takes its accessible name from the author only — it does not read the `summary` — so
    // getByRole('group', { name }) can never match this element however it is written. The claim
    // is unchanged: a disclosure, closed, still holding the facts.
    const details = (await screen.findByText(/release details/i)).closest('details');
    expect(details?.hasAttribute('open')).toBe(false);
    expect(details?.textContent).toContain('FSSE-HTTP-FIRST-FIVE');
    expect(details?.textContent).toContain('FSSE-HTTP-LAB-03-05');
  });
});

/**
 * Criteria R3–R5 in docs/specs/reader-navigation-and-resume.md: the card offers the way back to
 * the lesson last opened — and claims nothing beyond "last opened", because opening is all the
 * app can actually know happened.
 */
describe('the card once a lesson has been opened', () => {
  const resumeAt = (candidateLessonId: string) => ({
    state: 'set',
    candidateLessonId,
    recordedAt: '2026-09-22T10:00:00.000Z',
  });

  it('offers Continue to the last-opened lesson, by its number and authored title', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/resume-point': resumeAt('LS-M020-03'),
    });

    render(<App />);
    await screen.findByTestId('current-lesson');

    const action = await within(firstCard()).findByRole('link', { name: /continue lesson/i });
    expect(action.getAttribute('href')).toBe('/courses/FSSE/lessons/LS-M020-03');
    expect(firstCard().textContent).toContain('Lesson 3: One menu, three ways to carry it');
    expect(firstCard().textContent).toContain('03');
    expect(within(firstCard()).queryByRole('link', { name: /start lesson/i })).toBeNull();
  });

  it('says last opened, and still claims nothing was read, studied or completed', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/resume-point': resumeAt('LS-M020-03'),
    });

    render(<App />);
    await within(await screen.findByTestId('current-lesson')).findByRole('link', {
      name: /continue lesson/i,
    });

    expect(firstCard().textContent).toMatch(/last opened/i);
    const page = screen.getByRole('main').textContent ?? '';
    expect(page).not.toMatch(/\bread\b/i);
    expect(page).not.toMatch(/\bstudied\b/i);
    expect(page).not.toMatch(/\bcompleted\b/i);
    expect(page).not.toMatch(/\d\s*\/\s*\d/);
    expect(page).not.toMatch(/\d+\s+of\s+\d+/i);
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });

  it('falls back to Start when the resume point names a lesson this release does not carry', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/resume-point': resumeAt('LS-GONE-99'),
    });

    render(<App />);
    await screen.findByTestId('current-lesson');

    const action = within(firstCard()).getByRole('link', { name: /start lesson/i });
    expect(action.getAttribute('href')).toBe('/courses/FSSE/lessons/LS-M020-01');
    expect(firstCard().textContent).not.toMatch(/continue/i);
  });

  it('renders no card at all until the resume answer arrives', async () => {
    // /code-review's finding: a transient Start card, clicked fast, opens lesson 1 and PUTs it
    // over the stored resume point. So no card may exist before the answer does.
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url === '/api/courses/FSSE/resume-point') return new Promise<Response>(() => {});
        return Promise.resolve(
          new Response(JSON.stringify(importedRelease()), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
        );
      }),
    );

    render(<App />);

    await screen.findByRole('status');
    expect(screen.queryByTestId('current-lesson')).toBeNull();
    expect(screen.queryByRole('link', { name: /start lesson/i })).toBeNull();
  });

  it('offers Start when the answer is plainly none', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/resume-point': { state: 'none' },
    });

    render(<App />);
    await screen.findByTestId('current-lesson');

    expect(within(firstCard()).getByRole('link', { name: /start lesson/i })).toBeDefined();
    expect(firstCard().textContent).not.toMatch(/continue/i);
  });
});

describe("the author's own caveat", () => {
  it('stays visible on the dashboard, outside any disclosure', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const caveat = await screen.findByText(/not approved for public release/i);
    expect(caveat.closest('details')).toBeNull();
  });
});
