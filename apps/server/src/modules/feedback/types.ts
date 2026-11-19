/**
 * The contract between the feedback routes, the store and whatever produces Claude's reply
 * (docs/specs/practice-feedback.md, ADR 0019).
 *
 * The runner is an interface so the routes can be driven by a stand-in in tests: the real one
 * starts the learner's own Claude Code, and a test that did that would spend their plan.
 */

/** The only model names the server passes to Claude Code (PF13). Anything else is refused. */
export const MODEL_ALIASES = ['sonnet', 'opus', 'haiku'] as const;
export type ModelAlias = (typeof MODEL_ALIASES)[number];

/** One usage window as Claude Code reports it. `resetsAt` is in Unix seconds. */
export interface UsageWindow {
  readonly utilization?: number;
  readonly resetsAt?: number;
  readonly status?: string;
}

/**
 * `rate_limit_event.rate_limit_info`, kept as received. Every field is optional because the format
 * is Claude Code's, not ours; the guard treats a field it cannot read as no evidence either way.
 */
export interface RateLimitInfo {
  readonly status?: string;
  readonly resetsAt?: number;
  readonly isUsingOverage?: boolean;
  readonly overageStatus?: string;
  readonly unifiedWindows?: Readonly<Record<string, UsageWindow>>;
}

/** One turn to run. `resume` is false for a conversation's first turn. */
export interface RunRequest {
  readonly sessionId: string;
  readonly resume: boolean;
  readonly model: ModelAlias;
  readonly systemPrompt: string;
  readonly prompt: string;
}

/**
 * What a run reports, in order. A run ends with exactly one `done` or `failed`, and nothing after
 * it. `failed.reason` is the sentence the learner reads.
 */
export type RunEvent =
  | { readonly type: 'started'; readonly model: string; readonly sessionId: string }
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'usage'; readonly info: RateLimitInfo }
  | { readonly type: 'done'; readonly text: string }
  | { readonly type: 'failed'; readonly reason: string };

export interface FeedbackRunner {
  /**
   * Why no run can start on this machine (Claude Code not found), or null when one can. Read at
   * page load so the area can say so before anybody presses a button (PF16).
   */
  readonly unavailableReason: string | null;
  /** Runs one turn to its end. The caller consumes every event; leaving the page does not stop it. */
  run(request: RunRequest): AsyncIterable<RunEvent>;
}

/** What the feedback routes need from the composition root. Every member is required. */
export interface FeedbackDeps {
  readonly runner: FeedbackRunner;
  /** The clock, for stamps and for when a usage pause lifts. */
  readonly now: () => Date;
  /** A fresh Claude Code session id (a UUID) for a conversation's first turn. */
  readonly newSessionId: () => string;
}

/** One stored box text, as it was sent with a conversation's first turn. */
export interface SentField {
  readonly fieldName: string;
  readonly text: string;
}

/** One turn as the page draws it. */
export interface FeedbackTurnForPage {
  readonly turn: number;
  readonly role: 'learner' | 'claude';
  readonly text: string;
  readonly writtenAt: string;
  /** On a conversation's first learner turn only: every declared box, as sent. */
  readonly sentFields?: readonly SentField[];
  /** On Claude turns: the model id that answered, or null when the run failed before naming one. */
  readonly model?: string | null;
  readonly outcome?: 'complete' | 'failed';
  readonly failure?: string | null;
}

export interface FeedbackConversationForPage {
  readonly conversationId: number;
  readonly turns: readonly FeedbackTurnForPage[];
}

/** A conversation Start over hid that had a reply, shown read-only (earlier-conversations EC1). */
export interface EarlierConversationForPage extends FeedbackConversationForPage {
  readonly startedAt: string;
  readonly clearedAt: string;
}

/** One activity's feedback area, as the lesson answer and `GET …/feedback` carry it. */
export interface FeedbackForPage {
  readonly activityId: string;
  /** False when the activity has no worked-answer section to coach against (PF3). */
  readonly hasWorkedAnswer: boolean;
  readonly conversation: FeedbackConversationForPage | null;
  /** Newest first; never the current conversation, never one without a complete reply (EC2). */
  readonly earlier: readonly EarlierConversationForPage[];
  /** True while a run for this activity is going (PF15). */
  readonly replying: boolean;
}

/** Whether a new turn can start at all, for every activity at once. */
export type FeedbackAvailability =
  | { readonly state: 'ready' }
  | { readonly state: 'unavailable'; readonly reason: string }
  | { readonly state: 'paused'; readonly reason: string; readonly resumesAt: string };
