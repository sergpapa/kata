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
    setState(handFileToBrowser(fileName, body, type) ? 'downloaded' : 'failed');
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), DOWNLOAD_SETTLE_MS);
  }

  return { state, download };
}

/**
 * Hands `body` to the browser as a file named `fileName`, and says whether it was taken.
 *
 * Shared by the recovery download and the Export card (docs/specs/export.md EX16), which each keep
 * their own words for the outcome. False means nothing was handed over, so nothing may be claimed.
 */
export function handFileToBrowser(fileName: string, body: string, type: string): boolean {
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
    // In the document for the press, and out again straight after. Chromium obliges a detached
    // anchor; Firefox and several WebViews ignore the click entirely, so the reader would be
    // told "Downloaded" and get no file — the exact false success this whole slice exists to
    // prevent, in the control meant to prevent it. Hidden, because it is machinery and not
    // something anybody should see land on the page.
    anchor.style.display = 'none';
    document.body.append(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
    }
    revokeSoon(href);
    return true;
  } catch {
    // If the URL was made before the failure, it is still ours to clean up.
    if (href !== null) revokeSoon(href);
    return false;
  }
}

/** Long enough that no browser is still reading the blob, short enough to be unmistakably a hand-back. */
const REVOKE_AFTER_MS = 60_000;

/**
 * Release the object URL, but not in the same task that clicked the anchor.
 *
 * Revoking beside `click()` is the common shortcut and it races the browser: the download may still
 * be reading the blob when the URL goes away, and the reader gets an empty file and a button that
 * says Downloaded. A single task later — `setTimeout(…, 0)` — was the first fix and is still a
 * race, because nothing promises the read has started by then. A minute is not a guess at the read
 * time; it is long enough that no read is outstanding, and the cost of holding one recovery file's
 * bytes that long is a few kilobytes of somebody's own prose.
 *
 * Never cleared, deliberately: an unmounted component must still give the URL back, and this
 * touches no React state, so it is safe to let it run.
 */
function revokeSoon(href: string): void {
  setTimeout(() => {
    if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(href);
  }, REVOKE_AFTER_MS);
}
