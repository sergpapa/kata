import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { answerRoutes, importedRelease, lesson, lessonDetail } from './testkit/apiFixture.js';

/**
 * Criteria S1–S6 and P3 in docs/specs/visual-design-integration.md — the shell every address
 * shares. These are about landmarks, addresses and focus, not about colour: what the sidebar
 * looks like is checked by tools/screenshots.mjs, because jsdom applies no stylesheet at all.
 */

function at(path: string): void {
  window.history.replaceState({}, '', path);
}

beforeEach(() => {
  at('/courses/FSSE');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  at('/courses/FSSE');
});

describe('the shell around every page', () => {
  it('gives the page a sidebar, a top bar and a main region, and the skip link points at main', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    expect(sidebar).toBeTruthy();
    expect(screen.getByRole('main').id).toBe('main');
    expect(screen.getByRole('link', { name: /skip to content/i }).getAttribute('href')).toBe(
      '#main',
    );
  });

  it('lists the four destinations in order, each a real address', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    const destinations = within(sidebar).getAllByRole('link');
    expect(destinations.map((link) => link.textContent?.trim())).toEqual([
      'Learn',
      'Practice',
      'Reviews',
      'Progress',
    ]);
    expect(destinations.map((link) => link.getAttribute('href'))).toEqual([
      '/courses/FSSE',
      '/practice',
      '/reviews',
      '/progress',
    ]);
  });

  it('marks exactly one destination as the current page', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });
    at('/reviews');

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    const current = within(sidebar)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]?.textContent?.trim()).toBe('Reviews');
  });

  it('keeps Learn marked while a lesson is open, because a lesson is where Learn leads', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/lessons/': lessonDetail(1),
    });
    at('/courses/FSSE/lessons/LS-M020-01');

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    const current = within(sidebar)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(current.map((link) => link.textContent?.trim())).toEqual(['Learn']);
  });

  it('ends the top-bar trail in the name of the page being read', async () => {
    answerRoutes({
      '/api/courses/FSSE/release': importedRelease(),
      '/api/courses/FSSE/lessons/': lessonDetail(1),
    });
    at('/courses/FSSE/lessons/LS-M020-01');

    render(<App />);

    const trail = await screen.findByRole('navigation', { name: /breadcrumb/i });
    // The last crumb, not merely somewhere in the trail: the right name in the middle with
    // something after it is a different claim about where the reader is.
    await waitFor(() =>
      expect(within(trail).getAllByRole('listitem').at(-1)?.textContent?.trim()).toBe(
        'Lesson 1: What happens when your browser asks for something?',
      ),
    );
  });

  it('names the workspace in the trail on the lesson list', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trail = await screen.findByRole('navigation', { name: /breadcrumb/i });
    expect(within(trail).getAllByRole('listitem').at(-1)?.textContent?.trim()).toMatch(
      /learning workspace/i,
    );
  });

  it('carries the product name in the sidebar, not in a page header of its own', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    expect(sidebar.textContent).toContain('EduCode');
    // Corrected 2026-09-11: this asserted `queryByRole('banner')` was null, which is wrong twice
    // over — a `header` inside `main` is not a banner in the HTML-AAM mapping, and this testing
    // library does not apply that scoping anyway, so it matched the dashboard's own page title.
    // The claim S6 actually makes is that the brand is not repeated in the page body.
    expect(screen.getByRole('main').textContent).not.toContain('EduCode');
  });

  /** Criterion D2 reaches the shell too: the sidebar describes the release it actually loaded. */
  it('describes the loaded release in the sidebar, counted from the release itself', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease([lesson(1, 'One'), lesson(2, 'Two')]) });

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    await waitFor(() => expect(sidebar.textContent).toContain('2 lessons'));
    expect(sidebar.textContent).toContain('Introductory HTTP learners');
  });
});

describe('the sidebar as a drawer on a narrow screen', () => {
  it('is closed to begin with, and the trigger says so', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trigger = await screen.findByRole('button', { name: /navigation/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(
      (await screen.findByRole('navigation', { name: /sections/i })).id,
    );
  });

  it('opens on the trigger and puts focus inside, so the next Tab is in the drawer', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trigger = await screen.findByRole('button', { name: /navigation/i });
    fireEvent.click(trigger);

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const sidebar = screen.getByRole('navigation', { name: /sections/i });
    await waitFor(() => expect(sidebar.contains(document.activeElement)).toBe(true));
  });

  it('closes on Escape and gives focus back to the trigger', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trigger = await screen.findByRole('button', { name: /navigation/i });
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    expect(document.activeElement).toBe(trigger);
  });

  it('closes when a destination inside it is followed, rather than covering the page it opened', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trigger = await screen.findByRole('button', { name: /navigation/i });
    fireEvent.click(trigger);
    const sidebar = screen.getByRole('navigation', { name: /sections/i });
    fireEvent.click(within(sidebar).getByRole('link', { name: 'Practice' }));

    await waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
  });
});

describe('an address the app does not serve', () => {
  it('still renders inside the shell, so the reader can navigate away', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });
    at('/nowhere');

    render(<App />);

    expect(await screen.findByRole('navigation', { name: /sections/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(
      /no page at this address/i,
    );
  });
});

/**
 * Three defects `/code-review` found in the first implementation of this shell, each fixed and
 * pinned here. All three are about where focus lands, which is invisible in a screenshot and
 * silent in every other test — a keyboard reader is the only person who would have reported them.
 */
describe('where focus lands when the page changes', () => {
  it('leaves focus on the new page when a destination is followed from the open drawer', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    const trigger = await screen.findByRole('button', { name: /navigation/i });
    fireEvent.click(trigger);
    const sidebar = screen.getByRole('navigation', { name: /sections/i });
    fireEvent.click(within(sidebar).getByRole('link', { name: 'Practice' }));

    // The drawer's own focus restore used to run after the route's, putting the reader back on
    // the navigation they had just left, one commit after arriving.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Practice'),
    );
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('moves focus between two sections that differ only by name', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });
    at('/practice');

    render(<App />);

    const sidebar = await screen.findByRole('navigation', { name: /sections/i });
    const reviews = within(sidebar).getByRole('link', { name: 'Reviews' });
    reviews.focus();
    fireEvent.click(reviews);

    // Both addresses are `kind: 'standby'`. Keyed on the kind alone, the whole page swapped and
    // focus stayed on the link that swapped it.
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Reviews'),
    );
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('steals no focus on first paint, even under StrictMode’s doubled mount effects', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    // main.tsx mounts the app inside StrictMode. Its dev-only second effect run used to look like
    // a navigation to the settled flag, dropping a keyboard reader onto <main> before they had
    // done anything — exactly the first-paint steal the flag exists to prevent.
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    await screen.findAllByRole('listitem');
    expect(document.activeElement).toBe(document.body);
  });

  it('keeps Tab inside the open drawer, which covers the page behind it', async () => {
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: /navigation/i }));
    const sidebar = screen.getByRole('navigation', { name: /sections/i });
    const destinations = within(sidebar).getAllByRole('link');
    const first = destinations[0] as HTMLElement;
    const last = destinations.at(-1) as HTMLElement;

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
