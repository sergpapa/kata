/**
 * Practice feedback as the server sends it (docs/specs/practice-feedback.md). Mirrors
 * `apps/server/src/modules/feedback/types.ts`; the two sides share no code, so the routes' tests
 * and this side's tests each pin their half of the contract.
 */

/** The model aliases the picker offers, in its order. The first is the default (PF13). */
export const FEEDBACK_MODELS = [
  { value: 'sonnet', label: 'Sonnet' },
  { value: 'opus', label: 'Opus' },
  { value: 'haiku', label: 'Haiku' },
] as const;

export type FeedbackModel = (typeof FEEDBACK_MODELS)[number]['value'];

/** Where the chosen model is remembered, per browser. */
export const FEEDBACK_MODEL_STORAGE_KEY = 'educode.feedbackModel';

export interface SentField {
  readonly fieldName: string;
  readonly text: string;
}

export interface FeedbackTurn {
  readonly turn: number;
  readonly role: 'learner' | 'claude';
  readonly text: string;
  readonly writtenAt: string;
  readonly sentFields?: readonly SentField[];
  readonly model?: string | null;
  readonly outcome?: 'complete' | 'failed';
  readonly failure?: string | null;
}

export interface FeedbackConversation {
  readonly conversationId: number;
  readonly turns: readonly FeedbackTurn[];
}

/** A conversation Start over hid that had a reply; shown read-only (earlier-conversations EC1). */
export interface EarlierConversation extends FeedbackConversation {
  readonly startedAt: string;
  readonly clearedAt: string;
}

export interface FeedbackArea {
  readonly activityId: string;
  readonly hasWorkedAnswer: boolean;
  readonly conversation: FeedbackConversation | null;
  /** Newest first. Absent from a server older than this list, which means none (EC6). */
  readonly earlier?: readonly EarlierConversation[];
  readonly replying: boolean;
}

export type FeedbackAvailability =
  | { readonly state: 'ready' }
  | { readonly state: 'unavailable'; readonly reason: string }
  | { readonly state: 'paused'; readonly reason: string; readonly resumesAt: string };

/** What the lesson answer carries under `feedback`. */
export interface LessonFeedback {
  readonly availability: FeedbackAvailability;
  readonly activities: readonly FeedbackArea[];
}
