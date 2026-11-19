import type { RateLimitInfo } from './types.js';

/**
 * Whether new turns must wait so the org's paid extra usage is not touched (PF20, ADR 0019).
 *
 * Judged on the newest report only: an older high reading is superseded by a newer low one. A
 * report that names no reset time for what tripped it pauses for an hour from when it was seen,
 * so the pause cannot become permanent on a missing field.
 */

export type UsagePause =
  | { readonly paused: false }
  | { readonly paused: true; readonly resumesAt: string; readonly reason: string };

export const PAUSE_THRESHOLD = 0.9;
const FALLBACK_PAUSE_MS = 60 * 60 * 1000;

export const PAUSE_REASON =
  'Feedback is paused to keep your plan out of paid extra usage: the last reply showed your Claude plan close to its limit.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function usagePause(
  observed: { readonly info: RateLimitInfo; readonly observedAt: Date } | null,
  now: Date,
): UsagePause {
  if (!observed) return { paused: false };
  const { info, observedAt } = observed;

  // Each tripped condition contributes the reset time that would lift it, or undefined.
  const tripped: (number | undefined)[] = [];
  if (typeof info.status === 'string' && info.status !== 'allowed') tripped.push(info.resetsAt);
  if (info.isUsingOverage === true) tripped.push(info.resetsAt);
  const windows = isRecord(info.unifiedWindows) ? Object.values(info.unifiedWindows) : [];
  for (const window of windows) {
    if (!isRecord(window)) continue;
    const high = typeof window.utilization === 'number' && window.utilization >= PAUSE_THRESHOLD;
    const notAllowed = typeof window.status === 'string' && window.status !== 'allowed';
    if (high || notAllowed) {
      tripped.push(typeof window.resetsAt === 'number' ? window.resetsAt : undefined);
    }
  }
  if (tripped.length === 0) return { paused: false };

  const until = Math.max(
    ...tripped.map((resetsAt) =>
      typeof resetsAt === 'number' && Number.isFinite(resetsAt)
        ? resetsAt * 1000
        : observedAt.getTime() + FALLBACK_PAUSE_MS,
    ),
  );
  if (now.getTime() >= until) return { paused: false };
  return { paused: true, resumesAt: new Date(until).toISOString(), reason: PAUSE_REASON };
}
