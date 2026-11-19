import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonPage } from '../LessonPage.js';
import {
  claudeTurn,
  conversation,
  FEEDBACK_URL,
  json,
  learnerTurn,
  sent,
  serve,
  testStream,
  type Seen,
} from '../testkit/feedbackFixture.js';

/**
 * PF1, PF5–PF8, PF10, PF12 and PF17 in docs/specs/practice-feedback.md, on the lesson page.
 *
 * The bugs worth catching here are the ones the owner would meet at the desk: feedback sent on the
 * saved text when they had typed something newer, a reply that only appears once it is finished, a
 * follow-up that starts a new conversation instead of continuing, a Start over that leaves the old
 * reply on screen, and Try again resending today's boxes instead of what the failed turn was about.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
  try {
    window.localStorage.clear();
  } catch {
    // Some tests replace storage with one that throws; nothing to clear then.
  }
});

async function openLesson() {
  render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);
  return screen.findByRole('region', { name: /feedback from claude/i });
}

const posts = (seen: Seen[]) =>
  seen.filter((one) => one.method === 'POST' && one.url.startsWith(FEEDBACK_URL));

describe('asking (PF1)', () => {
  it('keeps Get feedback disabled until a box has text that is not just spaces', async () => {
    serve({});
    const feedback = await openLesson();
    const ask = within(feedback).getByRole('button', { name: /get feedback/i });

    expect(ask).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: '   ' } });
    expect(ask).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText(/your explanation/i), {
      target: { value: 'Because GET.' },
    });
    expect(ask).toHaveProperty('disabled', false);
  });

  it('sends every box as typed, unsaved text included, with the chosen model', async () => {
    const stream = testStream();
    const seen = serve({ posts: [stream.response] });
    const feedback = await openLesson();

    fireEvent.change(screen.getByLabelText(/your prediction/i), {
      target: { value: 'Typed, never saved.' },
    });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    await waitFor(() => expect(posts(seen)).toHaveLength(1));
    expect(posts(seen)[0]?.body).toEqual({
      action: 'start',
      model: 'sonnet',
      fields: {
        prediction: 'Typed, never saved.',
        observation: '',
        explanation: '',
        help_used: '',
      },
    });
    // The box keeps its text and is still unsaved: asking is not saving.
    expect((screen.getByLabelText(/your prediction/i) as HTMLTextAreaElement).value).toBe(
      'Typed, never saved.',
    );
    // No box was saved. (Opening the lesson PUTs its resume point, which is not a box.)
    expect(seen.some((one) => one.method === 'PUT' && one.url.includes('/responses/'))).toBe(false);
    stream.end();
  });
});

describe('the reply (PF5, PF10, PF12)', () => {
  it('shows the reply as it is written, then labels the finished reply as AI feedback', async () => {
    const stream = testStream();
    serve({ posts: [stream.response] });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), {
      target: { value: 'It asks for the menu.' },
    });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    stream.send('learner', { conversationId: 7, turn: learnerTurn(1) });
    stream.send('delta', { text: 'Good start. ' });
    expect(await within(feedback).findByText(/good start\./i)).toBeTruthy();
    expect(within(feedback).queryByText(/would you check/i)).toBeNull();

    // No second press while this one is running.
    expect(within(feedback).getByRole('button', { name: /get feedback/i })).toHaveProperty(
      'disabled',
      true,
    );

    stream.send('delta', { text: '**What** would you check first?' });
    stream.send('reply', { conversationId: 7, turn: claudeTurn(2) });
    stream.end();

    expect(await within(feedback).findByText(/ai feedback · claude-sonnet-5-5/i)).toBeTruthy();
    // The finished reply replaces the streamed text rather than appearing under it.
    expect(feedback.textContent?.split('Good start.').length).toBe(2);
    // Rendered as Markdown, not shown as asterisks.
    const strong = feedback.querySelector('strong');
    expect(strong?.textContent).toBe('What');
    expect(
      within(feedback).getByText(
        /claude can be wrong\. this is feedback on your reasoning, not a grade\./i,
      ),
    ).toBeTruthy();
  });

  it('renders no raw HTML from a reply', async () => {
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([
          learnerTurn(1),
          claudeTurn(2, {
            text: 'Look <img src="x" onerror="alert(1)"> here <script>alert(2)</script>',
          }),
        ]),
      }),
    });
    const feedback = await openLesson();

    await within(feedback).findByText(/ai feedback/i);
    expect(feedback.querySelector('img')).toBeNull();
    expect(feedback.querySelector('script')).toBeNull();
  });

  it('keeps a script link and code from a reply inert', async () => {
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([
          learnerTurn(1),
          claudeTurn(2, {
            text: '[click me](javascript:alert(1))\n\n```html\n<button onclick="alert(2)">Run</button>\n```',
          }),
        ]),
      }),
    });
    const feedback = await openLesson();
    await within(feedback).findByText(/ai feedback/i);

    for (const link of feedback.querySelectorAll('a')) {
      expect(link.getAttribute('href') ?? '').not.toMatch(/^\s*javascript:/i);
    }
    // The fenced HTML is shown as text, not built into a button.
    expect(within(feedback).queryByRole('button', { name: 'Run' })).toBeNull();
    expect(feedback.textContent).toContain('<button onclick="alert(2)">Run</button>');
  });

  it('never calls the learner’s work graded, scored, marked, passed or failed', async () => {
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([
          learnerTurn(1),
          claudeTurn(2, {
            text: '',
            outcome: 'failed',
            failure: 'Claude did not finish within 3 minutes.',
          }),
        ]),
      }),
    });
    const feedback = await openLesson();
    await within(feedback).findByText(/did not finish within 3 minutes/i);

    const words = (feedback.textContent ?? '')
      .replace('Claude can be wrong. This is feedback on your reasoning, not a grade.', '')
      .replace('Claude did not finish within 3 minutes.', '');
    expect(words).not.toMatch(/\b(grade|graded|score|scored|mark|marked|passed|failed)\b/i);
  });
});

describe('a conversation already stored (PF8)', () => {
  it('is on the page at load, with what was sent kept under the first turn', async () => {
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([learnerTurn(1), claudeTurn(2)]),
      }),
    });
    const feedback = await openLesson();

    expect(await within(feedback).findByText(/ai feedback · claude-sonnet-5-5/i)).toBeTruthy();
    const sentBox = within(feedback)
      .getByText(/what you sent/i)
      .closest('details');
    expect(sentBox).not.toBeNull();
    expect(sentBox?.hasAttribute('open')).toBe(false);
    for (const field of sent) expect(sentBox?.textContent).toContain(field.text);
    for (const label of [
      'Your prediction',
      'What you observed',
      'Your explanation',
      'Whether you used help',
    ]) {
      expect(sentBox?.textContent).toContain(label);
    }
    expect(within(feedback).queryByRole('button', { name: /get feedback/i })).toBeNull();
  });
});

describe('continuing (PF6)', () => {
  it('sends a follow-up against the conversation it shows, and adds the exchange', async () => {
    const stream = testStream();
    const seen = serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([learnerTurn(1), claudeTurn(2)]),
      }),
      posts: [stream.response],
    });
    const feedback = await openLesson();
    const message = await within(feedback).findByLabelText(/message to claude/i);
    const send = within(feedback).getByRole('button', { name: /^send$/i });

    expect(send).toHaveProperty('disabled', true);
    fireEvent.change(within(feedback).getByLabelText(/model/i), { target: { value: 'haiku' } });
    fireEvent.change(message, { target: { value: 'Can you show me the author’s answer?' } });
    fireEvent.click(send);

    await waitFor(() => expect(posts(seen)).toHaveLength(1));
    expect(send).toHaveProperty('disabled', true);
    expect(posts(seen)[0]?.body).toEqual({
      action: 'follow_up',
      model: 'haiku',
      conversationId: 7,
      expectedTurns: 2,
      message: 'Can you show me the author’s answer?',
    });

    stream.send('learner', {
      conversationId: 7,
      turn: learnerTurn(3, { text: 'Can you show me the author’s answer?' }),
    });
    stream.send('reply', { conversationId: 7, turn: claudeTurn(4, { text: 'Here it is.' }) });
    stream.end();
    expect(await within(feedback).findByText('Here it is.')).toBeTruthy();
    expect(within(feedback).getByText('Can you show me the author’s answer?')).toBeTruthy();
    expect((message as HTMLTextAreaElement).value).toBe('');
  });

  it('redraws from the server’s conversation when the one on the page was out of date', async () => {
    const current = conversation([
      learnerTurn(1),
      claudeTurn(2),
      learnerTurn(3, { text: 'From the other tab.' }),
      claudeTurn(4, { text: 'Answered there.' }),
    ]);
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([learnerTurn(1), claudeTurn(2)]),
      }),
      posts: [
        json(
          { error: 'feedback_conversation_changed', message: 'Changed.', conversation: current },
          409,
        ),
      ],
    });
    const feedback = await openLesson();
    fireEvent.change(await within(feedback).findByLabelText(/message to claude/i), {
      target: { value: 'Mine.' },
    });
    fireEvent.click(within(feedback).getByRole('button', { name: /^send$/i }));

    expect(await within(feedback).findByText('Answered there.')).toBeTruthy();
    // The unsent message is kept, so nothing typed is lost to the refusal.
    expect(
      (within(feedback).getByLabelText(/message to claude/i) as HTMLTextAreaElement).value,
    ).toBe('Mine.');
  });
});

describe('starting over (PF7) and trying again (PF17)', () => {
  it('clears the area for a new conversation', async () => {
    const seen = serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([learnerTurn(1), claudeTurn(2)]),
      }),
      posts: [json({ state: 'cleared' })],
    });
    const feedback = await openLesson();
    fireEvent.click(await within(feedback).findByRole('button', { name: /start over/i }));

    await waitFor(() => expect(within(feedback).queryByText(/ai feedback ·/i)).toBeNull());
    expect(posts(seen)[0]).toMatchObject({
      url: `${FEEDBACK_URL}/clear`,
      body: { conversationId: 7 },
    });
    expect(within(feedback).getByRole('button', { name: /get feedback/i })).toBeTruthy();
  });

  it('resends what the failed first turn sent, not what the boxes say now', async () => {
    const stream = testStream();
    const seen = serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([
          learnerTurn(1),
          claudeTurn(2, {
            text: '',
            outcome: 'failed',
            failure: 'Claude did not finish within 3 minutes.',
          }),
        ]),
      }),
      posts: [json({ state: 'cleared' }), stream.response],
    });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), {
      target: { value: 'Something newer.' },
    });
    fireEvent.click(await within(feedback).findByRole('button', { name: /try again/i }));

    await waitFor(() => expect(posts(seen)).toHaveLength(2));
    expect(posts(seen)[0]).toMatchObject({
      url: `${FEEDBACK_URL}/clear`,
      body: { conversationId: 7 },
    });
    expect(posts(seen)[1]?.body).toEqual({
      action: 'start',
      model: 'sonnet',
      fields: {
        prediction: 'It asks for the menu.',
        observation: '',
        explanation: '',
        help_used: '',
      },
    });
    stream.end();
  });

  it('offers no Try again when a later reply failed; the message box is the way on', async () => {
    serve({
      areaNow: () => ({
        activityId: 'ACT-A',
        hasWorkedAnswer: true,
        replying: false,
        conversation: conversation([
          learnerTurn(1),
          claudeTurn(2),
          learnerTurn(3),
          claudeTurn(4, {
            text: '',
            outcome: 'failed',
            failure: 'Claude did not finish within 3 minutes.',
          }),
        ]),
      }),
    });
    const feedback = await openLesson();
    await within(feedback).findByText(/did not finish within 3 minutes/i);

    expect(within(feedback).queryByRole('button', { name: /try again/i })).toBeNull();
    expect(within(feedback).getByLabelText(/message to claude/i)).toBeTruthy();
  });
});
