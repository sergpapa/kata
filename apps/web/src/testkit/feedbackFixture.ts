import { ReadableStream } from 'node:stream/web';
import { vi } from 'vitest';
import { fiveLessons, releaseSummary } from './apiFixture.js';
import type {
  FeedbackArea,
  FeedbackAvailability,
  FeedbackConversation,
  FeedbackTurn,
} from '../activities/feedbackTypes.js';

/**
 * The local server for the feedback tests: a lesson with one activity, and a feedback route whose
 * stream the test writes to event by event, so it can look at the page mid-reply.
 */

export const body = [
  '# Lesson 1: the authored title',
  '',
  '## Practice A',
  '',
  'Explain one click.',
].join('\n');

export const ACTIVITY = {
  activityId: 'ACT-A',
  lessonId: 'LS-M020-01',
  kind: 'judgment',
  title: 'Practice A',
  sourceHeading: 'Practice A',
  responseFields: ['prediction', 'observation', 'explanation', 'help_used'],
  promptMarkdown: 'Explain one click.',
};

export const FEEDBACK_URL = '/api/courses/FSSE/activities/ACT-A/feedback';

export function area(over: Partial<FeedbackArea> = {}): FeedbackArea {
  return {
    activityId: 'ACT-A',
    hasWorkedAnswer: true,
    conversation: null,
    replying: false,
    ...over,
  };
}

export const sent = [
  { fieldName: 'prediction', text: 'It asks for the menu.' },
  { fieldName: 'observation', text: '' },
  { fieldName: 'explanation', text: '' },
  { fieldName: 'help_used', text: '' },
];

export function learnerTurn(turn = 1, over: Partial<FeedbackTurn> = {}): FeedbackTurn {
  return {
    turn,
    role: 'learner',
    text: turn === 1 ? '' : 'And then?',
    writtenAt: '2026-11-19T10:00:00.000Z',
    ...(turn === 1 ? { sentFields: sent } : {}),
    ...over,
  };
}

export function claudeTurn(turn = 2, over: Partial<FeedbackTurn> = {}): FeedbackTurn {
  return {
    turn,
    role: 'claude',
    text: 'Good start. **What** would you check first?',
    writtenAt: '2026-11-19T10:00:05.000Z',
    model: 'claude-sonnet-5-5',
    outcome: 'complete',
    failure: null,
    ...over,
  };
}

export function conversation(
  turns: readonly FeedbackTurn[],
  conversationId = 7,
): FeedbackConversation {
  return { conversationId, turns };
}

/** A stream the test feeds: `send` writes one server-sent event, `end` closes it. */
export interface TestStream {
  readonly response: Response;
  send(event: string, data: unknown): void;
  end(): void;
  /** Breaks the connection mid-stream, as a dropped network or a reset proxy would. */
  fail(): void;
}

export function testStream(): TestStream {
  const encoder = new TextEncoder();
  let control!: ReadableStreamDefaultController<Uint8Array>;
  // jsdom has no ReadableStream; Node's is the one a real `fetch` Response would carry anyway.
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      control = controller;
    },
  });
  return {
    response: new Response(stream as unknown as BodyInit, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    }),
    send(event, data) {
      control.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    },
    end() {
      control.close();
    },
    fail() {
      control.error(new TypeError('network error'));
    },
  };
}

export interface Seen {
  readonly url: string;
  readonly method: string;
  readonly body: unknown;
}

type Answer = Response | (() => Response) | ((seen: Seen) => Response);

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });

/**
 * Stubs `fetch`. The lesson answer carries `feedback` built from `availability` and `areaNow()`;
 * every POST to the feedback routes is answered by the next entry of `posts`, and every GET of the
 * feedback route by the next of `gets` (the last one again once they run out).
 */
export function serve(options: {
  availability?: FeedbackAvailability;
  areaNow?: () => FeedbackArea;
  /** Omit `feedback` from the lesson answer, as an older server would. */
  noFeedback?: boolean;
  posts?: Answer[];
  gets?: (() => unknown)[];
}): Seen[] {
  const seen: Seen[] = [];
  const posts = [...(options.posts ?? [])];
  const gets = [...(options.gets ?? [])];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const one: Seen = {
        url,
        method: init?.method ?? 'GET',
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
      };
      seen.push(one);
      if (url.startsWith(FEEDBACK_URL) && one.method === 'POST') {
        const next = posts.shift();
        if (!next) throw new Error(`No answer prepared for POST ${url}`);
        return typeof next === 'function' ? next(one) : next;
      }
      if (url.startsWith(FEEDBACK_URL)) {
        const next = gets.length > 1 ? gets.shift() : gets[0];
        return json(next ? next() : {});
      }
      if (url.startsWith('/api/courses/FSSE/resume-point')) return json({ state: 'none' });
      if (url.startsWith('/api/courses/FSSE/activities/')) {
        return json({ state: 'saved', revision: 1, updatedAt: '2026-11-19T09:00:00.000Z' });
      }
      return json({
        state: 'lesson',
        release: { releaseId: releaseSummary.releaseId, version: releaseSummary.version },
        lesson: { ...fiveLessons[0], facts: [], bodyMarkdown: body },
        activities: [ACTIVITY],
        responses: [],
        ...(options.noFeedback
          ? {}
          : {
              feedback: {
                availability: options.availability ?? { state: 'ready' },
                activities: [options.areaNow ? options.areaNow() : area()],
              },
            }),
        labKit: null,
        previous: null,
        next: null,
      });
    }),
  );
  return seen;
}

export { json };
