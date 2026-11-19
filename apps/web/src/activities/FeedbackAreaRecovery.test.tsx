import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonPage } from '../LessonPage.js';
import {
  area,
  claudeTurn,
  conversation,
  FEEDBACK_URL,
  learnerTurn,
  serve,
  testStream,
} from '../testkit/feedbackFixture.js';

/**
 * What the page does when a stream breaks (docs/specs/practice-feedback.md PF15, PF16), from the
 * code review of 2026-11-19.
 *
 * The run belongs to the server, so a broken connection is not a failed run: the reply is still
 * being written and will be stored. A page that reports "did not answer" and stops watching leaves
 * the learner pressing Send into a 409 while the answer they asked for sits unseen.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

async function openLesson() {
  render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);
  return screen.findByRole('region', { name: /feedback from claude/i });
}

describe('a connection that breaks mid-reply', () => {
  it('watches for the reply at the server instead of reporting a failure', async () => {
    const stream = testStream();
    serve({
      posts: [stream.response],
      gets: [
        () => ({
          availability: { state: 'ready' },
          ...area({
            replying: false,
            conversation: conversation([
              learnerTurn(1),
              claudeTurn(2, { text: 'Stored while the page was cut off.' }),
            ]),
          }),
        }),
      ],
    });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    stream.send('learner', { conversationId: 7, turn: learnerTurn(1) });
    stream.send('delta', { text: 'Half a' });
    // A broken stream drops what it had not delivered, so break it once this much has arrived.
    await within(feedback).findByText(/half a/i);
    stream.fail();

    expect(await within(feedback).findByText(/claude is still replying/i)).toBeTruthy();
    expect(within(feedback).queryByText(/did not answer/i)).toBeNull();
    expect(
      await within(feedback).findByText(
        'Stored while the page was cut off.',
        {},
        { timeout: 6_000 },
      ),
    ).toBeTruthy();
  }, 10_000);

  it('clears a sent message once its reply arrived, even if the stream then breaks', async () => {
    const stream = testStream();
    serve({
      areaNow: () => area({ conversation: conversation([learnerTurn(1), claudeTurn(2)]) }),
      posts: [stream.response],
    });
    const feedback = await openLesson();
    const message = (await within(feedback).findByLabelText(
      /message to claude/i,
    )) as HTMLTextAreaElement;
    fireEvent.change(message, { target: { value: 'And then?' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /^send$/i }));

    stream.send('learner', { conversationId: 7, turn: learnerTurn(3) });
    stream.send('reply', { conversationId: 7, turn: claudeTurn(4, { text: 'Then this.' }) });
    expect(await within(feedback).findByText('Then this.')).toBeTruthy();
    stream.fail();

    await waitFor(() => expect(message.value).toBe(''));
  });
});

describe('an error the server reports inside the stream', () => {
  it('shows its message and lets the learner try again', async () => {
    const stream = testStream();
    serve({ posts: [stream.response] });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    stream.send('learner', { conversationId: 7, turn: learnerTurn(1) });
    stream.send('error', {
      message: 'Claude’s reply could not be stored: database or disk is full',
    });
    stream.end();

    expect(
      await within(feedback).findByText(/could not be stored: database or disk is full/i),
    ).toBeTruthy();
    expect(within(feedback).queryByText(/claude is replying/i)).toBeNull();
    expect(screen.getByLabelText(/your prediction/i)).toHaveProperty('value', 'Typed.');
    expect(
      within(feedback)
        .queryAllByRole('button')
        .some((button) => !button.hasAttribute('disabled')),
    ).toBe(true);
    expect(FEEDBACK_URL).toContain('/feedback');
  });
});
