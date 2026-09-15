import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { App } from './App.js';
import { answerRoutes, importedRelease } from './testkit/apiFixture.js';

/**
 * Criteria P1 and P2 in docs/specs/visual-design-integration.md.
 *
 * Three of the sidebar's four destinations lead to work that is not built. The design package is
 * explicit that recreating a label over a dead control is not enough, so each of them is a real
 * address with a page that says what it will hold and which milestone builds it. The second test
 * in each pair is the one that matters: a page like this fails by growing a plausible-looking
 * sample, and a sample is indistinguishable from a record to the person reading it.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

/**
 * Corrected 2026-09-11, before any page existed: `/reviews` was written here as Milestone 2. The
 * roadmap has no review item in Milestone 2 at all — that milestone is saving. What carries the
 * owner's work back to the content author is "Export", Milestone 3. The test asserted a fact about
 * the roadmap and had it wrong; the page was not bent to fit it.
 */
const pages = [
  { path: '/practice', heading: /practice/i, milestone: '3' },
  { path: '/reviews', heading: /reviews/i, milestone: '3' },
  { path: '/progress', heading: /progress/i, milestone: '2' },
] as const;

describe.each(pages)('the $path page', ({ path, heading, milestone }) => {
  it('has a heading, says what it will hold, and names the milestone that builds it', async () => {
    answerRoutes({ '/api/release': importedRelease() });
    window.history.replaceState({}, '', path);

    render(<App />);

    const title = await screen.findByRole('heading', { level: 1 });
    expect(title.textContent).toMatch(heading);
    const main = screen.getByRole('main').textContent ?? '';
    expect(main).toMatch(new RegExp(`milestone ${milestone}`, 'i'));
    expect(main.length).toBeGreaterThan(80);
  });

  it('shows no count, no record and no control that does nothing', async () => {
    answerRoutes({ '/api/release': importedRelease() });
    window.history.replaceState({}, '', path);

    render(<App />);

    await screen.findByRole('heading', { level: 1 });
    const main = screen.getByRole('main');

    // Nothing to press: every control here would be a promise the app cannot keep. The one link
    // back to the lessons is allowed, because it goes somewhere that exists.
    expect(within(main).queryAllByRole('button')).toHaveLength(0);
    for (const link of within(main).queryAllByRole('link')) {
      expect(link.getAttribute('href')).toBe('/');
    }
    expect(within(main).queryAllByRole('progressbar')).toHaveLength(0);
    expect(within(main).queryAllByRole('table')).toHaveLength(0);

    // The failure this page invites is a plausible-looking sample — three fake reviews, a count of
    // zero, a date. The prose needs no digit except the milestone's, so every other digit here is
    // something the app is claiming to know, and a sample cannot be written without one.
    const digits = main.textContent?.match(/\d+/g) ?? [];
    expect(digits.filter((digit) => digit !== milestone)).toEqual([]);

    // And a fabricated record carrying no digit at all still names something real.
    expect(main.textContent).not.toMatch(/LS-M020|FSSE-/);
  });
});
