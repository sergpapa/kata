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
 * PF13–PF16 in docs/specs/practice-feedback.md: what the feedback routes refuse, and what they
 * keep when a run goes wrong. The usage pause and the origin check are in
 * feedbackUsageOrigin.test.ts.
 */

afterEach(cleanUpFeedbackApps);

describe('limits on what is sent (PF13)', () => {
  it('accepts only sonnet, opus and haiku', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    for (const model of ['claude-opus-5-5', 'gpt', '', undefined, 'SONNET']) {
      const response = await post(app, startBody({ model }));
      expect(response.statusCode, String(model)).toBe(400);
      expect(response.json().error).toBe('feedback_model_invalid');
    }
    expect(runner.requests).toHaveLength(0);

    for (const model of ['haiku', 'opus']) {
      const response = await post(app, startBody({ model }));
      expect(response.statusCode).toBe(200);
      const conversationId = streamOf(response)[0]?.data.conversationId;
      await post(app, { conversationId }, `${FEEDBACK_URL}/clear`);
    }
    expect(runner.requests.map((request) => request.model)).toEqual(['haiku', 'opus']);
  });

  it('refuses a box over 100,000 characters, and accepts one at exactly that', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);

    const over = await post(app, startBody({ fields: { prediction: 'x'.repeat(100_001) } }));
    expect(over.statusCode).toBe(400);
    expect(over.json().error).toBe('feedback_too_long');

    const at = await post(app, startBody({ fields: { prediction: 'x'.repeat(100_000) } }));
    expect(at.statusCode).toBe(200);
    expect(runner.requests).toHaveLength(1);
  });

  it('refuses an invalid model on a follow-up too', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    const response = await post(app, {
      action: 'follow_up',
      model: 'claude-opus-5-5',
      conversationId,
      expectedTurns: 2,
      message: 'More?',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('feedback_model_invalid');
    expect(runner.requests).toHaveLength(1);
  });

  it('refuses a follow-up message over 100,000 characters', async () => {
    const { app } = feedbackApp(fakeRunner());
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    const response = await post(app, {
      action: 'follow_up',
      model: 'sonnet',
      conversationId,
      expectedTurns: 2,
      message: 'y'.repeat(100_001),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('feedback_too_long');
  });
});

describe('one run at a time, against the current conversation (PF14, PF15)', () => {
  it('refuses a second run and a Start over while a reply is being written', async () => {
    const held = gate();
    const runner = fakeRunner({ holdAt: [held] });
    const { app } = feedbackApp(runner);

    const first = post(app, startBody());
    try {
      await waitFor(() => runner.started() === 1);

      expect((await lessonFeedbackOf(app)).area.replying).toBe(true);
      const second = await post(app, startBody());
      expect(second.statusCode).toBe(409);
      expect(second.json().error).toBe('feedback_in_progress');
      const area = (await lessonFeedbackOf(app)).area;
      const conversationId = area.conversation.conversationId;
      const followUp = await post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId,
        expectedTurns: 1,
        message: 'While it is still writing.',
      });
      expect(followUp.statusCode).toBe(409);
      expect(followUp.json().error).toBe('feedback_in_progress');
      const cleared = await post(app, { conversationId }, `${FEEDBACK_URL}/clear`);
      expect(cleared.statusCode).toBe(409);
      expect(cleared.json().error).toBe('feedback_in_progress');
    } finally {
      // Released whatever happened above, so a failed assertion cannot leave a run hanging.
      held.open();
    }
    expect((await first).statusCode).toBe(200);
    expect((await lessonFeedbackOf(app)).area.replying).toBe(false);
    expect(runner.requests).toHaveLength(1);
  });

  it('shows the learner turn while the reply is still being written', async () => {
    const held = gate();
    const runner = fakeRunner({ holdAt: [held] });
    const { app } = feedbackApp(runner);

    const first = post(app, startBody());
    try {
      await waitFor(() => runner.started() === 1);
      const area = (await lessonFeedbackOf(app)).area;
      expect(area.conversation.turns.map((turn: { role: string }) => turn.role)).toEqual([
        'learner',
      ]);
    } finally {
      held.open();
    }
    await first;
  });

  it('refuses Get feedback while a conversation is current, sending the current one', async () => {
    const { app } = feedbackApp(fakeRunner());
    await post(app, startBody());

    const again = await post(app, startBody());
    expect(again.statusCode).toBe(409);
    expect(again.json().error).toBe('feedback_conversation_changed');
    expect(again.json().conversation.turns).toHaveLength(2);
  });

  it('refuses a follow-up written against an older view of the conversation', async () => {
    const runner = fakeRunner();
    const { app } = feedbackApp(runner);
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;
    const followUp = (over: Record<string, unknown>) =>
      post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId,
        expectedTurns: 2,
        message: 'and?',
        ...over,
      });

    const staleCount = await followUp({ expectedTurns: 1 });
    expect(staleCount.statusCode).toBe(409);
    expect(staleCount.json().error).toBe('feedback_conversation_changed');
    expect(staleCount.json().conversation.turns).toHaveLength(2);

    const otherConversation = await followUp({ conversationId: conversationId + 1 });
    expect(otherConversation.statusCode).toBe(409);

    await post(app, { conversationId }, `${FEEDBACK_URL}/clear`);
    const afterClear = await followUp({});
    expect(afterClear.statusCode).toBe(409);
    expect(afterClear.json().conversation).toBeNull();
    expect(runner.requests).toHaveLength(1);
  });

  it('refuses a Start over that names a conversation that is no longer current', async () => {
    const { app } = feedbackApp(fakeRunner());
    const conversationId = streamOf(await post(app, startBody()))[0]?.data.conversationId;

    const wrong = await post(app, { conversationId: conversationId + 1 }, `${FEEDBACK_URL}/clear`);
    expect(wrong.statusCode).toBe(409);
    expect(wrong.json().error).toBe('feedback_conversation_changed');
    expect((await lessonFeedbackOf(app)).area.conversation).not.toBeNull();
  });

  it('finishes and stores the reply after the page has gone away', async () => {
    const held = gate();
    const runner = fakeRunner({ holdAt: [held], replies: [sonnetReply('Stored anyway.')] });
    const { app } = feedbackApp(runner);
    const address = await app.listen({ host: '127.0.0.1', port: 0 });

    const leaving = new AbortController();
    try {
      // The learner turn is written before Claude is asked, so this read returns while the run
      // is held; a server that buffered its first bytes until the reply would hang here.
      const response = await fetch(`${address}${FEEDBACK_URL}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(startBody()),
        signal: leaving.signal,
      });
      const reader = response.body?.getReader();
      await reader?.read();
      leaving.abort();
      await waitFor(() => runner.started() === 1);
    } finally {
      held.open();
    }
    await waitFor(async () => (await lessonFeedbackOf(app)).area.replying === false);
    const turns = (await lessonFeedbackOf(app)).area.conversation.turns;
    expect(turns.at(-1)).toMatchObject({
      role: 'claude',
      text: 'Stored anyway.',
      outcome: 'complete',
    });
  });
});

describe('a run that fails (PF16)', () => {
  it('keeps the learner turn and stores a failed reply with its reason', async () => {
    const reason = 'Claude did not finish within 3 minutes.';
    const { app } = feedbackApp(
      fakeRunner({
        replies: [
          [
            { type: 'started', model: 'claude-sonnet-5-5', sessionId: 's' },
            { type: 'failed', reason },
          ],
        ],
      }),
    );

    const events = streamOf(await post(app, startBody()));
    expect(events.at(-1)?.event).toBe('reply');
    expect(events.at(-1)?.data.turn).toMatchObject({
      role: 'claude',
      outcome: 'failed',
      failure: reason,
      text: '',
    });

    const turns = (await lessonFeedbackOf(app)).area.conversation.turns;
    expect(turns).toHaveLength(2);
    expect(turns[1]).toMatchObject({
      outcome: 'failed',
      failure: reason,
      model: 'claude-sonnet-5-5',
    });
  });

  it('keeps what Claude had written before the run stopped, as a failed turn', async () => {
    const reason = 'Claude did not finish within 3 minutes.';
    const { app } = feedbackApp(
      fakeRunner({
        replies: [
          [
            { type: 'started', model: 'claude-sonnet-5-5', sessionId: 's' },
            { type: 'text', text: 'You are on the right ' },
            { type: 'text', text: 'track, but' },
            { type: 'failed', reason },
          ],
        ],
      }),
    );

    const events = streamOf(await post(app, startBody()));
    const expected = {
      role: 'claude',
      outcome: 'failed',
      failure: reason,
      text: 'You are on the right track, but',
    };
    expect(events.at(-1)?.data.turn).toMatchObject(expected);
    expect((await lessonFeedbackOf(app)).area.conversation.turns[1]).toMatchObject(expected);
  });

  const brokenRunners = [
    {
      name: 'throws part-way',
      make: () =>
        fakeRunner({
          replies: [
            [
              { type: 'started', model: 'claude-sonnet-5-5', sessionId: 's' },
              { type: 'text', text: 'Half' },
            ],
            sonnetReply('Second time lucky.'),
          ],
          throwAt: [new Error('spawn EPERM')],
        }),
    },
    {
      name: 'ends without a result',
      make: () =>
        fakeRunner({
          replies: [
            [{ type: 'started', model: 'claude-sonnet-5-5', sessionId: 's' }],
            sonnetReply('Second time lucky.'),
          ],
        }),
    },
  ];

  for (const broken of brokenRunners) {
    it(`ends a run whose runner ${broken.name}, and frees the activity for the next one`, async () => {
      const { app } = feedbackApp(broken.make());

      const events = streamOf(await post(app, startBody()));
      expect(events.at(-1)?.event).toBe('reply');
      expect(events.at(-1)?.data.turn).toMatchObject({ role: 'claude', outcome: 'failed' });
      expect(events.at(-1)?.data.turn.failure).toBeTruthy();

      const area = (await lessonFeedbackOf(app)).area;
      expect(area.replying).toBe(false);
      const next = await post(app, {
        action: 'follow_up',
        model: 'sonnet',
        conversationId: area.conversation.conversationId,
        expectedTurns: 2,
        message: 'Again?',
      });
      expect(next.statusCode).toBe(200);
    });
  }

  it('records no model when the run failed before naming one', async () => {
    const { app } = feedbackApp(fakeRunner({ replies: [[{ type: 'failed', reason: 'stopped' }]] }));

    const events = streamOf(await post(app, startBody()));
    expect(events.at(-1)?.data.turn).toMatchObject({ outcome: 'failed', model: null });
  });

  it('says Claude Code is missing on the lesson answer, and runs nothing when asked', async () => {
    const reason =
      'Claude Code was not found on this computer. Install it, or set KATA_CLAUDE_PATH to its claude.exe.';
    const runner = fakeRunner({ unavailableReason: reason });
    const { app } = feedbackApp(runner);

    expect((await lessonFeedbackOf(app)).availability).toEqual({ state: 'unavailable', reason });
    const response = await post(app, startBody());
    expect(response.statusCode).toBe(409);
    expect(response.json().error).toBe('feedback_unavailable');
    expect(runner.requests).toHaveLength(0);
  });
});

/** Polls a condition the app reaches on its own; fails loudly instead of hanging the suite. */
async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 3_000,
): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (!(await condition())) {
    if (Date.now() > until) throw new Error('The condition was not reached in time.');
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
