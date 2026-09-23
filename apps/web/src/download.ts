import { useEffect, useRef, useState } from 'react';

/**
 * Handing a file to the browser, and saying honestly whether it was taken.
 *
 * The clipboard's counterpart, and deliberately the same shape: an outcome that settles back to
 * idle, and a refusal that is said out loud rather than swallowed (see `clipboard.ts`, where the
 * reasoning behind both is recorded).
 *
 * This is the only place in the app that makes a file out of something the reader typed. The lab
 * kit download is a plain link to the server, because there the bytes are the server's
 * (`LabKitPanel`); here the server is frequently the thing that has just failed, so the file has to
 * be built from what the page already holds.
 */

export type DownloadState = 'idle' | 'downloaded' | 'failed';

/** How long the outcome stays up before the control offers Download again. */
export const DOWNLOAD_SETTLE_MS = 2000;

export function useFileDownload(): {
  readonly state: DownloadState;
  readonly download: (fileName: string, body: string, type: string) => void;
} {
  const [state, setState] = useState<DownloadState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  function download(fileName: string, body: string, type: string): void {
    let href: string | null = null;
    try {
      // Read at press time for the same reason the clipboard is: a browser can be without this
      // entirely — jsdom is, and so is any context where object URLs are disallowed — and the
      // answer belongs to this press. Checked rather than called blind, so "no such method" and
      // "the method said no" both arrive here as the same honest refusal.
      const make = URL.createObjectURL;
      if (typeof make !== 'function') {
        throw new Error('This browser gave the page no way to make a file.');
      }
      href = URL.createObjectURL(new Blob([body], { type }));
      const anchor = document.createElement('a');
      anchor.href = href;
      anchor.download = fileName;
      anchor.click();
      setState('downloaded');
    } catch {
      setState('failed');
      // Nothing was handed over, so nothing may be claimed — and if the URL was made before the
      // failure, it is still ours to clean up.
      if (href !== null) revokeSoon(href);
      href = null;
    }

    if (href !== null) revokeSoon(href);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), DOWNLOAD_SETTLE_MS);
  }

  return { state, download };
}

/**
 * Release the object URL, but not in the same task that clicked the anchor.
 *
 * Revoking immediately after `click()` is the common shortcut and it races the browser: in some
 * browsers the download is still reading the blob when the URL goes away, and the reader gets an
 * empty or failed file for no reason they can see. A task later is enough, and never clearing this
 * timer is deliberate — an unmounted component must still give the URL back, and this touches no
 * React state, so it is safe to let it run.
 */
function revokeSoon(href: string): void {
  setTimeout(() => {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(href);
  }, 0);
}
