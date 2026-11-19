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
 * PF20 and PF21 in docs/specs/practice-feedback.md: the two guards that are about money rather than
 * correctness. The usage pause is the only thing between a busy week and replies billed to the org,
 * and the origin check is the only thing stopping any web page the learner visits from spending
 * their plan through this loopback server. Moved here from feedbackGuards.test.ts unchanged when
 * that file passed 350 lines.
 */

afterEach(cleanUpFeedbackApps);

const usage = (utilization: number, resetsAtIso: string): RunEvent => ({
  type: 'usage',
  info: {
    status: 'allowed',
    isUsingOverage: false,
    unifiedWindows: {
      five_hour: {
        utilization,
        resetsAt: new Date(resetsAtIso).getTime() / 1000,
        status: 'allowed',
      },
    },
  },
});

describe('the usage pause (PF20)', () => {
  it('holds the next turn back after a reply showed 90% use, until the window resets', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          usage(0.93, '2026-11-19T11:00:00.000Z'),
          { type: 'done', text: 'One.' },
        ],
        sonnetReply('Two.'),
      ],
    });
    const { app, clock } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;
    const followUp = () =>
      post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId,
        expectedTurns: 2,
        message: 'More?',
      });

    const refused = await followUp();
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({
      error: 'feedback_usage_paused',
      resumesAt: '2026-11-19T11:00:00.000Z',
    });
    expect((await lessonFeedbackOf(app)).availability).toMatchObject({
      state: 'paused',
      resumesAt: '2026-11-19T11:00:00.000Z',
    });
    expect(runner.requests).toHaveLength(1);

    clock.setNow('2026-11-19T11:00:01.000Z');
    expect((await followUp()).statusCode).toBe(200);
    expect(runner.requests).toHaveLength(2);
  });

  it('holds back Get feedback and Try again too, on every activity, but allows Start over', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          usage(0.93, '2026-11-19T11:00:00.000Z'),
          { type: 'done', text: 'One.' },
        ],
      ],
    });
    const { app } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    const cleared = await post(app, { conversationId }, `${FEEDBACK_URL}/clear`);
    expect(cleared.statusCode).toBe(200);

    const again = await post(app, startBody());
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe('feedback_usage_paused');
    const elsewhere = await post(
      app,
      startBody(),
      '/api/courses/FIX/activities/ACT-FIX-NONE/feedback',
    );
    expect(elsewhere.statusCode).toBe(409);
    expect(elsewhere.json().error).toBe('feedback_usage_paused');
    expect(runner.requests).toHaveLength(1);
  });

  it('stores the report of a run stopped for extra usage, so the next turn waits', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          {
            type: 'usage',
            info: {
              status: 'allowed',
              isUsingOverage: true,
              resetsAt: Date.parse('2026-11-19T12:00:00.000Z') / 1000,
            },
          },
          {
            type: 'failed',
            reason: 'Claude Code started using paid extra usage, so the app stopped it.',
          },
        ],
      ],
    });
    const { app } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    expect((await lessonFeedbackOf(app)).availability.state).toBe('paused');
    const next = await post(app, {
      action: 'follow_up',
      model: 'sonnet',
      conversationId,
      expectedTurns: 2,
      message: 'More?',
    });
    expect(next.statusCode).toBe(409);
    expect(next.json().error).toBe('feedback_usage_paused');
    expect(runner.requests).toHaveLength(1);
  });

  it('pauses when Claude Code reports a status other than allowed', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          {
            type: 'usage',
            info: { status: 'rejected', resetsAt: Date.parse('2026-11-19T12:00:00.000Z') / 1000 },
          },
          { type: 'done', text: 'One.' },
        ],
      ],
    });
    const { app } = feedbackApp(runner);
    await post(app, startBody());

    expect((await lessonFeedbackOf(app)).availability).toMatchObject({
      state: 'paused',
      resumesAt: '2026-11-19T12:00:00.000Z',
    });
  });

  it('is still in force after a restart', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          usage(0.99, '2026-11-19T15:00:00.000Z'),
          { type: 'done', text: 'One.' },
        ],
      ],
    });
    const { app, db, dir } = feedbackApp(runner);
    await post(app, startBody());

    const restarted = feedbackApp(fakeRunner(), { db, dir });
    expect((await lessonFeedbackOf(restarted.app)).availability.state).toBe('paused');
  });

  it('is judged on the newest report, so a later low reading lifts an earlier high one', async () => {
    const runner = fakeRunner({
      replies: [
        [
          ...sonnetReply('One.').slice(0, 2),
          usage(0.95, '2026-11-19T11:00:00.000Z'),
          { type: 'done', text: 'One.' },
        ],
        [
          ...sonnetReply('Two.').slice(0, 2),
          usage(0.1, '2026-11-19T16:00:00.000Z'),
          { type: 'done', text: 'Two.' },
        ],
      ],
    });
    const { app, db, dir, clock } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;
    expect((await lessonFeedbackOf(app)).availability.state).toBe('paused');

    clock.setNow('2026-11-19T11:00:01.000Z');
    const second = await post(app, {
      action: 'follow_up',
      model: 'sonnet',
      conversationId,
      expectedTurns: 2,
      message: 'More?',
    });
    expect(second.statusCode).toBe(200);

    // Back before the first report's reset: only the newest report counts, and it was low.
    clock.setNow('2026-11-19T10:30:00.000Z');
    expect((await lessonFeedbackOf(app)).availability).toEqual({ state: 'ready' });
    const restarted = feedbackApp(fakeRunner(), { db, dir });
    restarted.clock.setNow('2026-11-19T10:30:00.000Z');
    expect((await lessonFeedbackOf(restarted.app)).availability).toEqual({ state: 'ready' });
  });
});

describe('who may ask (PF21)', () => {
  it('refuses a request whose Host is not this computer', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    for (const host of [
      'attacker.example:8317',
      'localhost.attacker.example',
      '127.0.0.1.evil.test:80',
      'evil.localhost.example:8317',
      'attacker.example:8317@localhost',
    ]) {
      const response = await post(app, startBody(), FEEDBACK_URL, { host });
      expect(response.statusCode, host).toBe(403);
      expect(response.json().error).toBe('feedback_origin_refused');
    }
    const read = await app.inject({
      method: 'GET',
      url: FEEDBACK_URL,
      headers: { host: 'attacker.example' },
    });
    expect(read.statusCode).toBe(403);
    expect(runner.requests).toHaveLength(0);
  });

  it('refuses a request sent from another site’s page', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    for (const origin of [
      'https://attacker.example',
      'http://localhost.attacker.example',
      'http://127.0.0.1.attacker.example',
      'http://localhost@attacker.example',
      'https://localhost:8317',
      'null',
    ]) {
      const response = await post(app, startBody(), FEEDBACK_URL, { origin });
      expect(response.statusCode, origin).toBe(403);
    }
    const read = await app.inject({
      method: 'GET',
      url: FEEDBACK_URL,
      headers: { host: '127.0.0.1:8317', origin: 'https://attacker.example' },
    });
    expect(read.statusCode).toBe(403);
    expect(runner.requests).toHaveLength(0);
  });

  it('guards Start over the same way', async () => {
    const { app } = feedbackApp(fakeRunner());
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    const fromHost = await post(app, { conversationId }, `${FEEDBACK_URL}/clear`, {
      host: 'attacker.example',
    });
    const fromPage = await post(app, { conversationId }, `${FEEDBACK_URL}/clear`, {
      origin: 'https://attacker.example',
    });
    expect([fromHost.statusCode, fromPage.statusCode]).toEqual([403, 403]);
    expect((await lessonFeedbackOf(app)).area.conversation).not.toBeNull();
  });

  it('accepts a bare loopback Host with no port', async () => {
    const { app } = feedbackApp(fakeRunner());

    const response = await post(app, startBody(), FEEDBACK_URL, { host: 'localhost' });
    expect(response.statusCode).toBe(200);
  });

  it('accepts the app’s own pages on any loopback name and port', async () => {
    const { app } = feedbackApp(fakeRunner());

    const fromDev = await post(app, startBody(), FEEDBACK_URL, {
      origin: 'http://localhost:5317',
      host: 'localhost:8317',
    });
    expect(fromDev.statusCode).toBe(200);
    const conversationId = streamOf(fromDev)[0]?.data.conversationId;
    const fromSix = await post(app, { conversationId }, `${FEEDBACK_URL}/clear`, {
      host: '[::1]:8317',
      origin: 'http://[::1]:8317',
    });
    expect(fromSix.statusCode).toBe(200);
  });

  it('refuses a body that is not JSON, on both routes', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    // The content types a page on another site can send without asking first, and none at all.
    for (const type of [
      'text/plain',
      'application/x-www-form-urlencoded',
      'multipart/form-data; boundary=x',
      undefined,
    ]) {
      for (const url of [FEEDBACK_URL, `${FEEDBACK_URL}/clear`]) {
        const response = await app.inject({
          method: 'POST',
          url,
          headers: { host: '127.0.0.1:8317', ...(type ? { 'content-type': type } : {}) },
          payload: JSON.stringify(startBody()),
        });
        expect(response.statusCode, `${url} ${type}`).toBe(415);
        expect(response.json().error).toBe('feedback_not_json');
      }
    }
    expect(runner.requests).toHaveLength(0);
  });

  it('accepts JSON that names its charset', async () => {
    const { app } = feedbackApp(fakeRunner());

    const response = await post(app, startBody(), FEEDBACK_URL, {
      'content-type': 'application/json; charset=utf-8',
    });
    expect(response.statusCode).toBe(200);
  });
});
