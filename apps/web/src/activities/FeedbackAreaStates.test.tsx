import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonPage } from '../LessonPage.js';
import {
  area,
  claudeTurn,
  conversation,
  FEEDBACK_URL,
  json,
  learnerTurn,
  serve,
  testStream,
  type Seen,
} from '../testkit/feedbackFixture.js';
import { FEEDBACK_MODEL_STORAGE_KEY } from './feedbackTypes.js';

/** How the page names a reset time: local time, then the day (docs/specs/practice-feedback.md PF20). */
function resumesAtWords(iso: string): string {
  const when = new Date(iso);
  const time = when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const day = when.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
  return `${time} on ${day}`;
}

/**
 * PF3, PF11, PF13–PF16 and PF20 in docs/specs/practice-feedback.md: the states the area can be in
 * besides "ready", and the model picker.
 *
 * Each state here replaces the button with a sentence. The failure these catch is a button that is
 * still pressable when the press can only be refused — or worse, a paused guard the page does not
 * mention, so the owner thinks feedback is broken rather than holding their plan back.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.history.replaceState({}, '', '/');
  try {
    window.localStorage.clear();
  } catch {
    // A test replaced storage with one that throws.
  }
});

async function openLesson() {
  render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);
  return screen.findByRole('region', { name: /feedback from claude/i });
}

const posts = (seen: Seen[]) =>
  seen.filter((one) => one.method === 'POST' && one.url.startsWith(FEEDBACK_URL));

describe('an activity without a worked answer (PF3)', () => {
  it('says Claude’s feedback is its own reading', async () => {
    serve({ areaNow: () => area({ hasWorkedAnswer: false }) });
    const feedback = await openLesson();

    expect(
      within(feedback).getByText(
        'This activity has no worked answer from the author, so Claude’s feedback is its own reading.',
      ),
    ).toBeTruthy();
  });

  it('says nothing of the kind when there is one', async () => {
    serve({});
    const feedback = await openLesson();

    expect(within(feedback).queryByText(/no worked answer/i)).toBeNull();
  });
});

describe('when feedback cannot start (PF16, PF20)', () => {
  it('names a missing Claude Code in place of the button', async () => {
    const reason =
      'Claude Code was not found on this computer. Install it, or set EDUCODE_CLAUDE_PATH to its claude.exe.';
    serve({ availability: { state: 'unavailable', reason } });
    const feedback = await openLesson();

    expect(within(feedback).getByText(reason)).toBeTruthy();
    expect(within(feedback).queryByRole('button', { name: /get feedback/i })).toBeNull();
  });

  it('says the usage pause is on, why, and when it lifts, in place of the button', async () => {
    serve({
      availability: {
        state: 'paused',
        reason: 'Feedback is paused to keep your plan out of paid extra usage.',
        resumesAt: '2026-11-19T15:00:00.000Z',
      },
    });
    const feedback = await openLesson();

    expect(
      within(feedback).getByText(/paused to keep your plan out of paid extra usage/i),
    ).toBeTruthy();
    expect(feedback.textContent).toContain(
      `It starts again at ${resumesAtWords('2026-11-19T15:00:00.000Z')}`,
    );
    expect(within(feedback).queryByRole('button', { name: /get feedback/i })).toBeNull();
  });

  it('shows the pause the server answers with when it began after the page loaded', async () => {
    serve({
      posts: [
        json(
          {
            error: 'feedback_usage_paused',
            message: 'Feedback is paused to keep your plan out of paid extra usage.',
            resumesAt: '2026-11-19T15:00:00.000Z',
          },
          409,
        ),
      ],
    });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    expect(await within(feedback).findByText(/starts again at/i)).toBeTruthy();
    expect(feedback.textContent).toContain(resumesAtWords('2026-11-19T15:00:00.000Z'));
    expect(within(feedback).queryByRole('button', { name: /get feedback/i })).toBeNull();
    expect((screen.getByLabelText(/your prediction/i) as HTMLTextAreaElement).value).toBe('Typed.');
  });

  it('shows a refusal’s own message and leaves the boxes alone', async () => {
    serve({
      posts: [
        json(
          {
            error: 'feedback_in_progress',
            message: 'Claude is already replying to this activity.',
          },
          409,
        ),
      ],
    });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    expect(
      await within(feedback).findByText('Claude is already replying to this activity.'),
    ).toBeTruthy();
    expect((screen.getByLabelText(/your prediction/i) as HTMLTextAreaElement).value).toBe('Typed.');
  });

  it('says so when the app does not answer at all', async () => {
    serve({
      posts: [
        () => {
          throw new TypeError('Failed to fetch');
        },
      ],
    });
    const feedback = await openLesson();
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));

    expect(await within(feedback).findByText(/the local app did not answer/i)).toBeTruthy();
    expect(feedback.textContent).toContain('Failed to fetch');
    expect(within(feedback).getByRole('button', { name: /get feedback/i })).toHaveProperty(
      'disabled',
      false,
    );
  });
});

describe('a reply still being written when the page opens (PF15)', () => {
  it('says so, asks again after 3 seconds, shows the reply, then stops asking', async () => {
    let calls = 0;
    const seen = serve({
      areaNow: () => area({ replying: true, conversation: conversation([learnerTurn(1)]) }),
      gets: [
        () => {
          calls += 1;
          return calls < 2
            ? {
                availability: { state: 'ready' },
                ...area({ replying: true, conversation: conversation([learnerTurn(1)]) }),
              }
            : {
                availability: { state: 'ready' },
                ...area({
                  replying: false,
                  conversation: conversation([
                    learnerTurn(1),
                    claudeTurn(2, { text: 'Finished while you were away.' }),
                  ]),
                }),
              };
        },
      ],
    });
    const opened = Date.now();
    const feedback = await openLesson();
    const asked: number[] = [];
    const feedbackGets = () =>
      seen.filter((one) => one.method === 'GET' && one.url.startsWith(FEEDBACK_URL));
    const note = () => {
      while (asked.length < feedbackGets().length) asked.push(Date.now() - opened);
    };

    expect(within(feedback).getByText(/claude is still replying/i)).toBeTruthy();
    expect(within(feedback).queryByRole('button', { name: /start over/i })).toBeNull();
    expect(within(feedback).queryByRole('button', { name: /get feedback/i })).toBeNull();
    await waitFor(
      () => {
        note();
        expect(within(feedback).getByText('Finished while you were away.')).toBeTruthy();
      },
      { timeout: 9_000, interval: 50 },
    );
    expect(within(feedback).queryByText(/claude is still replying/i)).toBeNull();

    // About every 3 seconds: not a tight loop, and not slower than the spec says.
    expect(asked).toHaveLength(2);
    expect(asked[0]).toBeGreaterThanOrEqual(2_500);
    expect((asked[1] as number) - (asked[0] as number)).toBeGreaterThanOrEqual(2_500);
    expect(asked[1]).toBeLessThan(7_500);

    // And it stops once the run is over.
    await new Promise((resolve) => setTimeout(resolve, 3_500));
    expect(feedbackGets()).toHaveLength(2);
  }, 20_000);
});

describe('words the area never uses (PF10)', () => {
  const states = {
    ready: () => serve({}),
    paused: () =>
      serve({
        availability: {
          state: 'paused',
          reason: 'Feedback is paused to keep your plan out of paid extra usage.',
          resumesAt: '2026-11-19T15:00:00.000Z',
        },
      }),
    unavailable: () =>
      serve({
        availability: {
          state: 'unavailable',
          reason:
            'Claude Code was not found on this computer. Install it, or set EDUCODE_CLAUDE_PATH to its claude.exe.',
        },
      }),
    replying: () =>
      serve({
        areaNow: () => area({ replying: true, conversation: conversation([learnerTurn(1)]) }),
      }),
    'no worked answer': () => serve({ areaNow: () => area({ hasWorkedAnswer: false }) }),
  };

  for (const [name, start] of Object.entries(states)) {
    it(`calls nothing graded, scored, marked, passed or failed when ${name}`, async () => {
      start();
      const feedback = await openLesson();

      const words = (feedback.textContent ?? '').replace(
        'Claude can be wrong. This is feedback on your reasoning, not a grade.',
        '',
      );
      expect(words).not.toMatch(/\b(grade|graded|score|scored|mark|marked|passed|failed)\b/i);
    });
  }
});

describe('the model picker (PF13)', () => {
  it('starts on Sonnet and offers Opus and Haiku', async () => {
    serve({});
    const feedback = await openLesson();
    const picker = within(feedback).getByLabelText(/model/i) as HTMLSelectElement;

    expect(picker.value).toBe('sonnet');
    expect([...picker.options].map((option) => [option.value, option.textContent])).toEqual([
      ['sonnet', 'Sonnet'],
      ['opus', 'Opus'],
      ['haiku', 'Haiku'],
    ]);
  });

  it('remembers the choice in this browser and sends it', async () => {
    const stream = testStream();
    const seen = serve({ posts: [stream.response] });
    const first = await openLesson();
    fireEvent.change(within(first).getByLabelText(/model/i), { target: { value: 'opus' } });
    expect(window.localStorage.getItem(FEEDBACK_MODEL_STORAGE_KEY)).toBe('opus');
    cleanup();

    const feedback = await openLesson();
    expect((within(feedback).getByLabelText(/model/i) as HTMLSelectElement).value).toBe('opus');
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'Typed.' } });
    fireEvent.click(within(feedback).getByRole('button', { name: /get feedback/i }));
    await waitFor(() => expect(posts(seen)).toHaveLength(1));
    expect(posts(seen)[0]?.body).toMatchObject({ model: 'opus' });
    stream.end();
  });

  it('falls back to Sonnet when a remembered value is not one it offers', async () => {
    window.localStorage.setItem(FEEDBACK_MODEL_STORAGE_KEY, 'claude-mythos');
    serve({});
    const feedback = await openLesson();

    expect((within(feedback).getByLabelText(/model/i) as HTMLSelectElement).value).toBe('sonnet');
  });

  it('works on Sonnet when browser storage throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage is blocked');
    });
    serve({});
    const feedback = await openLesson();
    const picker = within(feedback).getByLabelText(/model/i) as HTMLSelectElement;

    expect(picker.value).toBe('sonnet');
    fireEvent.change(picker, { target: { value: 'haiku' } });
    expect(picker.value).toBe('haiku');
  });
});

describe('feedback stays optional (PF11)', () => {
  it('draws the lesson and its boxes as before when the server sends no feedback', async () => {
    serve({ noFeedback: true });
    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    expect(await screen.findByLabelText(/your prediction/i)).toBeTruthy();
    expect(screen.queryByRole('region', { name: /feedback from claude/i })).toBeNull();
  });
});
