import type { SentField } from './types.js';

/** The rules Claude coaches by (PF4). Replaces Claude Code's own system prompt. */
export const FEEDBACK_SYSTEM_PROMPT = '';

/** The first message of a conversation (PF2, PF3). */
export function firstTurnPrompt(input: {
  readonly title: string;
  readonly promptMarkdown: string;
  readonly workedAnswer: string | null;
  readonly fields: readonly SentField[];
}): string {
  void input;
  throw new Error('not implemented');
}
