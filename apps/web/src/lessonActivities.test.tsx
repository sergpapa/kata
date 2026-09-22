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

function serve(activities: LessonActivity[]): void {
  const answer = { ...lessonDetail(1, body), activities, previous: null, next: null };
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
        return new Response(JSON.stringify(answer), { status: 200, headers: jsonHeaders });
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
