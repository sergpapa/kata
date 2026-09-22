import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonPage } from './LessonPage.js';
import { fiveLessons, releaseSummary } from './testkit/apiFixture.js';

/**
 * Criteria F2 and F10 in docs/specs/acknowledged-saves.md — the plumbing between the lesson answer
 * and the boxes on the page.
 *
 * ResponseField.test.tsx drives the states with the panel rendered directly. This file asks the
 * different question: does what the server actually answered reach the right box, on the first
 * paint, including for a panel the body could not place. A field that renders empty and fills a
 * moment later reads to the owner as work that was lost and came back, so F2 is written as a claim
 * about the very first render rather than about the settled page.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

const body = [
  '# Lesson 1: the authored title',
  '',
  '## Practice A',
  '',
  'Authored prose inside Practice A.',
  '',
  '## Practice B',
  '',
  'Authored prose inside Practice B.',
].join('\n');

function activity(over: Record<string, unknown> = {}) {
  return {
    activityId: 'ACT-A',
    lessonId: 'LS-M020-01',
    kind: 'interpretation',
    title: 'Practice A',
    sourceHeading: 'Practice A',
    responseFields: ['prediction', 'observation'],
    promptMarkdown: 'The authored prompt.',
    ...over,
  };
}

function answerLesson(options: {
  activities: readonly Record<string, unknown>[];
  responses: readonly Record<string, unknown>[];
}) {
  const seen: { url: string; method: string; body: unknown }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      seen.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (url.startsWith('/api/activities/')) {
        return new Response(
          JSON.stringify({ state: 'saved', revision: 1, updatedAt: '2026-09-22T14:00:00.000Z' }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.startsWith('/api/resume-point')) {
        return new Response(JSON.stringify({ state: 'none' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({
          state: 'lesson',
          release: { releaseId: releaseSummary.releaseId, version: releaseSummary.version },
          lesson: {
            ...fiveLessons[0],
            facts: [{ key: 'status', label: 'Status', kind: 'line', text: 'not yet tested' }],
            bodyMarkdown: body,
          },
          activities: options.activities,
          responses: options.responses,
          previous: null,
          next: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
  return seen;
}

function fieldOf(activityId: string, fieldName: string): HTMLElement {
  const field = document.querySelector(
    `.activity-panel[data-activity-id="${activityId}"] .response-field[data-field-name="${fieldName}"]`,
  );
  if (!field) throw new Error(`no ${fieldName} field on ${activityId}`);
  return field as HTMLElement;
}

describe('stored work reaching the boxes', () => {
  it('has the stored text in the box the first time the box is on the page', async () => {
    answerLesson({
      activities: [activity()],
      responses: [
        {
          activityId: 'ACT-A',
          fieldName: 'prediction',
          text: 'what I wrote last week',
          revision: 2,
          updatedAt: '2026-09-15T10:00:00.000Z',
        },
      ],
    });

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    const box = (await screen.findByLabelText(/your prediction/i)) as HTMLTextAreaElement;

    // The claim is about the first appearance, not the settled page: the box must never have been
    // rendered empty and then filled.
    expect(box.value).toBe('what I wrote last week');
    expect(fieldOf('ACT-A', 'prediction').getAttribute('data-state')).toBe('saved');
  });

  it('leaves a field the answer did not mention empty and unsaved', async () => {
    answerLesson({
      activities: [activity()],
      responses: [
        {
          activityId: 'ACT-A',
          fieldName: 'prediction',
          text: 'only this one',
          revision: 1,
          updatedAt: '2026-09-15T10:00:00.000Z',
        },
      ],
    });

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    await screen.findByLabelText(/your prediction/i);

    const observation = within(fieldOf('ACT-A', 'observation')).getByRole(
      'textbox',
    ) as HTMLTextAreaElement;
    expect(observation.value).toBe('');
    expect(fieldOf('ACT-A', 'observation').getAttribute('data-state')).toBe('unsaved');
  });

  it('gives an activity shown at the lesson’s foot the same writing surfaces', async () => {
    answerLesson({
      activities: [activity({ sourceHeading: 'A heading this lesson does not carry' })],
      responses: [
        {
          activityId: 'ACT-A',
          fieldName: 'observation',
          text: 'recorded against the activity, not the place',
          revision: 1,
          updatedAt: '2026-09-15T10:00:00.000Z',
        },
      ],
    });

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    await screen.findByLabelText(/what you observed/i);

    const foot = document.querySelector('.activity-foot');
    expect(foot?.querySelectorAll('.response-field')).toHaveLength(2);
    const box = within(fieldOf('ACT-A', 'observation')).getByRole('textbox') as HTMLTextAreaElement;
    expect(box.value).toBe('recorded against the activity, not the place');
  });

  it('addresses the save to the activity, whatever lesson page it was typed on', async () => {
    const seen = answerLesson({ activities: [activity()], responses: [] });

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    const box = await screen.findByLabelText(/your prediction/i);
    fireEvent.change(box, { target: { value: 'my answer' } });
    fireEvent.click(within(fieldOf('ACT-A', 'prediction')).getByRole('button', { name: /^save/i }));

    await waitFor(() =>
      expect(seen.some((call) => call.method === 'PUT' && call.url.includes('/responses/'))).toBe(
        true,
      ),
    );
    const put = seen.find((call) => call.url.includes('/responses/'));
    expect(put?.url).toBe('/api/activities/ACT-A/responses/prediction');
    expect(put?.body).toEqual({ text: 'my answer', expectedRevision: 0 });
  });

  it('asks for nothing about responses beyond the lesson request itself', async () => {
    const seen = answerLesson({ activities: [activity()], responses: [] });

    render(<LessonPage candidateLessonId="LS-M020-01" />);
    await screen.findByLabelText(/your prediction/i);

    // A second request for responses would be the flash-of-empty F2 forbids, arriving by another
    // route. The lesson answer carries them.
    expect(seen.filter((call) => call.url.includes('/responses'))).toEqual([]);
  });
});
