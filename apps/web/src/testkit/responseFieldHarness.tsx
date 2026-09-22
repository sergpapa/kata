import { afterEach, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { activity, lessonBody, panelOf } from './activityFixture.js';
import type { StoredResponse } from '../releaseTypes.js';

/**
 * The fixtures the response-field suites share: a strict fake server, the answers it can give, and
 * the readers that turn a rendered panel into something a test can state a claim about.
 *
 * Extracted when ResponseField.test.tsx passed 750 lines. Shared rather than copied because the
 * strictness of `stubFetch` is load-bearing in both files — a second copy that drifted into being
 * lenient would make one suite quietly stop noticing an unexpected request.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

export type Answer = () => Promise<Response>;

/**
 * A fetch that answers exactly what the test queued, one answer per call, in order — and throws
 * if the page asks for anything it was not told to expect. That strictness is the point: a field
 * that quietly re-sends, or that sends on a keystroke, shows up here as a failure rather than as a
 * passing test with a surprise request in it.
 */
export function stubFetch(...initial: readonly Answer[]) {
  const calls: { url: string; body: unknown }[] = [];
  const queue: Answer[] = [...initial];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body as string) : undefined });
      const next = queue.shift();
      if (!next) throw new Error(`nothing queued to answer ${url}`);
      return next();
    }),
  );
  return {
    calls,
    answer: (...more: readonly Answer[]) => queue.push(...more),
  };
}

export const saved =
  (revision: number, updatedAt = '2026-09-22T14:02:00.000Z') =>
  async () =>
    new Response(JSON.stringify({ state: 'saved', revision, updatedAt }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

export const conflict = (text: string, revision: number) => async () =>
  new Response(
    JSON.stringify({
      error: 'revision_conflict',
      message: 'This field was saved somewhere else since you opened it.',
      stored: { text, revision, updatedAt: '2026-09-22T14:05:00.000Z' },
    }),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );

export const refused =
  (error: string, message: string, status = 400) =>
  async () =>
    new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'content-type': 'application/json' },
    });

export const offline = () => async () => {
  throw new TypeError('Failed to fetch');
};

/** Never settles, so a test can look at the page while the request is still in flight. */
export const inFlight = () => () => new Promise<Response>(() => {});

export function renderPanel(
  over: Parameters<typeof activity>[0] = {},
  responses: readonly StoredResponse[] = [],
) {
  return render(
    <LessonMarkdown
      markdown={lessonBody}
      activities={[activity({ activityId: 'ACT-A', ...over })]}
      responses={responses}
    />,
  );
}

export function fieldOf(container: HTMLElement, fieldName: string): HTMLElement {
  const field = panelOf(container, 'ACT-A').querySelector(
    `.response-field[data-field-name="${fieldName}"]`,
  );
  if (!field) throw new Error(`no ${fieldName} field on the panel`);
  return field as HTMLElement;
}

export function boxOf(container: HTMLElement, fieldName: string): HTMLTextAreaElement {
  return within(fieldOf(container, fieldName)).getByRole('textbox') as HTMLTextAreaElement;
}

export function stateOf(container: HTMLElement, fieldName: string): string {
  return fieldOf(container, fieldName).getAttribute('data-state') ?? '';
}

export function saveButton(container: HTMLElement, fieldName: string): HTMLElement {
  return within(fieldOf(container, fieldName)).getByRole('button', { name: /^save/i });
}

export function stored(over: Partial<StoredResponse> = {}): StoredResponse {
  return {
    activityId: 'ACT-A',
    fieldName: 'prediction',
    text: 'what was acknowledged',
    revision: 3,
    updatedAt: '2026-09-22T09:00:00.000Z',
    ...over,
  };
}
