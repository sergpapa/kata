import { useCopyToClipboard } from '../clipboard.js';

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

export function CopyBlock({
  source,
  language,
}: {
  readonly source: string;
  /** The fence's info string, or undefined for a bare fence. Names the sample for a screen reader. */
  readonly language: string | undefined;
}) {
  // Shared with the recovery controls on a failed save since slice 13. Every decision this button
  // paid for — the press-time read, the named refusal, the timer cleared on the way out — now lives
  // in `clipboard.ts`, and this file's own tests are what prove the move changed nothing.
  const { state, copy } = useCopyToClipboard();

  const label = state === 'copied' ? 'Copied' : state === 'failed' ? 'Could not copy' : 'Copy';
  const what = language ? `the ${language} sample` : 'this sample';
  // The sample's own first line, so four consecutive `javascript` buttons do not all announce the
  // identical name. Trimmed short: this is a label, not the sample.
  const opening = source.trim().split(/\r?\n/)[0]?.slice(0, 40).trim();

  return (
    <>
      <button
        // Explicit, because a button inside anything that becomes a form defaults to submit.
        type="button"
        className="code-block-copy"
        // The visible word is the same on 155 buttons; the accessible name says which sample.
        aria-label={opening ? `${label} ${what} starting ${opening}` : `${label} ${what}`}
        data-state={state}
        onClick={() => copy(source)}
      >
        {label}
      </button>
      {/* The app's own convention for an async control's outcome (ResponseField does the same, and
          for the same reason): whether a screen reader re-announces a focused button's own label
          when that label changes varies by reader, and "Copied" against "Could not copy" is the
          whole feedback there is.

          Rendered only while there is something to say, unlike ResponseField's. There are twelve of
          those on a lesson and up to 23 of these, and a page holding 23 permanently empty live
          regions is machinery in its own right — one of which would sit inside every refused
          diagram's fallback, beside the announcement that fallback already makes. */}
      {state !== 'idle' && (
        <span className="visually-hidden" role="status">{`${label} ${what}`}</span>
      )}
    </>
  );
}
