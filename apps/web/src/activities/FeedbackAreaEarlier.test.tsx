import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonPage } from '../LessonPage.js';
import {
  area,
  claudeTurn,
  conversation,
  json,
  learnerTurn,
  serve,
  testStream,
} from '../testkit/feedbackFixture.js';
import type { FeedbackTurn } from './feedbackTypes.js';

/**
 * EC4–EC9 in docs/specs/earlier-conversations.md: the conversations Start over hid, on the lesson
 * page, read-only.
 *
 * The failures these catch: an earlier conversation that offers Send or Start over (and so looks
 * like it can be continued), a list that only appears after a reload, a Try again that adds noise
 * to the count, and two conversations on screen that a screen reader cannot tell apart.
 */

/** How the page names a moment: local time, then the day (the words PF20 uses). */
function atWords(iso: string): string {
  const when = new Date(iso);
  const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${time} on ${day}`;
}

interface Earlier {
  readonly conversationId: number;
  readonly startedAt: string;
  readonly clearedAt: string;
  readonly turns: readonly FeedbackTurn[];
}

function earlier(conversationId: number, clearedAt: string, reply: string): Earlier {
  return {
    conversationId,
    startedAt: '2026-11-19T09:00:00.000Z',
    clearedAt,
    turns: [learnerTurn(1), claudeTurn(2, { text: reply })],
  };
}

const NEWER = earlier(5, '2026-11-19T11:30:00.000Z', 'The newer earlier reply.');
const OLDER = earlier(3, '2026-11-19T09:15:00.000Z', 'The older earlier reply.');

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
  try {
    window.localStorage.clear();
  } catch {
    // Nothing to clear.
  }
});

async function openLesson() {
  render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);
  return screen.findByRole('region', { name: /feedback from claude/i });
}

/** The disclosure, found by its summary's words. */
function disclosure(feedback: HTMLElement, count: number): HTMLDetailsElement {
  const summary = within(feedback).getByText(`Earlier conversations (${count})`);
  return summary.closest('details') as HTMLDetailsElement;
}

function earlierLists(feedback: HTMLElement): HTMLElement[] {
  return within(feedback).queryAllByRole('list', { name: /^Earlier conversation, started over/ });
}

describe('the disclosure (EC4)', () => {
  it('is a closed disclosure counting the earlier conversations', async () => {
    serve({ areaNow: () => area({ earlier: [NEWER, OLDER] }) });
    const feedback = await openLesson();

    const details = await waitFor(() => disclosure(feedback, 2));
    expect(details.tagName).toBe('DETAILS');
    expect(details.querySelector(':scope > summary')).not.toBeNull();
    expect(details.hasAttribute('open')).toBe(false);
  });

  it('shows each conversation in the order sent, introduced by when it was started over', async () => {
    serve({ areaNow: () => area({ earlier: [NEWER, OLDER] }) });
    const feedback = await openLesson();
    const details = await waitFor(() => disclosure(feedback, 2));

    const text = details.textContent ?? '';
    const newer = text.indexOf(`Started over ${atWords(NEWER.clearedAt)}`);
    const older = text.indexOf(`Started over ${atWords(OLDER.clearedAt)}`);
    expect(newer).toBeGreaterThan(-1);
    expect(older).toBeGreaterThan(newer);
    expect(text.indexOf('The newer earlier reply.')).toBeGreaterThan(newer);
    expect(text.indexOf('The newer earlier reply.')).toBeLessThan(older);
    expect(text.indexOf('The older earlier reply.')).toBeGreaterThan(older);
  });

  it('shows the turns as the current conversation does: labels, what was sent, Markdown', async () => {
    const failedFollowUp = {
      ...OLDER,
      turns: [
        ...OLDER.turns,
        learnerTurn(3, { text: 'A follow-up.' }),
        claudeTurn(4, {
          text: 'Cut off mid',
          model: null,
          outcome: 'failed',
          failure: 'Claude did not finish within 3 minutes.',
        }),
      ],
    };
    serve({ areaNow: () => area({ earlier: [failedFollowUp] }) });
    const feedback = await openLesson();
    const details = await waitFor(() => disclosure(feedback, 1));

    expect(within(details).getByText(/ai feedback · claude-sonnet-5-5/i)).toBeTruthy();
    expect(
      within(details)
        .getByText(/what you sent/i)
        .closest('details'),
    ).not.toBeNull();
    expect(details.textContent).toContain('It asks for the menu.');
    expect(within(details).getByText('A follow-up.')).toBeTruthy();
    expect(within(details).getByText('Claude did not finish within 3 minutes.')).toBeTruthy();
    expect(within(details).getByText(/unfinished/i)).toBeTruthy();
    expect(details.textContent).toContain('Cut off mid');
    expect(details.querySelector('strong')?.textContent).toBe('What');
  });
});

describe('read-only (EC5)', () => {
  it('offers nothing that could change or continue an earlier conversation', async () => {
    serve({ areaNow: () => area({ earlier: [NEWER, OLDER] }) });
    const feedback = await openLesson();
    const details = await waitFor(() => disclosure(feedback, 2));

    // Every control inside is a disclosure summary (the list's own, and each "What you sent").
    const controls = details.querySelectorAll('button, textarea, input, select, a[href]');
    expect(controls).toHaveLength(0);
    // The area itself still offers its own controls, so the count above is not an empty page.
    expect(within(feedback).getByRole('button', { name: /get feedback/i })).toBeTruthy();
  });

  it('offers no Try again or Start over on an earlier conversation whose last turn failed', async () => {
    // The current conversation offers both on a failed turn; an earlier one must not inherit them.
    const endedInFailure = {
      ...OLDER,
      turns: [
        ...OLDER.turns,
        learnerTurn(3, { text: 'A follow-up.' }),
        claudeTurn(4, {
          text: '',
          model: null,
          outcome: 'failed',
          failure: 'Claude Code stopped.',
        }),
      ],
    };
    serve({ areaNow: () => area({ earlier: [endedInFailure] }) });
    const feedback = await openLesson();
    const details = await waitFor(() => disclosure(feedback, 1));

    expect(within(details).getByText('Claude Code stopped.')).toBeTruthy();
    expect(details.querySelectorAll('button, textarea, input, select, a[href]')).toHaveLength(0);
  });
});

describe('absent (EC6)', () => {
  it.each([
    ['an empty list', () => area({ earlier: [] })],
    ['no list at all, as an older answer sends', () => area()],
  ])('draws no disclosure for %s', async (_, areaNow) => {
    serve({ areaNow });
    const feedback = await openLesson();
    await within(feedback).findByRole('button', { name: /get feedback/i });

    expect(within(feedback).queryByText(/earlier conversations/i)).toBeNull();
    expect(earlierLists(feedback)).toHaveLength(0);
  });
});

describe('keeping up without a reload (EC7)', () => {
  it('puts a conversation Start over hid first, with the count raised by one', async () => {
    const justHidden = earlier(7, '2026-11-19T12:00:00.000Z', 'Good start. Just hidden.');
    serve({
      areaNow: () =>
        area({
          conversation: conversation([learnerTurn(1), claudeTurn(2)]),
          earlier: [OLDER],
        }),
      posts: [json({ state: 'cleared', earlier: [justHidden, OLDER] })],
    });
    const feedback = await openLesson();
    expect(await waitFor(() => disclosure(feedback, 1))).toBeTruthy();

    fireEvent.click(await within(feedback).findByRole('button', { name: /start over/i }));

    const details = await waitFor(() => disclosure(feedback, 2));
    const text = details.textContent ?? '';
    expect(text.indexOf('Good start. Just hidden.')).toBeGreaterThan(-1);
    expect(text.indexOf('Good start. Just hidden.')).toBeLessThan(
      text.indexOf('The older earlier reply.'),
    );
  });

  it('keeps the count after Try again, which hides a conversation that had no reply', async () => {
    const stream = testStream();
    serve({
      areaNow: () =>
        area({
          conversation: conversation([
            learnerTurn(1),
            claudeTurn(2, { text: '', outcome: 'failed', failure: 'Claude Code stopped.' }),
          ]),
          earlier: [OLDER],
        }),
      posts: [json({ state: 'cleared', earlier: [OLDER] }), stream.response],
    });
    const feedback = await openLesson();
    expect(await waitFor(() => disclosure(feedback, 1))).toBeTruthy();

    fireEvent.click(await within(feedback).findByRole('button', { name: /try again/i }));
    stream.send('learner', { conversationId: 8, turn: learnerTurn(1) });
    stream.send('reply', { conversationId: 8, turn: claudeTurn(2, { text: 'Second try.' }) });
    stream.end();

    expect(await within(feedback).findByText('Second try.')).toBeTruthy();
    expect(disclosure(feedback, 1)).toBeTruthy();
    expect(within(feedback).queryByText(/earlier conversations \(2\)/i)).toBeNull();
  });

  it('keeps the list it has when a Start over answer carries none', async () => {
    serve({
      areaNow: () =>
        area({
          conversation: conversation([learnerTurn(1), claudeTurn(2)]),
          earlier: [OLDER],
        }),
      posts: [json({ state: 'cleared' })],
    });
    const feedback = await openLesson();
    expect(await waitFor(() => disclosure(feedback, 1))).toBeTruthy();

    fireEvent.click(await within(feedback).findByRole('button', { name: /start over/i }));

    await within(feedback).findByRole('button', { name: /get feedback/i });
    expect(disclosure(feedback, 1)).toBeTruthy();
  });

  it('takes the list a 409 for a changed conversation carries', async () => {
    const elsewhere = earlier(7, '2026-11-19T12:00:00.000Z', 'Hidden from another tab.');
    serve({
      areaNow: () =>
        area({
          conversation: conversation([learnerTurn(1), claudeTurn(2)]),
          earlier: [],
        }),
      posts: [
        json(
          {
            error: 'feedback_conversation_changed',
            message: 'This conversation changed.',
            conversation: null,
            earlier: [elsewhere],
          },
          409,
        ),
      ],
    });
    const feedback = await openLesson();
    await within(feedback).findByRole('button', { name: /start over/i });
    expect(within(feedback).queryByText(/earlier conversations/i)).toBeNull();

    fireEvent.click(within(feedback).getByRole('button', { name: /start over/i }));

    const details = await waitFor(() => disclosure(feedback, 1));
    expect(details.textContent).toContain('Hidden from another tab.');
  });

  it('takes the list a poll for a reply carries', async () => {
    serve({
      areaNow: () =>
        area({
          replying: true,
          conversation: conversation([learnerTurn(1)]),
          earlier: [],
        }),
      gets: [
        () => ({
          availability: { state: 'ready' },
          ...area({
            replying: false,
            conversation: conversation([learnerTurn(1), claudeTurn(2, { text: 'Polled reply.' })]),
            earlier: [OLDER],
          }),
        }),
      ],
    });
    const feedback = await openLesson();

    expect(await within(feedback).findByText('Polled reply.', {}, { timeout: 6_000 })).toBeTruthy();
    expect(disclosure(feedback, 1)).toBeTruthy();
  }, 10_000);
});

describe('in every state (EC8)', () => {
  it.each([
    [
      'paused',
      { state: 'paused', reason: 'Paused for now.', resumesAt: '2026-11-19T15:00:00.000Z' },
    ],
    [
      'unavailable',
      { state: 'unavailable', reason: 'Claude Code was not found on this computer.' },
    ],
  ] as const)('shows the disclosure while feedback is %s', async (_, availability) => {
    serve({ availability, areaNow: () => area({ earlier: [OLDER] }) });
    const feedback = await openLesson();

    await within(feedback).findByText(availability.reason, { exact: false });
    expect(disclosure(feedback, 1)).toBeTruthy();
  });

  it('shows the disclosure while a reply is being written', async () => {
    const stream = testStream();
    serve({ areaNow: () => area({ earlier: [OLDER] }), posts: [stream.response] });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    stream.send('learner', { conversationId: 9, turn: learnerTurn(1) });
    stream.send('delta', { text: 'Writing now' });
    await within(feedback).findByText(/writing now/i);

    expect(disclosure(feedback, 1)).toBeTruthy();
    stream.end();
  });
});

describe('names a screen reader can tell apart (EC9)', () => {
  it('names each earlier list by when it was started over, and keeps Conversation for the current one', async () => {
    serve({
      areaNow: () =>
        area({
          conversation: conversation([learnerTurn(1), claudeTurn(2)]),
          earlier: [NEWER, OLDER],
        }),
    });
    const feedback = await openLesson();
    await waitFor(() => disclosure(feedback, 2));

    expect(earlierLists(feedback).map((list) => list.getAttribute('aria-label'))).toEqual([
      `Earlier conversation, started over ${atWords(NEWER.clearedAt)}`,
      `Earlier conversation, started over ${atWords(OLDER.clearedAt)}`,
    ]);
    expect(within(feedback).getAllByRole('list', { name: 'Conversation' })).toHaveLength(1);
  });
});
