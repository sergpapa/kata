import { describe, expect, it } from 'vitest';
import { usagePause } from './usageGuard.js';
import type { RateLimitInfo } from './types.js';

/**
 * PF20 in docs/specs/practice-feedback.md: stop before the org's paid extra usage.
 *
 * The bug this catches costs money. A guard that reads the wrong field, compares the wrong way, or
 * forgets a window lets the learner keep asking until replies are billed to the org — and nobody
 * notices until the invoice. A guard that never lifts is the opposite failure, quieter: feedback
 * stays off for good after one busy afternoon.
 */

const now = new Date('2026-11-19T10:00:00.000Z');
const nowSeconds = now.getTime() / 1000;
const inAnHour = nowSeconds + 3600;
const inTwoHours = nowSeconds + 7200;

/** The shape recorded from the owner's Claude Code on 2026-11-19, with the numbers a test needs. */
function info(
  over: Partial<RateLimitInfo> = {},
  windows?: RateLimitInfo['unifiedWindows'],
): RateLimitInfo {
  return {
    status: 'allowed',
    resetsAt: inAnHour,
    isUsingOverage: false,
    overageStatus: 'allowed',
    unifiedWindows: windows ?? {
      five_hour: { utilization: 0.04, resetsAt: inAnHour, status: 'allowed' },
      seven_day: { utilization: 0.24, resetsAt: inTwoHours, status: 'allowed' },
    },
    ...over,
  };
}

const observedAt = new Date('2026-11-19T09:59:00.000Z');

describe('the usage guard', () => {
  it('lets turns through when nothing has been reported yet', () => {
    expect(usagePause(null, now)).toEqual({ paused: false });
  });

  it('lets turns through at the usage the owner had on 2026-11-19', () => {
    expect(usagePause({ info: info(), observedAt }, now)).toEqual({ paused: false });
  });

  it('pauses at 90% of a window, until that window resets', () => {
    const pause = usagePause(
      {
        info: info(
          {},
          {
            five_hour: { utilization: 0.9, resetsAt: inAnHour, status: 'allowed' },
            seven_day: { utilization: 0.24, resetsAt: inTwoHours, status: 'allowed' },
          },
        ),
        observedAt,
      },
      now,
    );

    expect(pause.paused).toBe(true);
    if (pause.paused) {
      expect(pause.resumesAt).toBe(new Date(inAnHour * 1000).toISOString());
      expect(pause.reason).toMatch(/extra usage/i);
    }
  });

  it('does not pause just under 90%', () => {
    const pause = usagePause(
      {
        info: info(
          {},
          {
            five_hour: { utilization: 0.899, resetsAt: inAnHour, status: 'allowed' },
          },
        ),
        observedAt,
      },
      now,
    );

    expect(pause).toEqual({ paused: false });
  });

  it('watches the seven-day window too, and waits for the later reset when both are high', () => {
    const pause = usagePause(
      {
        info: info(
          {},
          {
            five_hour: { utilization: 0.95, resetsAt: inAnHour, status: 'allowed' },
            seven_day: { utilization: 0.97, resetsAt: inTwoHours, status: 'allowed' },
          },
        ),
        observedAt,
      },
      now,
    );

    expect(pause.paused && pause.resumesAt).toBe(new Date(inTwoHours * 1000).toISOString());
  });

  it('pauses when a window reports a status other than allowed', () => {
    const pause = usagePause(
      {
        info: info(
          {},
          {
            five_hour: { utilization: 0.5, resetsAt: inAnHour, status: 'allowed_warning' },
          },
        ),
        observedAt,
      },
      now,
    );

    expect(pause.paused).toBe(true);
  });

  it('pauses when the overall status is not allowed, until the overall reset', () => {
    const pause = usagePause(
      { info: info({ status: 'rejected', resetsAt: inTwoHours }), observedAt },
      now,
    );

    expect(pause.paused && pause.resumesAt).toBe(new Date(inTwoHours * 1000).toISOString());
  });

  it('pauses when extra usage is already in use', () => {
    const pause = usagePause({ info: info({ isUsingOverage: true }), observedAt }, now);

    expect(pause.paused).toBe(true);
  });

  it('lifts on its own once the reset time has passed', () => {
    const high = info(
      {},
      {
        five_hour: { utilization: 0.99, resetsAt: inAnHour, status: 'allowed' },
      },
    );

    expect(usagePause({ info: high, observedAt }, now).paused).toBe(true);
    expect(usagePause({ info: high, observedAt }, new Date((inAnHour + 1) * 1000))).toEqual({
      paused: false,
    });
  });

  it('pauses for an hour from the report when a tripped window gives no reset time', () => {
    const pause = usagePause({ info: { isUsingOverage: true }, observedAt }, now);

    expect(pause.paused && pause.resumesAt).toBe('2026-11-19T10:59:00.000Z');
  });

  it('treats a report it cannot read as no evidence, not as a pause', () => {
    expect(usagePause({ info: {}, observedAt }, now)).toEqual({ paused: false });
  });
});
