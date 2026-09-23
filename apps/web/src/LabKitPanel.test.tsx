import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { LessonPage } from './LessonPage.js';

/**
 * Criteria K5–K9 in docs/specs/lab-downloads.md.
 *
 * The kit is the one control on a lesson page that sends the reader off this machine's browser and
 * into their own terminal, so what the panel says about it has to be true without being read twice:
 * which file, which version, which lessons share it, what its bytes hash to — and that this app
 * will never run it.
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

const KIT_SHA = '913e53d3e00ab376cd50ec977e3861b1ab4b136a28dec7baf168e4d858f5e1c5';

const sharedKit = {
  labId: 'FSSE-HTTP-LAB-06-08',
  version: '1.0.1-draft',
  fileName: 'HTTP_Lessons_06_08_Local_Kit_v1.zip',
  byteSize: 39167,
  sha256: KIT_SHA,
  lessons: [
    { order: 6, candidateLessonId: 'LS-M020-06' },
    { order: 7, candidateLessonId: 'LS-M020-07' },
    { order: 8, candidateLessonId: 'LS-M020-08' },
  ],
};

function lessonAnswer(labKit: unknown, order = 6) {
  return {
    state: 'lesson',
    release: { releaseId: 'FSSE-HTTP-FIRST-FIFTEEN', version: '1.0.1-draft' },
    lesson: {
      order,
      candidateLessonId: `LS-M020-0${order}`,
      contentVersion: '1.0.0-draft',
      documentId: `FSSE-HTTP-STUDENT-0${order}`,
      module: 'M020',
      displayTitle: `Lesson ${order}: the authored title`,
      manifestTitle: `Lesson ${order}: the authored title`,
      sourcePath: `lessons/HTTP_Lesson_0${order}_Student_Edition_v1.md`,
      sha256: 'a'.repeat(64),
      labId: (labKit as { labId?: string } | null)?.labId ?? null,
      facts: [{ key: 'status', label: 'Status', kind: 'line', text: 'owner-review candidate' }],
      bodyMarkdown: '## 1. A section\n\nAuthored prose.',
    },
    labKit,
    activities: [],
    responses: [],
    previous: null,
    next: null,
  };
}

function panel(): HTMLElement {
  return screen.getByRole('region', { name: /practice kit/i });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the kit on a lesson that has one', () => {
  it('names the file, the lab, its version, its size and its whole hash', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    const text = panel().textContent ?? '';
    expect(text).toContain('HTTP_Lessons_06_08_Local_Kit_v1.zip');
    expect(text).toContain('FSSE-HTTP-LAB-06-08');
    expect(text).toContain('1.0.1-draft');
    expect(text).toContain('39,167');
    // The whole hash, not a prefix: four handoffs ask the reader to compare it with the registry,
    // and a truncated hash cannot be compared.
    expect(text).toContain(KIT_SHA);
  });

  it('offers a download that goes to this kit by its lab id', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    const link = within(panel()).getByRole('link', { name: /download/i });
    expect(link.getAttribute('href')).toBe('/api/labs/FSSE-HTTP-LAB-06-08/download');
  });

  it('says which lessons share a kit, by number', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    const text = panel().textContent ?? '';
    expect(text).toMatch(/lessons\s+6,\s*7\s+and\s+8/i);
  });

  it('says "14 and 15" for a kit shared by exactly two, with no stray comma', async () => {
    // The shipped release has one: FSSE-HTTP-LAB-14-15. The three-lesson case above and the
    // one-lesson case below leave the two-lesson branch of `listed()` unexercised, and "14, and 15"
    // would ship silently.
    answerWith(
      lessonAnswer(
        {
          ...sharedKit,
          labId: 'FSSE-HTTP-LAB-14-15',
          lessons: [
            { order: 14, candidateLessonId: 'LS-M021-06' },
            { order: 15, candidateLessonId: 'LS-M021-07' },
          ],
        },
        6,
      ),
    );

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    expect(panel().textContent ?? '').toContain('lessons 14 and 15');
  });

  it('never names the reader’s own lesson as one the kit is *shared with*', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    // The list includes the lesson being read, so the wording has to be "used by" and not
    // "shared with" — being told a kit is shared with the page you are standing on reads as a bug.
    expect(panel().textContent ?? '').not.toMatch(/shared with/i);
  });

  it('keeps the checksum and the version out of the reader’s way, behind a disclosure', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    // Open, this panel measured ~605px on a 375px phone and put the lesson's first sentence more
    // than a screen and a half down — the problem collapsing the facts list above it solved. What
    // the reader acts on stays out; what they check a download against does not.
    const details = panel().querySelector('details');
    expect(details, 'the identity and hash belong behind a disclosure').not.toBeNull();
    expect(details?.hasAttribute('open')).toBe(false);
    expect(details?.textContent).toContain(KIT_SHA);
    expect(details?.textContent).toContain('FSSE-HTTP-LAB-06-08');

    // And the three things a reader acts on are not inside it.
    const open = panel().textContent?.replace(details?.textContent ?? '', '') ?? '';
    expect(open).toContain('HTTP_Lessons_06_08_Local_Kit_v1.zip');
    expect(open).toMatch(/never runs it/i);
    expect(
      within(panel())
        .getByRole('link', { name: /download/i })
        .closest('details'),
    ).toBeNull();
  });

  it('says nothing about sharing when only this lesson uses the kit', async () => {
    answerWith(
      lessonAnswer(
        {
          ...sharedKit,
          labId: 'FSSE-HTTP-LAB-02',
          lessons: [{ order: 2, candidateLessonId: 'LS-M020-02' }],
        },
        2,
      ),
    );

    render(<LessonPage candidateLessonId="LS-M020-02" />);
    await screen.findByRole('heading', { level: 1 });

    expect(panel().textContent ?? '').not.toMatch(/shared|also used by/i);
  });

  it('says the kit runs on the reader’s computer and that this app never runs it', async () => {
    answerWith(lessonAnswer(sharedKit));

    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    const text = panel().textContent ?? '';
    expect(text).toMatch(/your own computer|your computer/i);
    expect(text).toMatch(/never runs it|does not run it/i);
  });

  it('sits between the facts and the lesson body, on every lesson that has a kit', async () => {
    answerWith(lessonAnswer(sharedKit));

    const { container } = render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });

    const article = container.querySelector('.lesson-reader') as HTMLElement;
    const order = [...article.children];
    const factsAt = order.findIndex((node) => node.matches('details, .lesson-facts'));
    const kitAt = order.findIndex((node) => node.matches('.lab-kit'));
    const bodyAt = order.findIndex(
      (node) => node.querySelector('.lesson-body') ?? node.matches('.lesson-body'),
    );

    expect(kitAt).toBeGreaterThan(factsAt);
    expect(kitAt).toBeLessThan(bodyAt);
  });
});

describe('a lesson with no kit', () => {
  it('says so rather than showing nothing at all', async () => {
    answerWith(lessonAnswer(null, 1));

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
    // Silence is indistinguishable from a panel that failed to load, and lesson 1 is the first page
    // anyone sees.
    expect(screen.getByText(/needs no kit/i)).toBeTruthy();
  });
});

describe('a release the app refused', () => {
  it('offers no kit at all', async () => {
    // The same lesson served twice: once imported, once refused. Without the first half this case
    // passes against an app that has no kit panel anywhere.
    answerWith(lessonAnswer(sharedKit));
    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByRole('link', { name: /download/i })).toBeTruthy();
    cleanup();

    answerWith({
      state: 'failed',
      failure: { code: 'hash_mismatch', message: 'The release was refused.', file: 'labs/kit.zip' },
    });
    render(<LessonPage candidateLessonId="LS-M020-06" />);
    await screen.findByRole('alert');

    expect(screen.queryByRole('link', { name: /download/i })).toBeNull();
    expect(screen.queryByRole('region', { name: /practice kit/i })).toBeNull();
  });
});
