import { useEffect, useRef, useState } from 'react';

/**
 * Handing text to the clipboard, and saying honestly whether it landed.
 *
 * Extracted from `CopyBlock` in slice 13, when a second surface needed the same machine: the
 * recovery controls on a failed save. Nothing about it changed in the move, and
 * `CopyBlock.test.tsx` is what proves that — it was not edited.
 *
 * Every decision here was paid for once already and is easy to lose in a re-write:
 *
 * - The clipboard is read **at press time**, not at mount. It can be absent over plain HTTP and can
 *   be denied by permission, and either way the answer belongs to this press.
 * - A refusal is **named, never swallowed**. A button that reports nothing is a button the reader
 *   believes worked, which is the same false success ADR 0004 forbids for saves.
 * - The settle timer is cleared **on the way out, not the way in**. A second press while the first
 *   write is still in flight would otherwise leave the first press's timer running with nothing
 *   holding it, so it fires inside the second press's window and reports the second copy as over
 *   before it was.
 */

export type CopyState = 'idle' | 'copied' | 'failed';

/** How long the outcome stays up before the control offers Copy again. */
export const COPY_SETTLE_MS = 2000;

export function useCopyToClipboard(): {
  readonly state: CopyState;
  readonly copy: (text: string) => void;
} {
  const [state, setState] = useState<CopyState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  async function attempt(text: string): Promise<void> {
    try {
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) throw new Error('This browser gave the page no clipboard.');
      await clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), COPY_SETTLE_MS);
  }

  return { state, copy: (text: string) => void attempt(text) };
}
