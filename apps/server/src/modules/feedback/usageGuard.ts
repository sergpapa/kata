import type { RateLimitInfo } from './types.js';

export type UsagePause =
  | { readonly paused: false }
  | { readonly paused: true; readonly resumesAt: string; readonly reason: string };

/** Whether the last reported usage means new turns must wait (PF20). */
export function usagePause(
  observed: { readonly info: RateLimitInfo; readonly observedAt: Date } | null,
  now: Date,
): UsagePause {
  void observed;
  void now;
  throw new Error('not implemented');
}
