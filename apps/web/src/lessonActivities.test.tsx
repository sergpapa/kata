import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { App } from './App.js';
import { fiveLessons, importedRelease, lessonDetail } from './testkit/apiFixture.js';
import type { LessonActivity } from './releaseTypes.js';

/**
 * Criteria U1–U4 in docs/specs/activity-placement.md, through the whole client: an activity whose
 * section the lesson no longer carries is shown at the foot of the lesson with its prompt, and the
 * sidebar's contents list stays a picture of the authored headings alone.
 */

const jsonHeaders = { 'content-type': 'application/json' };

function activity(over: Partial<LessonActivity> = {}): LessonActivity {
  return {
    activityId: 'ACT-M020-01-01',
    lessonId: 'LS-M020-01',
    kind: 'interpretation',
    title: 'Practice A: explain a supplied exchange',
    sourceHeading: 'Practice A: explain a supplied exchange',
    responseFields: ['prediction', 'observation', 'explanation', 'help_used'],
    promptMarkdown: 'Explain the exchange in three steps.',
    ...over,
  };
}

const body = [
  '## 9. Try a similar example with less help',
  '',
  'Prose inside the section.',
  '',
  '### Practice A: explain a supplied exchange',
  '',
  'The client sends a request.',
].join('\n');

function serve(activities: LessonActivity[], second?: LessonActivity[]): void {
  const answerFor = (order: number, own: LessonActivity[]) => ({
    ...lessonDetail(order, body),
    activities: own,
    previous: null,
    next: null,
  });
  const answers = new Map<string, unknown>([
    [fiveLessons[0]?.candidateLessonId ?? '', answerFor(1, activities)],
    [fiveLessons[1]?.candidateLessonId ?? '', answerFor(2, second ?? [])],
  ]);

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (url === '/api/resume-point') {
        return new Response(JSON.stringify({ state: init?.method === 'PUT' ? 'set' : 'none' }), {
          status: 200,
          headers: jsonHeaders,
        });
      }
      if (url.startsWith('/api/lessons/')) {
        const key = decodeURIComponent(url.slice('/api/lessons/'.length));
        return new Response(JSON.stringify(answers.get(key) ?? answerFor(1, activities)), {
          status: 200,
          headers: jsonHeaders,
        });
      }
      return new Response(JSON.stringify(importedRelease()), { status: 200, headers: jsonHeaders });
    }),
  );
}

function openLesson(): void {
  window.history.replaceState(
    {},
    '',
    `/lessons/${encodeURIComponent(fiveLessons[0]?.candidateLessonId ?? '')}`,
  );
  render(<App />);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

describe('activities on a lesson page', () => {
  it('places the panel inside the lesson body and shows nothing at the foot', async () => {
    serve([activity()]);
    openLesson();

    await screen.findByText('The client sends a request.');
    await waitFor(() =>
      expect(document.querySelectorAll('.lesson-body .activity-panel')).toHaveLength(1),
    );
    expect(document.querySelectorAll('.activity-foot')).toHaveLength(0);
  });

  it('shows an activity whose heading the lesson lost at the foot, naming the heading', async () => {
    serve([activity({ sourceHeading: 'Practice A: a heading the author renamed' })]);
    openLesson();

    const foot = await waitFor(() => {
      const element = document.querySelector('.activity-foot');
      if (!element) throw new Error('no foot panel yet');
      return element as HTMLElement;
    });

    expect(foot.textContent).toContain('Practice A: a heading the author renamed');
    expect(document.querySelectorAll('.lesson-body .activity-panel')).toHaveLength(0);
  });

  it('puts the foot panel after the lesson body and before previous/next', async () => {
    serve([activity({ sourceHeading: 'A heading nobody wrote' })]);
    openLesson();

    await waitFor(() => expect(document.querySelector('.activity-foot')).not.toBeNull());
    const reader = document.querySelector('.lesson-reader') as HTMLElement;
    const order = [...reader.children].map((element) => element.className || element.tagName);
    const body = order.findIndex((name) => name.includes('lesson-body'));
    const foot = order.findIndex((name) => name.includes('activity-foot'));
    expect(body).toBeGreaterThanOrEqual(0);
    expect(foot).toBeGreaterThan(body);
  });

  it('renders the prompt of an activity it could not place, so the activity is still doable', async () => {
    serve([
      activity({
        sourceHeading: 'A heading nobody wrote',
        promptMarkdown: 'Explain the exchange in **three** steps.',
      }),
    ]);
    openLesson();

    const foot = await waitFor(() => {
      const element = document.querySelector('.activity-foot');
      if (!element) throw new Error('no foot panel yet');
      return element as HTMLElement;
    });

    expect(foot.textContent).toContain('Explain the exchange in three steps.');
    expect(foot.querySelector('strong')?.textContent).toBe('three');
  });

  it('keeps a heading inside a rendered prompt out of the contents list', async () => {
    serve([
      activity({
        sourceHeading: 'A heading nobody wrote',
        promptMarkdown: '## A heading the author put inside a prompt\n\nAnswer it.',
      }),
    ]);
    openLesson();

    await waitFor(() => expect(document.querySelector('.activity-foot')).not.toBeNull());
    const entries = [...document.querySelectorAll('.contents-list a')].map(
      (anchor) => anchor.textContent,
    );
    expect(entries).toEqual(['9. Try a similar example with less help']);
  });

  it('keeps every contents entry the authored body has', async () => {
    serve([activity()]);
    openLesson();

    await waitFor(() =>
      expect([...document.querySelectorAll('.contents-list a')].map((a) => a.textContent)).toEqual([
        '9. Try a similar example with less help',
      ]),
    );
  });
});

/**
 * The review findings, pinned. Each of these was a defect in the first implementation of this
 * slice: none was a test that already existed and stopped holding.
 */
describe('the review findings on the lesson page', () => {
  it('never shows one lesson’s unplaced activity on another lesson', async () => {
    // The foot panels were component state with no teardown, while the outline had one, and the
    // page is not remounted between lessons. So lesson 2's first commit drew lesson 1's activity
    // and its whole prompt, under lesson 2's title, until an effect corrected it.
    //
    // Watching the settled DOM cannot see this — it corrects itself — and watching for an added
    // node cannot either, because React keeps the same element and rewrites its contents. So this
    // checks the thing that must never be true at any moment: a foot panel on screen beside a
    // lesson title that is not the one it belongs to.
    serve([activity({ sourceHeading: 'A heading nobody wrote' })], []);
    openLesson();

    await waitFor(() => expect(document.querySelector('.activity-foot')).not.toBeNull());

    const wrongLesson: string[] = [];
    const check = () => {
      const foot = document.querySelector('.activity-foot');
      const title = document.querySelector('.lesson-reader h1')?.textContent ?? '';
      if (foot && title.includes('Lesson 2')) wrongLesson.push(`${title} :: ${foot.textContent}`);
    };
    const observer = new MutationObserver(check);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    try {
      window.history.pushState({}, '', `/lessons/${fiveLessons[1]?.candidateLessonId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      await waitFor(() =>
        expect(document.querySelector('.lesson-reader h1')?.textContent).toContain('Lesson 2'),
      );
      await waitFor(() => expect(document.querySelector('.activity-foot')).toBeNull());
      check();
    } finally {
      observer.disconnect();
    }

    expect(wrongLesson, 'lesson 2 carries no unplaced activity and must never draw one').toEqual(
      [],
    );
  });

  it('does not render the prompt when the section is on the page twice', async () => {
    // heading_ambiguous means the authored section IS visible — twice over. Rendering the prompt
    // here would put the excerpt on the page a third time, which is the one thing the activity
    // file's own presentation rule forbids.
    const twice = [
      '## Practice A',
      '',
      'The client sends a request.',
      '',
      '## Practice A',
      '',
      'And again.',
    ].join('\n');
    const answer = {
      ...lessonDetail(1, twice),
      activities: [
        activity({ sourceHeading: 'Practice A', promptMarkdown: 'A prompt nobody should see.' }),
      ],
      previous: null,
      next: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/resume-point') {
          return new Response(JSON.stringify({ state: 'none' }), {
            status: 200,
            headers: jsonHeaders,
          });
        }
        if (url.startsWith('/api/lessons/')) {
          return new Response(JSON.stringify(answer), { status: 200, headers: jsonHeaders });
        }
        return new Response(JSON.stringify(importedRelease()), {
          status: 200,
          headers: jsonHeaders,
        });
      }),
    );
    openLesson();

    const foot = await waitFor(() => {
      const element = document.querySelector('.activity-foot');
      if (!element) throw new Error('no foot panel yet');
      return element as HTMLElement;
    });

    expect(foot.textContent).toContain('more than one');
    expect(foot.textContent).not.toContain('A prompt nobody should see.');
    expect(foot.querySelector('.activity-prompt')).toBeNull();
  });

  it('gives a rendered prompt no heading ids, so none can collide with the body’s', async () => {
    // Two independent Markdown passes each run rehype-slug, which only dedupes within its own
    // pass. A prompt heading matching a body heading produced two elements with the same id, and
    // a contents anchor then had two targets.
    serve([
      activity({
        sourceHeading: 'A heading nobody wrote',
        promptMarkdown: '## 9. Try a similar example with less help\n\nAnswer it.',
      }),
    ]);
    openLesson();

    await waitFor(() => expect(document.querySelector('.activity-foot')).not.toBeNull());

    const ids = [...document.querySelectorAll('.lesson-reader [id]')].map((element) => element.id);
    expect(new Set(ids).size, `duplicate ids: ${ids.join(', ')}`).toBe(ids.length);
    expect(document.querySelectorAll('.activity-prompt [id]')).toHaveLength(0);
  });

  it('does not claim a lesson has no such heading when one is nested inside a quote', async () => {
    // A heading inside a blockquote is in the contents list but is not a section, so an activity
    // naming it cannot be placed. Saying "no heading with that name" would be a claim the reader
    // can see is false.
    const quoted = ['## A real section', '', '> ### Practice A', '', 'Quoted prose.'].join('\n');
    const answer = {
      ...lessonDetail(1, quoted),
      activities: [activity({ sourceHeading: 'Practice A' })],
      previous: null,
      next: null,
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url === '/api/resume-point') {
          return new Response(JSON.stringify({ state: 'none' }), {
            status: 200,
            headers: jsonHeaders,
          });
        }
        if (url.startsWith('/api/lessons/')) {
          return new Response(JSON.stringify(answer), { status: 200, headers: jsonHeaders });
        }
        return new Response(JSON.stringify(importedRelease()), {
          status: 200,
          headers: jsonHeaders,
        });
      }),
    );
    openLesson();

    const foot = await waitFor(() => {
      const element = document.querySelector('.activity-foot');
      if (!element) throw new Error('no foot panel yet');
      return element as HTMLElement;
    });

    expect(foot.textContent).toContain('no section with that heading');
    expect(foot.textContent).not.toContain('no heading with that name');
  });
});
