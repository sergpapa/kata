import type { FeedbackDeps, FeedbackRunner, RunEvent, RunRequest } from '../types.js';

/**
 * Stand-ins for the learner's Claude Code. A test that started the real one would spend the
 * learner's plan, and would answer differently every time.
 */

/** A promise the test resolves when it chooses: how a run is held open mid-reply. */
export interface Gate {
  readonly opened: Promise<void>;
  open(): void;
}

export function gate(): Gate {
  let open = () => {};
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

/** A reply that streams in two pieces and finishes, answered by Sonnet. */
export function sonnetReply(text: string, sessionId = 'session-from-stream'): RunEvent[] {
  const half = Math.ceil(text.length / 2);
  return [
    { type: 'started', model: 'claude-sonnet-5-5', sessionId },
    { type: 'text', text: text.slice(0, half) },
    { type: 'text', text: text.slice(half) },
    { type: 'done', text },
  ];
}

export interface FakeRunner extends FeedbackRunner {
  /** Every request, in the order the runs started. */
  readonly requests: RunRequest[];
  /** How many runs have reached their first event. */
  started(): number;
}

/**
 * Plays `replies[i]` for the i-th run (the last one again once they run out). When `holdAt` is
 * given, run i waits on `holdAt[i]` after its first event, so a test can look at the app mid-reply.
 */
export function fakeRunner(
  options: {
    readonly replies?: readonly (readonly RunEvent[])[];
    readonly holdAt?: readonly (Gate | undefined)[];
    readonly unavailableReason?: string | null;
  } = {},
): FakeRunner {
  const requests: RunRequest[] = [];
  let started = 0;
  const replies = options.replies ?? [sonnetReply('Good start. What would you check first?')];
  return {
    unavailableReason: options.unavailableReason ?? null,
    requests,
    started: () => started,
    run(request: RunRequest): AsyncIterable<RunEvent> {
      const index = requests.length;
      requests.push(request);
      const events = replies[Math.min(index, replies.length - 1)] ?? [];
      const hold = options.holdAt?.[index];
      return (async function* () {
        for (const [position, event] of events.entries()) {
          yield event;
          if (position === 0) {
            started += 1;
            if (hold) await hold.opened;
          }
        }
      })();
    },
  };
}

/** Feedback wiring for tests that never ask for feedback: any run is a test defect, loudly. */
export function inertFeedback(): FeedbackDeps {
  return {
    runner: {
      unavailableReason: null,
      run(): AsyncIterable<RunEvent> {
        throw new Error('This test did not expect a feedback run, and one was started.');
      },
    },
    now: () => new Date('2026-11-19T10:00:00.000Z'),
    newSessionId: () => '00000000-0000-4000-8000-000000000001',
  };
}

/** Feedback wiring around a given runner, with a clock the test can move and numbered sessions. */
export function testFeedback(runner: FeedbackRunner, start = '2026-11-19T10:00:00.000Z') {
  let now = new Date(start);
  let sessions = 0;
  const deps: FeedbackDeps = {
    runner,
    now: () => now,
    newSessionId: () => {
      sessions += 1;
      return `00000000-0000-4000-8000-${String(sessions).padStart(12, '0')}`;
    },
  };
  return {
    deps,
    setNow(iso: string) {
      now = new Date(iso);
    },
  };
}
