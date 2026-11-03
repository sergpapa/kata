import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { useApi } from './api.js';
import { answerRoutes } from './testkit/apiFixture.js';

/**
 * Code review, 2026-11-03: when the address moves from one course to another, the answer for the
 * first course must not be handed out under the second course's URL, not even for one render. A
 * page drawn from it would link the first course's lessons under the second course's address.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useApi', () => {
  it('answers reading, never the previous URL’s answer, on the render its URL changes', async () => {
    answerRoutes({ '/api/courses/FSSE/release': { from: 'FSSE' } });
    // Every render's (url, answer) pair. `rerender` flushes effects before it returns, so only a
    // record kept during render can see the one commit where the URL has moved and the effect that
    // resets the answer has not yet run.
    const seen: { url: string | null; body: unknown }[] = [];
    const { result, rerender } = renderHook(
      ({ url }) => {
        const answer = useApi(url);
        seen.push({ url, body: answer.state === 'answered' ? answer.body : null });
        return answer;
      },
      { initialProps: { url: '/api/courses/FSSE/release' as string | null } },
    );
    await waitFor(() => expect(result.current.state).toBe('answered'));

    rerender({ url: '/api/courses/QAAE/release' });

    const underQaae = seen.filter((render) => render.url === '/api/courses/QAAE/release');
    expect(underQaae.length).toBeGreaterThan(0);
    expect(underQaae.map((render) => render.body)).not.toContainEqual({ from: 'FSSE' });
  });

  it('asks nothing for a null URL', () => {
    answerRoutes({});

    const { result } = renderHook(() => useApi(null));

    expect(result.current.state).toBe('reading');
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });
});
