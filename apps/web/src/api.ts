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

export function useApi(url: string): ApiResult {
  const [result, setResult] = useState<ApiResult>({ state: 'reading' });

  useEffect(() => {
    const controller = new AbortController();
    setResult({ state: 'reading' });

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
      if (!controller.signal.aborted) setResult(next);
    })();

    return () => controller.abort();
  }, [url]);

  return result;
}
