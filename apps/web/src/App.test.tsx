import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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

    expect(await screen.findByText(/FSSE-HTTP-FIRST-FIVE/)).toBeDefined();
    expect(await screen.findByText(/1\.0\.0-draft/)).toBeDefined();
  });

  it('shows each lesson its authored content version, not the release version', async () => {
    answerWith(importedRelease);

    render(<App />);

    const first = (await screen.findAllByRole('listitem'))[0];
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

    expect(
      await screen.findByText(/lessons\/HTTP_Lesson_03_Student_Edition_v1\.md/),
    ).toBeDefined();
  });

  it('lists no lesson at all, rather than the ones that did verify', async () => {
    answerWith(refused);

    render(<App />);

    await screen.findByText(/does not match the hash/);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
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
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/release');
  });
});
