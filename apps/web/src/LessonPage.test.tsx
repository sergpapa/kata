import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LessonPage } from './LessonPage.js';

/**
 * Criteria T and C3 in docs/specs/markdown-rendering.md: one lesson on the page — its authored
 * title, the facts a learner is meant to see, the body, and an honest answer when there is none.
 */

function answerWith(body: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        }),
    ),
  );
}

const lessonBody = [
  'The opening paragraph of the lesson.',
  '',
  '## 1. Start with a familiar situation',
  '',
  '| In the café | In our web example |',
  '| --- | --- |',
  '| You ask for a menu | The browser acts as a client |',
  '',
  '```http',
  'GET /menu HTTP/1.1',
  'Host: cafe.example',
  '',
  '```',
].join('\n');

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
    facts: [
      {
        key: 'status',
        label: 'Status',
        kind: 'line',
        text: 'Student-facing rewrite for review; not yet learner-tested',
      },
      {
        key: 'learning_outcomes',
        label: 'What you will be able to do',
        kind: 'list',
        items: ['Explain the roles of browser, client, and server', 'Distinguish a request'],
      },
    ],
    bodyMarkdown: lessonBody,
  },
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('a lesson the release carries', () => {
  it('asks the app for that lesson by its stable key', async () => {
    answerWith(lessonAnswer);

    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    await screen.findByRole('heading', { level: 1 });
    expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe('/api/courses/FSSE/lessons/LS-M020-01');
  });

  it('makes the authored title the page heading', async () => {
    answerWith(lessonAnswer);

    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    const title = await screen.findByRole('heading', { level: 1 });
    expect(title.textContent).toBe('Lesson 1: What happens when your browser asks for something?');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the body below the title without repeating it', async () => {
    answerWith(lessonAnswer);
    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByText('The opening paragraph of the lesson.')).toBeDefined();
    expect(
      screen.getByRole('heading', { level: 2, name: '1. Start with a familiar situation' }),
    ).toBeDefined();
    expect(container.querySelector('table')).not.toBeNull();
    expect(container.querySelector('pre')?.textContent).toContain('Host: cafe.example');
  });

  it('shows the front-matter facts with their labels, lists as lists', async () => {
    answerWith(lessonAnswer);

    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    expect(await screen.findByText('Status')).toBeDefined();
    expect(
      screen.getByText('Student-facing rewrite for review; not yet learner-tested'),
    ).toBeDefined();
    expect(screen.getByText('What you will be able to do')).toBeDefined();
    expect(screen.getByText('Explain the roles of browser, client, and server').tagName).toBe('LI');
  });

  it('shows no YAML key anywhere on the page', async () => {
    answerWith(lessonAnswer);
    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    await screen.findByRole('heading', { level: 1 });

    for (const key of [
      'candidate_lesson_id',
      'document_id',
      'learning_outcomes',
      'assessment_scope',
    ]) {
      expect(container.textContent).not.toContain(key);
    }
  });

  it('names the lesson key, content version and release the words came from', async () => {
    answerWith(lessonAnswer);

    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    await screen.findByRole('heading', { level: 1 });
    const page = container.textContent ?? '';
    expect(page).toContain('LS-M020-01');
    expect(page).toContain('2.0.0-draft');
    expect(page).toContain('FSSE-HTTP-FIRST-FIVE');
  });

  it('offers the way back to the lesson list', async () => {
    answerWith(lessonAnswer);

    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: /all lessons/i }).getAttribute('href')).toBe(
      '/courses/FSSE',
    );
  });
});

describe('a lesson the release does not carry', () => {
  it('says so, names the key asked for, and renders no lesson', async () => {
    answerWith(
      { error: 'lesson_not_found', message: 'This release has no lesson LS-M020-09.' },
      404,
    );
    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-09" />);

    expect(await screen.findByText(/LS-M020-09/)).toBeDefined();
    expect(container.querySelector('h1')).toBeNull();
    expect(screen.getByRole('link', { name: /all lessons/i }).getAttribute('href')).toBe(
      '/courses/FSSE',
    );
  });
});

describe('a lesson asked for while the release stands refused', () => {
  it('states the named refusal rather than pretending the lesson is missing', async () => {
    answerWith({
      state: 'failed',
      failure: {
        code: 'hash_mismatch',
        message:
          'lessons/HTTP_Lesson_03_Student_Edition_v1.md does not match the hash the release gives for it.',
        file: 'lessons/HTTP_Lesson_03_Student_Edition_v1.md',
      },
    });
    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-03" />);

    expect(await screen.findByText(/does not match the hash/)).toBeDefined();
    expect(container.querySelector('h1')).toBeNull();
  });
});

describe('a lesson asked for while the local app is not answering', () => {
  it('says the app did not answer instead of showing an empty lesson', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      }),
    );
    const { container } = render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    expect(await screen.findByText(/connection refused/)).toBeDefined();
    expect(container.querySelector('h1')).toBeNull();
  });
});
