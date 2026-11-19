import { afterEach, describe, expect, it } from 'vitest';
import { FEEDBACK_SYSTEM_PROMPT } from './modules/feedback/prompt.js';
import { fakeRunner, sonnetReply } from './modules/feedback/testkit/fakeRunner.js';
import {
  FEEDBACK_URL,
  WORKED_ANSWER,
  cleanUpFeedbackApps,
  feedbackApp,
  lessonFeedbackOf,
  post,
  someBoxes,
  startBody,
  streamOf,
} from './modules/feedback/testkit/feedbackApp.js';

/**
 * PF1–PF3 and PF5–PF9 in docs/specs/practice-feedback.md: asking, continuing, starting over, and
 * what is kept. Guards, failures and concurrency are in feedbackGuards.test.ts.
 *
 * Claude is the fake runner throughout. What these tests own is everything around it: that the
 * boxes as typed reach Claude in the right order, that a follow-up resumes the right session,
 * that Start over never destroys anything, and that what the page reloads is what was stored.
 */

afterEach(cleanUpFeedbackApps);

describe('asking for feedback (PF1, PF2, PF5)', () => {
  it('streams the learner turn, the reply as it is written, then the stored reply', async () => {
    const runner = fakeRunner({
      replies: [sonnetReply('Good start. What would you check first?')],
    });
    const { app } = feedbackApp(runner);

    const response = await post(app, startBody());

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/event-stream/);
    const events = streamOf(response);
    expect(events.map((one) => one.event)).toEqual(['learner', 'delta', 'delta', 'reply']);

    const learner = events[0]?.data;
    expect(learner.turn).toMatchObject({ turn: 1, role: 'learner' });
    expect(typeof learner.conversationId).toBe('number');

    expect(
      events
        .filter((one) => one.event === 'delta')
        .map((one) => one.data.text)
        .join(''),
    ).toBe('Good start. What would you check first?');

    const reply = events[3]?.data;
    expect(reply.conversationId).toBe(learner.conversationId);
    expect(reply.turn).toMatchObject({
      turn: 2,
      role: 'claude',
      text: 'Good start. What would you check first?',
      model: 'claude-sonnet-5-5',
      outcome: 'complete',
    });
  });

  it('keeps every declared box as sent, in declared order, the missing ones as empty', async () => {
    const { app } = feedbackApp(fakeRunner());

    const events = streamOf(await post(app, startBody()));

    expect(events[0]?.data.turn.sentFields).toEqual([
      { fieldName: 'prediction', text: someBoxes.prediction },
      { fieldName: 'observation', text: '' },
      { fieldName: 'explanation', text: '' },
      { fieldName: 'help_used', text: '' },
    ]);
  });

  it('sends Claude the coaching rules, the worked answer and the boxes, on a new session', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    await post(app, startBody());

    expect(runner.requests).toHaveLength(1);
    const request = runner.requests[0];
    expect(request).toMatchObject({
      resume: false,
      model: 'sonnet',
      sessionId: '00000000-0000-4000-8000-000000000001',
      systemPrompt: FEEDBACK_SYSTEM_PROMPT,
    });
    expect(request?.prompt).toContain('Practice A: explain one click');
    expect(request?.prompt).toContain('Explain what the click requests.');
    expect(request?.prompt).toContain(WORKED_ANSWER);
    expect(request?.prompt).toContain(someBoxes.prediction);
    expect(request?.prompt).not.toContain('Review prose that is not an answer.');
  });

  it('refuses a request whose boxes are all empty or blank, and runs nothing', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    const response = await post(
      app,
      startBody({ fields: { prediction: '  \n ', observation: '' } }),
    );

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('feedback_empty');
    expect(runner.requests).toHaveLength(0);
    expect((await lessonFeedbackOf(app)).area.conversation).toBeNull();
  });

  it('refuses a box the activity does not declare', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    const response = await post(app, startBody({ fields: { prediction: 'x', secret_field: 'y' } }));

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('feedback_invalid');
    expect(runner.requests).toHaveLength(0);
  });

  it('answers 404 for an activity this course does not have', async () => {
    const { app } = feedbackApp(fakeRunner());

    const response = await post(app, startBody(), '/api/courses/FIX/activities/ACT-NOPE/feedback');

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toBe('activity_not_found');
  });
});

describe('an activity without a worked answer (PF3)', () => {
  it('says so on the lesson answer and tells Claude there is none', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    expect((await lessonFeedbackOf(app, 'ACT-FIX-01')).area.hasWorkedAnswer).toBe(true);
    expect((await lessonFeedbackOf(app, 'ACT-FIX-NONE')).area.hasWorkedAnswer).toBe(false);

    await post(app, startBody(), '/api/courses/FIX/activities/ACT-FIX-NONE/feedback');
    expect(runner.requests[0]?.prompt).toMatch(/no (authored|worked) answer/i);
    expect(runner.requests[0]?.prompt).not.toContain(WORKED_ANSWER);
  });
});

describe('continuing the conversation (PF6)', () => {
  it('resumes the same session with the message as typed and the model now chosen', async () => {
    const runner = fakeRunner({ replies: [sonnetReply('First.'), sonnetReply('Second.')] });
    const { app } = feedbackApp(runner);
    const first = streamOf(await post(app, startBody()));
    const conversationId = first[0]?.data.conversationId;

    const response = await post(app, {
      action: 'follow_up',
      model: 'opus',
      conversationId,
      expectedTurns: 2,
      message: 'Can you show me the author’s answer?',
    });

    expect(response.statusCode).toBe(200);
    const events = streamOf(response);
    expect(events[0]?.data.turn).toMatchObject({
      turn: 3,
      role: 'learner',
      text: 'Can you show me the author’s answer?',
    });
    expect(events.at(-1)?.data.turn).toMatchObject({ turn: 4, role: 'claude', text: 'Second.' });
    expect(runner.requests[1]).toMatchObject({
      resume: true,
      model: 'opus',
      sessionId: runner.requests[0]?.sessionId,
      prompt: 'Can you show me the author’s answer?',
    });
  });

  it('refuses an empty follow-up', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);
    const first = streamOf(await post(app, startBody()));

    const response = await post(app, {
      action: 'follow_up',
      model: 'sonnet',
      conversationId: first[0]?.data.conversationId,
      expectedTurns: 2,
      message: '   ',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('feedback_empty');
    expect(runner.requests).toHaveLength(1);
  });
});

describe('what the lesson answer carries (PF8, PF9)', () => {
  it('carries each activity of the lesson, ready, with no conversation before any is asked', async () => {
    const { app } = feedbackApp(fakeRunner());

    const { availability, all } = await lessonFeedbackOf(app);

    expect(availability).toEqual({ state: 'ready' });
    expect(all.map((one: { activityId: string }) => one.activityId)).toEqual([
      'ACT-FIX-01',
      'ACT-FIX-NONE',
    ]);
    expect(all[0]).toMatchObject({ conversation: null, replying: false });
  });

  it('carries the conversation as stored, and still does after a restart', async () => {
    const { app, db, dir } = feedbackApp(
      fakeRunner({ replies: [sonnetReply('Look at the request list.')] }),
    );
    await post(app, startBody());

    const before = (await lessonFeedbackOf(app)).area;
    expect(before.conversation.turns.map((turn: { role: string }) => turn.role)).toEqual([
      'learner',
      'claude',
    ]);
    expect(before.conversation.turns[0].sentFields[0]).toEqual({
      fieldName: 'prediction',
      text: someBoxes.prediction,
    });
    expect(before.conversation.turns[1]).toMatchObject({
      text: 'Look at the request list.',
      model: 'claude-sonnet-5-5',
      outcome: 'complete',
      writtenAt: '2026-11-19T10:00:00.000Z',
    });

    const restarted = feedbackApp(fakeRunner(), { db, dir });
    expect((await lessonFeedbackOf(restarted.app)).area.conversation).toEqual(before.conversation);
  });

  it('answers the same area on its own route', async () => {
    const { app } = feedbackApp(fakeRunner());
    await post(app, startBody());

    const own = await app.inject({
      method: 'GET',
      url: FEEDBACK_URL,
      headers: { host: '127.0.0.1:8317' },
    });
    const fromLesson = await lessonFeedbackOf(app);

    expect(own.statusCode).toBe(200);
    expect(own.json()).toEqual({ availability: fromLesson.availability, ...fromLesson.area });
  });

  it('stamps every turn with the lesson, version and release it answered', async () => {
    const { app, db } = feedbackApp(fakeRunner());
    await post(app, startBody());

    const rows = db
      .prepare(
        'SELECT role, candidate_lesson_id, content_version, release_id, written_at FROM feedback_turn ORDER BY turn_number',
      )
      .all();
    expect(rows).toEqual([
      expect.objectContaining({
        role: 'learner',
        candidate_lesson_id: 'FIX-LS-01',
        content_version: '1.0.0-draft',
        release_id: 'FIX-RELEASE',
        written_at: '2026-11-19T10:00:00.000Z',
      }),
      expect.objectContaining({ role: 'claude', candidate_lesson_id: 'FIX-LS-01' }),
    ]);
  });

  it('leaves the resume point alone (PF11)', async () => {
    const { app } = feedbackApp(fakeRunner());
    expect(streamOf(await post(app, startBody())).at(-1)?.event).toBe('reply');

    const resume = await app.inject({ method: 'GET', url: '/api/courses/FIX/resume-point' });
    expect(resume.json()).toEqual({ state: 'none' });
  });
});

describe('starting over (PF7)', () => {
  it('hides the conversation, and the next one starts on a new session', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);
    const first = streamOf(await post(app, startBody()));

    const cleared = await post(
      app,
      { conversationId: first[0]?.data.conversationId },
      `${FEEDBACK_URL}/clear`,
    );
    expect(cleared.statusCode).toBe(200);
    expect((await lessonFeedbackOf(app)).area.conversation).toBeNull();

    const second = streamOf(await post(app, startBody()));
    expect(second[0]?.data.conversationId).not.toBe(first[0]?.data.conversationId);
    expect(second[0]?.data.turn.turn).toBe(1);
    expect(runner.requests[1]?.sessionId).not.toBe(runner.requests[0]?.sessionId);
    expect(runner.requests[1]?.resume).toBe(false);
  });

  it('keeps every turn of the hidden conversation in the store', async () => {
    const { app, db } = feedbackApp(fakeRunner());
    const first = streamOf(await post(app, startBody()));
    await post(app, { conversationId: first[0]?.data.conversationId }, `${FEEDBACK_URL}/clear`);

    const kept = db.prepare('SELECT COUNT(*) AS n FROM feedback_turn').get() as { n: number };
    expect(kept.n).toBe(2);
  });

  it('lets the store refuse any edit or deletion of a turn, and a second clearing', async () => {
    const { app, db } = feedbackApp(fakeRunner());
    const first = streamOf(await post(app, startBody()));
    const conversationId = first[0]?.data.conversationId;
    await post(app, { conversationId }, `${FEEDBACK_URL}/clear`);

    expect(() => db.prepare("UPDATE feedback_turn SET text = 'rewritten'").run()).toThrow();
    expect(() => db.prepare('DELETE FROM feedback_turn').run()).toThrow();
    expect(() => db.prepare('DELETE FROM feedback_conversation').run()).toThrow();
    expect(() =>
      db
        .prepare(
          "UPDATE feedback_conversation SET cleared_at = '2030-01-01T00:00:00.000Z' WHERE id = ?",
        )
        .run(conversationId),
    ).toThrow();
    expect(() =>
      db
        .prepare("UPDATE feedback_conversation SET claude_session_id = 'other' WHERE id = ?")
        .run(conversationId),
    ).toThrow();
  });
});
