import { afterEach, describe, expect, it } from 'vitest';
import { fakeRunner, sonnetReply } from './modules/feedback/testkit/fakeRunner.js';
import {
  FEEDBACK_URL,
  cleanUpFeedbackApps,
  feedbackApp,
  lessonFeedbackOf,
  post,
  startBody,
  streamOf,
} from './modules/feedback/testkit/feedbackApp.js';
import type { RunEvent } from './modules/feedback/types.js';

/**
 * EC1–EC3 in docs/specs/earlier-conversations.md: the conversations Start over hid, as the server
 * sends them back.
 *
 * Every conversation here is made through the routes with the fake runner, so "hidden" means what
 * the page's own Start over and Try again produce. Each "not listed" claim is paired with one that
 * is listed in the same store, so a server that never lists anything cannot pass it.
 */

afterEach(cleanUpFeedbackApps);

type App = ReturnType<typeof feedbackApp>['app'];
type Clock = ReturnType<typeof feedbackApp>['clock'];

const FAILED: RunEvent[] = [{ type: 'failed', reason: 'Claude did not finish within 3 minutes.' }];
const NONE_URL = '/api/courses/FIX/activities/ACT-FIX-NONE/feedback';

async function ask(app: App, url = FEEDBACK_URL): Promise<number> {
  const events = streamOf(await post(app, startBody(), url));
  return events[0]?.data.conversationId as number;
}

function clear(app: App, conversationId: number, url = FEEDBACK_URL) {
  return post(app, { conversationId }, `${url}/clear`);
}

async function ownRoute(app: App, url = FEEDBACK_URL) {
  const response = await app.inject({ method: 'GET', url, headers: { host: '127.0.0.1:8317' } });
  return response.json();
}

/** Asks at `at`, then starts over at `clearAt`: one earlier conversation with a reply. */
async function askThenStartOver(app: App, clock: Clock, at: string, clearAt: string) {
  clock.setNow(at);
  const id = await ask(app);
  clock.setNow(clearAt);
  await clear(app, id);
  return id;
}

describe('the earlier list (EC1)', () => {
  it('is empty before anything is asked, and while only a current conversation exists', async () => {
    const { app } = feedbackApp(fakeRunner());

    expect((await lessonFeedbackOf(app)).area.earlier).toEqual([]);
    await ask(app);
    expect((await lessonFeedbackOf(app)).area.earlier).toEqual([]);
    expect((await ownRoute(app)).earlier).toEqual([]);
  });

  it('carries a started-over conversation with its id, times and every turn as it was', async () => {
    const { app, clock } = feedbackApp(
      fakeRunner({ replies: [sonnetReply('First reply.'), sonnetReply('Second reply.')] }),
    );
    clock.setNow('2026-11-19T10:00:00.000Z');
    const id = await ask(app);
    clock.setNow('2026-11-19T10:01:00.000Z');
    streamOf(
      await post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId: id,
        expectedTurns: 2,
        message: 'And then what?',
      }),
    );
    const before = (await lessonFeedbackOf(app)).area.conversation;
    clock.setNow('2026-11-19T10:05:00.000Z');
    await clear(app, id);

    const expected = [
      {
        conversationId: id,
        startedAt: '2026-11-19T10:00:00.000Z',
        clearedAt: '2026-11-19T10:05:00.000Z',
        turns: before.turns,
      },
    ];
    expect(before.turns).toHaveLength(4);
    expect((await lessonFeedbackOf(app)).area.earlier).toEqual(expected);
    expect((await ownRoute(app)).earlier).toEqual(expected);
  });

  it('lists them by when they were started over, newest first', async () => {
    const { app, clock } = feedbackApp(fakeRunner());
    // Started in one order, started over in another: only the clearing time may decide.
    const a = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:00:00.000Z',
      '2026-11-19T10:30:00.000Z',
    );
    const b = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:31:00.000Z',
      '2026-11-19T10:32:00.000Z',
    );
    const c = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:33:00.000Z',
      '2026-11-19T10:40:00.000Z',
    );

    const listed = (await lessonFeedbackOf(app)).area.earlier;
    expect(listed.map((one: { conversationId: number }) => one.conversationId)).toEqual([c, b, a]);
  });

  it('puts the later conversation first when two were started over at the same moment', async () => {
    const { app, clock } = feedbackApp(fakeRunner());
    const first = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:00:00.000Z',
      '2026-11-19T10:10:00.000Z',
    );
    const second = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:10:00.000Z',
      '2026-11-19T10:10:00.000Z',
    );

    const listed = (await lessonFeedbackOf(app)).area.earlier;
    expect(listed.map((one: { conversationId: number }) => one.conversationId)).toEqual([
      second,
      first,
    ]);
  });
});

describe('what is not an earlier conversation (EC2)', () => {
  it('leaves out a hidden conversation that never got a reply, and keeps it in the store', async () => {
    // What Try again does: the failed first question is hidden and asked again.
    const { app, db } = feedbackApp(fakeRunner({ replies: [FAILED, sonnetReply('A reply.')] }));
    const failed = await ask(app);
    await clear(app, failed);
    const answered = await ask(app);

    expect((await lessonFeedbackOf(app)).area.earlier).toEqual([]);
    const stored = db
      .prepare('SELECT COUNT(*) AS n FROM feedback_turn WHERE conversation_id = ?')
      .get(failed) as { n: number };
    expect(stored.n).toBe(2);

    await clear(app, answered);
    const listed = (await lessonFeedbackOf(app)).area.earlier;
    expect(listed.map((one: { conversationId: number }) => one.conversationId)).toEqual([answered]);
  });

  it('keeps a conversation whose reply came before a failed follow-up, failure included', async () => {
    const { app } = feedbackApp(fakeRunner({ replies: [sonnetReply('A reply.'), FAILED] }));
    const id = await ask(app);
    streamOf(
      await post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId: id,
        expectedTurns: 2,
        message: 'One more question.',
      }),
    );
    await clear(app, id);

    const [only] = (await lessonFeedbackOf(app)).area.earlier;
    expect(only.turns).toHaveLength(4);
    expect(only.turns[3]).toMatchObject({
      role: 'claude',
      outcome: 'failed',
      failure: 'Claude did not finish within 3 minutes.',
    });
  });

  it('never lists the current conversation', async () => {
    const { app } = feedbackApp(fakeRunner());
    const hidden = await ask(app);
    await clear(app, hidden);
    const current = await ask(app);

    const { area } = await lessonFeedbackOf(app);
    expect(area.conversation.conversationId).toBe(current);
    expect(area.earlier.map((one: { conversationId: number }) => one.conversationId)).toEqual([
      hidden,
    ]);
  });

  it('lists only the activity’s own conversations', async () => {
    const { app } = feedbackApp(fakeRunner());
    const other = await ask(app, NONE_URL);
    await clear(app, other, NONE_URL);

    expect((await lessonFeedbackOf(app, 'ACT-FIX-01')).area.earlier).toEqual([]);
    const listed = (await lessonFeedbackOf(app, 'ACT-FIX-NONE')).area.earlier;
    expect(listed.map((one: { conversationId: number }) => one.conversationId)).toEqual([other]);
  });
});

describe('answers that change the list (EC3)', () => {
  it('answers Start over with the list as it is after the hide', async () => {
    const { app, clock } = feedbackApp(fakeRunner());
    const older = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:00:00.000Z',
      '2026-11-19T10:05:00.000Z',
    );
    clock.setNow('2026-11-19T10:06:00.000Z');
    const newer = await ask(app);
    clock.setNow('2026-11-19T10:09:00.000Z');

    const cleared = await clear(app, newer);

    expect(cleared.statusCode).toBe(200);
    const body = cleared.json();
    expect(body.state).toBe('cleared');
    expect(body.earlier.map((one: { conversationId: number }) => one.conversationId)).toEqual([
      newer,
      older,
    ]);
    expect(body.earlier).toEqual((await lessonFeedbackOf(app)).area.earlier);
  });

  it('answers a Try again’s hide with the list unchanged, since that conversation had no reply', async () => {
    const { app, clock } = feedbackApp(fakeRunner({ replies: [sonnetReply('A reply.'), FAILED] }));
    const older = await askThenStartOver(
      app,
      clock,
      '2026-11-19T10:00:00.000Z',
      '2026-11-19T10:05:00.000Z',
    );
    const before = (await lessonFeedbackOf(app)).area.earlier;
    const unanswered = await ask(app);

    const cleared = await clear(app, unanswered);

    expect(cleared.statusCode).toBe(200);
    expect(before.map((one: { conversationId: number }) => one.conversationId)).toEqual([older]);
    expect(cleared.json().earlier).toEqual(before);
  });

  it('carries the list on a 409 for a conversation that is no longer current', async () => {
    const { app } = feedbackApp(fakeRunner());
    const hidden = await ask(app);
    await clear(app, hidden);
    const current = await ask(app);

    const stale = await clear(app, hidden);

    expect(stale.statusCode).toBe(409);
    const body = stale.json();
    expect(body.error).toBe('feedback_conversation_changed');
    expect(body.conversation.conversationId).toBe(current);
    expect(body.earlier.map((one: { conversationId: number }) => one.conversationId)).toEqual([
      hidden,
    ]);
  });
});
