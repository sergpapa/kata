import { useEffect, useState } from 'react';

/**
 * One request to the local app. The result is deliberately unopinionated — status and body, or a
 * plain reason the app did not answer — because each page knows its own contract and a shared
 * validator would have to widen to fit both.
 */
export type ApiResult =
  | { readonly state: 'reading' }
  | { readonly state: 'answered'; readonly status: number; readonly body: unknown }
  | { readonly state: 'unavailable'; readonly reason: string };

/**
 * `null` asks nothing and stays `reading`: a page outside any course has no release to ask about,
 * and hooks cannot be called conditionally, so "no question" has to be a value.
 */
export function useApi(url: string | null): ApiResult {
  // Each answer is kept with the URL it answers. The effect that asks the new URL runs after the
  // render in which the URL changed, so without this that render would hand out the previous URL's
  // answer — another course's release, drawn under this course's address (code review 2026-11-03).
  const [held, setHeld] = useState<{ url: string | null; result: ApiResult }>({
    url,
    result: { state: 'reading' },
  });

  useEffect(() => {
    setHeld({ url, result: { state: 'reading' } });
    if (url === null) return;
    const controller = new AbortController();

    // The result of an aborted request is discarded rather than rendered. React runs this effect
    // twice under StrictMode, and without the guard the first (aborted) request can resolve after
    // the second and leave the page stuck on its reading message.
    void (async () => {
      let next: ApiResult;
      try {
        const response = await fetch(url, { signal: controller.signal });
        next = { state: 'answered', status: response.status, body: await response.json() };
      } catch (error) {
        if (controller.signal.aborted) return;
        next = {
          state: 'unavailable',
          reason: error instanceof Error ? error.message : 'The app did not answer.',
        };
      }
      if (!controller.signal.aborted) setHeld({ url, result: next });
    })();

    return () => controller.abort();
  }, [url]);

  return held.url === url ? held.result : { state: 'reading' };
}
