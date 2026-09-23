import { useEffect, useRef, useState } from 'react';

/**
 * The Copy button that sits on every fenced code block.
 *
 * What it does is narrow on purpose. The handoff asks for a button that "copies exactly the command
 * or code shown", and this app never runs lesson code (ADR 0005): this writes `source` to the
 * clipboard and does nothing else — no request, no navigation, no record, no change to the sample.
 *
 * `source` is the text read off the mdast tree, not off the rendered children, so what lands on the
 * clipboard is what the author typed down to the last space. Re-deriving it from the DOM would mean
 * trusting React's text nodes to have preserved whitespace that is load-bearing in an HTTP message.
 */

/** How long "Copied" stays up before the button offers Copy again. */
const SETTLE_MS = 2000;

type State = 'idle' | 'copied' | 'failed';

export function CopyBlock({
  source,
  language,
}: {
  readonly source: string;
  /** The fence's info string, or undefined for a bare fence. Names the sample for a screen reader. */
  readonly language: string | undefined;
}) {
  const [state, setState] = useState<State>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  async function copy(): Promise<void> {
    if (timer.current !== null) clearTimeout(timer.current);
    try {
      // Read at press time, not at mount: a clipboard can be absent over plain HTTP and can be
      // denied by permission, and either way the answer belongs to this press.
      const clipboard = navigator.clipboard;
      if (!clipboard?.writeText) throw new Error('This browser gave the page no clipboard.');
      await clipboard.writeText(source);
      setState('copied');
    } catch {
      // Named, never swallowed. A button that reports nothing is a button the reader believes
      // worked — the same false success ADR 0004 forbids for saves, in a smaller place.
      setState('failed');
    }
    timer.current = setTimeout(() => setState('idle'), SETTLE_MS);
  }

  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Copy';
  const what = language ? `the ${language} sample` : 'this sample';

  return (
    <button
      // Explicit, because a button inside anything that becomes a form defaults to submit.
      type="button"
      className="code-block-copy"
      // The visible word is the same on 160 buttons; the accessible name says which sample, so a
      // screen reader is not read the word "Copy" over and over with nothing to tell them apart.
      aria-label={`${label} ${what}`}
      data-state={state}
      onClick={() => void copy()}
    >
      {label}
    </button>
  );
}
