import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { fiveLessons, importedRelease, lessonDetail } from './testkit/apiFixture.js';

/**
 * Criteria N3, N5, N7, P1–P3 and R1/R6 in docs/specs/reader-navigation-and-resume.md, exercised
 * through the whole client: the sidebar's contents list, the previous/next links a lesson answer
 * names, and the silent write that records the lesson last opened.
 */

type Neighbour = { order: number; candidateLessonId: string; displayTitle: string } | null;

function neighbourOf(order: number): Neighbour {
  const entry = fiveLessons[order - 1];
  if (!entry) throw new Error(`No fixture lesson ${order}`);
  return { order, candidateLessonId: entry.candidateLessonId, displayTitle: entry.displayTitle };
}

function lessonAnswer(
  order: number,
  body: string,
  neighbours: { previous: Neighbour; next: Neighbour },
) {
  return { ...lessonDetail(order, body), previous: neighbours.previous, next: neighbours.next };
}

const jsonHeaders = { 'content-type': 'application/json' };

/**
 * The whole local server, stood in for: the release, each lesson by key, and the resume point.
 * Returns the bodies of every recording PUT, so a test can assert what was written — fetch is the
 * client's only boundary, and the write is the behavior under test.
 */
function serveApp(
  lessons: Record<string, unknown>,
  options: { release?: unknown; resume?: unknown; resumePutStatus?: number } = {},
): unknown[] {
  const puts: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/courses/FSSE/resume-point') {
        if (init?.method === 'PUT') {
          puts.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ state: 'set' }), {
            status: options.resumePutStatus ?? 200,
            headers: jsonHeaders,
          });
        }
        return new Response(JSON.stringify(options.resume ?? { state: 'none' }), {
          status: 200,
          headers: jsonHeaders,
        });
      }
      if (url.startsWith('/api/courses/FSSE/lessons/')) {
        const key = decodeURIComponent(url.slice('/api/courses/FSSE/lessons/'.length));
        const body = lessons[key];
        return new Response(
          JSON.stringify(
            body ?? { error: 'lesson_not_found', message: `This release has no lesson ${key}.` },
          ),
          { status: body ? 200 : 404, headers: jsonHeaders },
        );
      }
      return new Response(JSON.stringify(options.release ?? importedRelease()), {
        status: 200,
        headers: jsonHeaders,
      });
    }),
  );
  return puts;
}

const sectionedBody = [
  'Opening paragraph.',
  '',
  '## First section',
  '',
  'Prose.',
  '',
  '### A subsection',
  '',
  '## Second section',
  '',
  'More prose.',
].join('\n');

function sidebar(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Sections' });
}

function contentsAnchors(): readonly HTMLAnchorElement[] {
  return [...sidebar().querySelectorAll('a')].filter((anchor) =>
    (anchor.getAttribute('href') ?? '').startsWith('#'),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.pushState({}, '', '/courses/FSSE');
});

describe('the contents list in the sidebar', () => {
  it('lists the open lesson’s sections in authored order, each an anchor to its heading', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, sectionedBody, { previous: null, next: neighbourOf(2) }),
    });

    render(<App />);
    await screen.findByText('Opening paragraph.');

    await waitFor(() => expect(contentsAnchors()).toHaveLength(2));
    expect(contentsAnchors().map((anchor) => anchor.textContent?.trim())).toEqual([
      'First section',
      'Second section',
    ]);
    expect(contentsAnchors().map((anchor) => anchor.getAttribute('href'))).toEqual([
      '#user-content-first-section',
      '#user-content-second-section',
    ]);
    expect(within(sidebar()).getByText(/in this lesson/i)).toBeDefined();
  });

  it('shows no contents block on the dashboard', async () => {
    serveApp({});

    render(<App />);
    await screen.findByTestId('current-lesson');

    expect(contentsAnchors()).toHaveLength(0);
    expect(within(sidebar()).queryByText(/in this lesson/i)).toBeNull();
  });

  it('leaks no outline from a lesson onto a standby page or the not-found page', async () => {
    // The leak scenario PRE named: outline state left behind by a lesson route surviving onto a
    // route that is not a lesson. So this test starts where the state exists.
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, sectionedBody, { previous: null, next: neighbourOf(2) }),
    });

    render(<App />);
    await screen.findByText('Opening paragraph.');
    await waitFor(() => expect(contentsAnchors()).toHaveLength(2));

    fireEvent.click(within(sidebar()).getByRole('link', { name: 'Practice' }));
    await screen.findByRole('heading', { level: 1, name: /practice/i });
    expect(contentsAnchors()).toHaveLength(0);
    expect(within(sidebar()).queryByText(/in this lesson/i)).toBeNull();

    window.history.pushState({}, '', '/somewhere-else');
    fireEvent.popState(window);
    await screen.findByText(/no page at this address/i);
    expect(contentsAnchors()).toHaveLength(0);
    expect(within(sidebar()).queryByText(/in this lesson/i)).toBeNull();
  });

  it('shows no contents block for a lesson whose body has no sections', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, 'Only prose.\n', { previous: null, next: neighbourOf(2) }),
    });

    render(<App />);
    await screen.findByText('Only prose.');

    expect(contentsAnchors()).toHaveLength(0);
    expect(within(sidebar()).queryByText(/in this lesson/i)).toBeNull();
  });

  it('replaces the outline when moving to the next lesson, and removes it on leaving', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, sectionedBody, { previous: null, next: neighbourOf(2) }),
      'LS-M020-02': lessonAnswer(2, '## Only in lesson two\n\nProse.\n', {
        previous: neighbourOf(1),
        next: null,
      }),
    });

    render(<App />);
    await screen.findByText('Opening paragraph.');
    await waitFor(() => expect(contentsAnchors()).toHaveLength(2));

    fireEvent.click(screen.getByRole('link', { name: /next/i }));
    await screen.findByText('Prose.', { selector: '.lesson-body p' });
    await waitFor(() =>
      expect(contentsAnchors().map((anchor) => anchor.textContent?.trim())).toEqual([
        'Only in lesson two',
      ]),
    );

    fireEvent.click(screen.getByRole('link', { name: /all lessons/i }));
    await screen.findByTestId('current-lesson');
    expect(contentsAnchors()).toHaveLength(0);
  });

  it('closes the drawer when a contents entry is followed', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, sectionedBody, { previous: null, next: neighbourOf(2) }),
    });

    const { container } = render(<App />);
    await screen.findByText('Opening paragraph.');
    await waitFor(() => expect(contentsAnchors()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: /navigation/i }));
    expect(container.querySelector('.shell')?.getAttribute('data-drawer')).toBe('open');

    fireEvent.click(contentsAnchors()[0] as HTMLAnchorElement);
    expect(container.querySelector('.shell')?.getAttribute('data-drawer')).toBe('closed');
  });

  it('keeps the drawer’s focus trap cycling through the contents anchors', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, sectionedBody, { previous: null, next: neighbourOf(2) }),
    });

    render(<App />);
    await screen.findByText('Opening paragraph.');
    await waitFor(() => expect(contentsAnchors()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: /navigation/i }));

    // The contents sit below the destinations and the release block, so the trap's last stop must
    // be the last contents anchor — a trap that only knows the destinations would skip it.
    const stops = [...sidebar().querySelectorAll('a')];
    const lastAnchor = contentsAnchors().at(-1) as HTMLElement;
    expect(stops.at(-1)).toBe(lastAnchor);

    lastAnchor.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(stops[0]);

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastAnchor);
  });
});

describe('previous and next', () => {
  it('offers the neighbours the server names, as real links carrying their titles', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-02');
    serveApp({
      'LS-M020-02': lessonAnswer(2, 'Body two.', {
        previous: neighbourOf(1),
        next: neighbourOf(3),
      }),
    });

    render(<App />);
    await screen.findByText('Body two.');

    const nav = screen.getByRole('navigation', { name: /between lessons/i });
    const previous = within(nav).getByRole('link', { name: /previous/i });
    const next = within(nav).getByRole('link', { name: /next/i });

    expect(previous.getAttribute('href')).toBe('/courses/FSSE/lessons/LS-M020-01');
    expect(previous.textContent).toContain('01');
    expect(previous.textContent).toContain(
      'Lesson 1: What happens when your browser asks for something?',
    );
    expect(next.getAttribute('href')).toBe('/courses/FSSE/lessons/LS-M020-03');
    expect(next.textContent).toContain('03');
    expect(next.textContent).toContain('Lesson 3: One menu, three ways to carry it');
  });

  it('offers no previous on the first lesson, absent rather than disabled', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    serveApp({
      'LS-M020-01': lessonAnswer(1, 'Body one.', { previous: null, next: neighbourOf(2) }),
    });

    render(<App />);
    await screen.findByText('Body one.');

    const nav = screen.getByRole('navigation', { name: /between lessons/i });
    expect(within(nav).queryByRole('link', { name: /previous/i })).toBeNull();
    expect(within(nav).queryByText(/previous/i)).toBeNull();
    expect(within(nav).getByRole('link', { name: /next/i })).toBeDefined();
  });

  it('offers no next on the last lesson, absent rather than disabled', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-05');
    serveApp({
      'LS-M020-05': lessonAnswer(5, 'Body five.', { previous: neighbourOf(4), next: null }),
    });

    render(<App />);
    await screen.findByText('Body five.');

    const nav = screen.getByRole('navigation', { name: /between lessons/i });
    expect(within(nav).queryByRole('link', { name: /next/i })).toBeNull();
    expect(within(nav).getByRole('link', { name: /previous/i })).toBeDefined();
  });

  it('opens the neighbour at the top with focus moved, like any navigation', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    serveApp({
      'LS-M020-01': lessonAnswer(1, 'Body one.', { previous: null, next: neighbourOf(2) }),
      'LS-M020-02': lessonAnswer(2, 'Body two.', { previous: neighbourOf(1), next: null }),
    });

    render(<App />);
    await screen.findByText('Body one.');

    fireEvent.click(screen.getByRole('link', { name: /next/i }));

    await screen.findByText('Body two.');
    expect(window.location.pathname).toBe('/courses/FSSE/lessons/LS-M020-02');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });
});

describe('recording the lesson last opened', () => {
  it('records the lesson once it answers, against its stable key', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-02');
    const puts = serveApp({
      'LS-M020-02': lessonAnswer(2, 'Body two.', { previous: neighbourOf(1), next: null }),
    });

    render(<App />);
    await screen.findByText('Body two.');

    await waitFor(() => expect(puts.length).toBeGreaterThan(0));
    expect(puts.at(-1)).toEqual({ candidateLessonId: 'LS-M020-02' });
  });

  it('records each lesson as the reader moves, so the last one opened wins', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    const puts = serveApp({
      'LS-M020-01': lessonAnswer(1, 'Body one.', { previous: null, next: neighbourOf(2) }),
      'LS-M020-02': lessonAnswer(2, 'Body two.', { previous: neighbourOf(1), next: null }),
    });

    render(<App />);
    await screen.findByText('Body one.');
    fireEvent.click(screen.getByRole('link', { name: /next/i }));
    await screen.findByText('Body two.');

    await waitFor(() => expect(puts.at(-1)).toEqual({ candidateLessonId: 'LS-M020-02' }));
  });

  it('records nothing for a lesson the release does not carry', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-09');
    const puts = serveApp({});

    render(<App />);
    await screen.findByText(/LS-M020-09/);

    expect(puts).toHaveLength(0);
  });

  it('records nothing while the release stands refused', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    const failed = {
      state: 'failed',
      failure: { code: 'hash_mismatch', message: 'lesson-01.md does not match.', file: null },
    };
    const puts = serveApp({ 'LS-M020-01': failed }, { release: failed });

    render(<App />);
    await screen.findByText(/does not match/);

    expect(puts).toHaveLength(0);
  });

  it('records nothing when the app does not answer the lesson at all', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    const puts: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (url === '/api/courses/FSSE/resume-point' && init?.method === 'PUT') {
          puts.push(JSON.parse(String(init.body)));
          return new Response(JSON.stringify({ state: 'set' }), {
            status: 200,
            headers: jsonHeaders,
          });
        }
        if (url.startsWith('/api/courses/FSSE/lessons/')) throw new Error('connection refused');
        return new Response(JSON.stringify(importedRelease()), {
          status: 200,
          headers: jsonHeaders,
        });
      }),
    );

    render(<App />);
    await screen.findByText(/connection refused/);

    expect(puts).toHaveLength(0);
  });

  it('keeps reading intact when the recording write fails, with no claim anywhere', async () => {
    window.history.pushState({}, '', '/courses/FSSE/lessons/LS-M020-01');
    const puts = serveApp(
      { 'LS-M020-01': lessonAnswer(1, 'Body one.', { previous: null, next: neighbourOf(2) }) },
      { resumePutStatus: 500 },
    );

    render(<App />);

    await screen.findByText('Body one.');
    await waitFor(() => expect(puts.length).toBeGreaterThan(0));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(document.body.textContent).not.toMatch(/\bsaved\b|\bsaving\b|failed to save/i);
  });
});
