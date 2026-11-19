import { afterEach, describe, expect, it } from 'vitest';
import { fakeRunner, gate, sonnetReply } from './modules/feedback/testkit/fakeRunner.js';
import {
  FEEDBACK_URL,
  cleanUpFeedbackApps,
  feedbackApp,
  lessonFeedbackOf,
  post,
  startBody,
  streamOf,
} from './modules/feedback/testkit/feedbackApp.js';

/**
 * Recovery from the failures the code review of 2026-11-19 found (docs/specs/practice-feedback.md
 * PF15, PF16, PF20).
 *
 * Each is a way the page could be left waiting forever or a lesson could stop loading: a store
 * write that fails after the stream has begun, a server stopped mid-reply, and a usage report the
 * guard cannot read.
 */

afterEach(cleanUpFeedbackApps);

describe('a failure after the stream has begun', () => {
  it('ends the stream with an error event, and frees the activity', async () => {
    const { app, db } = feedbackApp(fakeRunner({ replies: [sonnetReply('Never stored.')] }));
    // The store refuses Claude's turn, as a full disk or a locked file would.
    db.exec(`CREATE TRIGGER refuse_claude_turn BEFORE INSERT ON feedback_turn
             WHEN NEW.role = 'claude' BEGIN SELECT RAISE(ABORT, 'database or disk is full'); END;`);

    const events = streamOf(await post(app, startBody()));

    expect(events[0]?.event).toBe('learner');
    const last = events.at(-1);
    expect(last?.event).toBe('error');
    expect(last?.data.message).toMatch(/could not be stored/i);
    expect((await lessonFeedbackOf(app)).area.replying).toBe(false);
  });
});

describe('a server stopped mid-reply', () => {
  it('closes the unanswered turn at the next start, so the page can offer Try again', async () => {
    const held = gate();
    const runner = fakeRunner({ holdAt: [held] });
    const { app, db, dir } = feedbackApp(runner);
    const running = post(app, startBody());
    try {
      while (runner.started() === 0) await new Promise((resolve) => setTimeout(resolve, 10));

      // A new app on the same store is what a restart is.
      const restarted = feedbackApp(fakeRunner(), { db, dir });
      const area = (await lessonFeedbackOf(restarted.app)).area;

      expect(area.replying).toBe(false);
      expect(area.conversation.turns).toHaveLength(2);
      expect(area.conversation.turns[1]).toMatchObject({
        role: 'claude',
        outcome: 'failed',
        text: '',
        model: null,
        failure: 'The app was stopped before Claude replied. Try again, or start over.',
      });
    } finally {
      held.open();
      await running;
    }
  });

  it('leaves a finished conversation alone at the next start', async () => {
    const { app, db, dir } = feedbackApp(fakeRunner());
    await post(app, startBody());
    const before = (await lessonFeedbackOf(app)).area.conversation;

    const restarted = feedbackApp(fakeRunner(), { db, dir });
    expect((await lessonFeedbackOf(restarted.app)).area.conversation).toEqual(before);
  });
});

describe('a usage report the guard cannot read', () => {
  it('still serves the lesson, and does not pause', async () => {
    const { app, db } = feedbackApp(fakeRunner());
    for (const info of [
      '{"unifiedWindows":{"seven_day_opus":null,"five_hour":"high"}}',
      '{"unifiedWindows":"none"}',
      'not json at all',
    ]) {
      db.prepare(
        `INSERT INTO feedback_usage (id, info_json, observed_at) VALUES (1, ?, '2026-11-19T09:00:00.000Z')
         ON CONFLICT (id) DO UPDATE SET info_json = excluded.info_json`,
      ).run(info);

      const lesson = await app.inject({
        method: 'GET',
        url: '/api/courses/FIX/lessons/FIX-LS-01',
      });
      expect(lesson.statusCode, info).toBe(200);
      expect(lesson.json().feedback.availability, info).toEqual({ state: 'ready' });
    }
    expect(streamOf(await post(app, startBody())).at(-1)?.event).toBe('reply');
  });

  it('replaces an unreadable report with the next one Claude Code sends', async () => {
    const { app, db } = feedbackApp(
      fakeRunner({
        replies: [
          [
            ...sonnetReply('One.').slice(0, 2),
            {
              type: 'usage',
              info: {
                status: 'allowed',
                unifiedWindows: {
                  five_hour: {
                    utilization: 0.95,
                    resetsAt: Date.parse('2026-11-19T12:00:00.000Z') / 1000,
                    status: 'allowed',
                  },
                },
              },
            },
            { type: 'done', text: 'One.' },
          ],
        ],
      }),
    );
    db.prepare(
      "INSERT INTO feedback_usage (id, info_json, observed_at) VALUES (1, 'not json', '2026-11-19T09:00:00.000Z')",
    ).run();

    await post(app, startBody());
    expect((await lessonFeedbackOf(app)).availability.state).toBe('paused');
    const read = await app.inject({
      method: 'GET',
      url: FEEDBACK_URL,
      headers: { host: '127.0.0.1:8317' },
    });
    expect(read.json().availability.state).toBe('paused');
  });
});
