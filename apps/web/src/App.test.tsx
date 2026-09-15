import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';

/** `fetch` is the boundary to the local server — the one thing worth standing in for here. */
function answerWith(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
}

const importedRelease = {
  state: 'imported',
  release: {
    releaseId: 'FSSE-HTTP-FIRST-FIVE',
    version: '1.0.0-draft',
    date: '2026-09-11',
    status: 'owner-review candidate; not approved for public release',
    audience: 'Introductory HTTP learners',
    manifestSha256: 'f'.repeat(64),
    importedAt: '2026-09-11T10:00:00.000Z',
  },
  lessons: [
    {
      order: 1,
      candidateLessonId: 'LS-M020-01',
      contentVersion: '2.0.0-draft',
      documentId: 'FSSE-HTTP-STUDENT-01',
      module: 'M020',
      displayTitle: 'Lesson 1: What happens when your browser asks for something?',
      manifestTitle: 'Lesson 1: What happens when your browser asks for something?',
      sourcePath: 'lessons/HTTP_Lesson_01_Student_Edition_v2.md',
      sha256: 'a'.repeat(64),
      labId: null,
    },
    {
      order: 2,
      candidateLessonId: 'LS-M020-02',
      contentVersion: '1.0.0-draft',
      documentId: 'FSSE-HTTP-STUDENT-02',
      module: 'M020',
      displayTitle: 'Lesson 2: Give the browser an address',
      manifestTitle: 'Lesson 2: Give the browser an address',
      sourcePath: 'lessons/HTTP_Lesson_02_Student_Edition_v1.md',
      sha256: 'b'.repeat(64),
      labId: 'FSSE-HTTP-LAB-02',
    },
  ],
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // Each test starts at the lesson list. jsdom keeps one window across a file, so an address left
  // behind by a routing test would decide what the next test renders.
  window.history.pushState({}, '', '/');
});

describe('the page after a verified import', () => {
  it('lists the authored lesson titles in the order the release gives them', async () => {
    answerWith(importedRelease);

    render(<App />);

    const titles = await screen.findAllByRole('heading', { level: 3 });
    expect(titles.map((heading) => heading.textContent)).toEqual([
      'Lesson 1: What happens when your browser asks for something?',
      'Lesson 2: Give the browser an address',
    ]);
  });

  it('names the release and version the lessons came from', async () => {
    answerWith(importedRelease);

    render(<App />);

    // Scoped to one element on purpose: '1.0.0-draft' is also Lesson 2's content version, and the
    // claim here is that the release's own version is stated beside the release it belongs to.
    const releaseLine = await screen.findByText(/FSSE-HTTP-FIRST-FIVE/);
    expect(releaseLine.textContent).toContain('1.0.0-draft');
  });

  it('puts a section heading above the lesson titles, so the outline does not skip a level', async () => {
    answerWith(importedRelease);

    render(<App />);

    await screen.findAllByRole('heading', { level: 3 });
    const outline = screen
      .getAllByRole('heading')
      .map((heading) => Number(heading.tagName.slice(1)));
    expect(outline[0]).toBe(1);
    for (let index = 1; index < outline.length; index += 1) {
      expect((outline[index] as number) - (outline[index - 1] as number)).toBeLessThanOrEqual(1);
    }
  });

  it('shows each lesson its authored content version, not the release version', async () => {
    answerWith(importedRelease);

    render(<App />);

    // Scoped to `main` since the visual-design slice: the sidebar's four destinations and the
    // breadcrumb trail are list items too, and they come first in document order.
    const first = (await within(screen.getByRole('main')).findAllByRole('listitem'))[0];
    expect(first?.textContent).toContain('2.0.0-draft');
  });
});

describe('the page after a refused release', () => {
  const refused = {
    state: 'failed',
    failure: {
      code: 'hash_mismatch',
      message:
        'lessons/HTTP_Lesson_03_Student_Edition_v1.md does not match the hash the release gives for it. Expected aaa, received bbb.',
      file: 'lessons/HTTP_Lesson_03_Student_Edition_v1.md',
    },
  };

  it('states which file failed, in the words the server gave', async () => {
    answerWith(refused);

    render(<App />);

    expect(await screen.findByText(/lessons\/HTTP_Lesson_03_Student_Edition_v1\.md/)).toBeDefined();
  });

  it('lists no lesson at all, rather than the ones that did verify', async () => {
    answerWith(refused);

    render(<App />);

    await screen.findByText(/does not match the hash/);
    // Scoped to `main` since the visual-design slice; see the note above. The claim is unchanged:
    // no lesson is listed on the page.
    expect(within(screen.getByRole('main')).queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('the page when the local app does not answer', () => {
  it('says so instead of showing an empty lesson list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      }),
    );

    render(<App />);

    expect(await screen.findByText(/connection refused/)).toBeDefined();
    expect(within(screen.getByRole('main')).queryAllByRole('listitem')).toHaveLength(0);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/release');
  });
});

/** Criteria C1, C2 and C4: a lesson is reached by address, and the address survives a reload. */
describe('moving between the list and one lesson', () => {
  const lessonAnswer = {
    state: 'lesson',
    release: { releaseId: 'FSSE-HTTP-FIRST-FIVE', version: '1.0.0-draft' },
    lesson: {
      order: 1,
      candidateLessonId: 'LS-M020-01',
      contentVersion: '2.0.0-draft',
      documentId: 'FSSE-HTTP-STUDENT-01',
      module: 'M020',
      displayTitle: 'Lesson 1: What happens when your browser asks for something?',
      manifestTitle: 'Lesson 1: What happens when your browser asks for something?',
      sourcePath: 'lessons/HTTP_Lesson_01_Student_Edition_v2.md',
      sha256: 'a'.repeat(64),
      labId: null,
      facts: [],
      bodyMarkdown: 'The opening paragraph of the lesson.',
    },
  };

  /** Both endpoints answer, so a test can follow a link the way a reader does. */
  function answerBothEndpoints(): void {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        const body = url.startsWith('/api/lessons/') ? lessonAnswer : importedRelease;
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }),
    );
  }

  it('gives every lesson in the list a real address, openable in a new tab', async () => {
    answerBothEndpoints();

    render(<App />);

    const links = await screen.findAllByRole('link', { name: /^Lesson \d:/ });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/lessons/LS-M020-01',
      '/lessons/LS-M020-02',
    ]);
  });

  it('opens the lesson and puts it in the address bar when a title is followed', async () => {
    answerBothEndpoints();

    render(<App />);
    const link = (await screen.findAllByRole('link', { name: /^Lesson \d:/ }))[0] as HTMLElement;
    fireEvent.click(link);

    await screen.findByText('The opening paragraph of the lesson.');
    expect(window.location.pathname).toBe('/lessons/LS-M020-01');
  });

  it('moves focus to the new page, so a keyboard reader is not left on the old one', async () => {
    answerBothEndpoints();

    render(<App />);
    fireEvent.click(
      (await screen.findAllByRole('link', { name: /^Lesson \d:/ }))[0] as HTMLElement,
    );

    await screen.findByText('The opening paragraph of the lesson.');
    expect(document.activeElement).toBe(screen.getByRole('main'));
  });

  it('leaves focus alone on first paint, where nothing has changed yet', async () => {
    answerBothEndpoints();

    render(<App />);

    await screen.findAllByRole('link', { name: /^Lesson \d:/ });
    expect(document.activeElement).toBe(document.body);
  });

  it('returns the reader to the top when a lesson is opened', async () => {
    answerBothEndpoints();
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    render(<App />);
    fireEvent.click(
      (await screen.findAllByRole('link', { name: /^Lesson \d:/ }))[0] as HTMLElement,
    );

    await screen.findByText('The opening paragraph of the lesson.');
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it('renders the lesson when the address is opened directly, with no list visited first', async () => {
    window.history.pushState({}, '', '/lessons/LS-M020-01');
    answerBothEndpoints();

    render(<App />);

    const title = await screen.findByRole('heading', { level: 1 });
    expect(title.textContent).toBe('Lesson 1: What happens when your browser asks for something?');
  });

  it('returns to the list when the browser goes back', async () => {
    answerBothEndpoints();

    render(<App />);
    fireEvent.click(
      (await screen.findAllByRole('link', { name: /^Lesson \d:/ }))[0] as HTMLElement,
    );
    await screen.findByText('The opening paragraph of the lesson.');

    window.history.back();

    await waitFor(() => {
      expect(screen.queryByText('The opening paragraph of the lesson.')).toBeNull();
    });
    expect(window.location.pathname).toBe('/');
    expect(await screen.findAllByRole('link', { name: /^Lesson \d:/ })).toHaveLength(2);
  });

  it('says so plainly when the address is one the app does not serve', async () => {
    window.history.pushState({}, '', '/somewhere-else');
    answerBothEndpoints();

    render(<App />);

    expect(await screen.findByText(/no page at this address/i)).toBeDefined();
  });
});
