import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

/**
 * One authored `mermaid` fence, drawn as a picture when Mermaid can draw it.
 *
 * The contract is docs/specs/mermaid-diagrams.md; the reasoning is ADR 0008. Two things about
 * this component are load-bearing rather than incidental:
 *
 * **The drawing never enters this document.** Mermaid's only output is an SVG *string*, and
 * ADR 0007 promises that no DOM in this application is ever constructed from markup. The string
 * therefore goes into `srcDoc` — an ordinary attribute — on an iframe whose `sandbox` grants
 * nothing at all. Whatever Mermaid emits is a separate, fully restricted document.
 *
 * **`children` is the fallback, and it is what renders first.** It is the labelled code block the
 * Markdown renderer already produces, so there is no moment at which the author's diagram source
 * is absent from the page, and a diagram that cannot be drawn loses nothing.
 */

/** The page's own colours, resolved: CSS custom properties do not cross an iframe boundary. */
function pageColour(name: string, fallback: string): string {
  if (typeof getComputedStyle !== 'function') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value === '' ? fallback : value;
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches === true;
}

/**
 * The drawing's natural size, read off the `viewBox` Mermaid writes.
 *
 * An iframe has no intrinsic height, and a document with no scripts cannot report its own. The
 * viewBox is the only description of the drawing's shape available before it is displayed, so a
 * drawing without one is treated as undrawable rather than shown in a box of guessed size.
 */
function naturalSize(svg: string): { width: number; height: number } | undefined {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const parts =
    viewBox
      ?.trim()
      .split(/[\s,]+/)
      .map(Number) ?? [];
  if (parts.length !== 4) return;

  const width = parts[2];
  const height = parts[3];
  if (width === undefined || height === undefined) return;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
  return { width: Math.ceil(width), height: Math.ceil(height) };
}

/** "Sequence diagram" rather than "Diagram", taken from what Mermaid says it drew. */
function frameTitle(svg: string): string {
  const kind = /aria-roledescription="([^"]+)"/.exec(svg)?.[1]?.trim();
  return kind ? `${kind.charAt(0).toUpperCase()}${kind.slice(1)} diagram` : 'Diagram';
}

/**
 * The document the frame shows: a style block and the drawing, and deliberately no script.
 *
 * The SVG is pinned to its natural size because the frame is already that size — Mermaid's own
 * `width="100%"` and `max-width` would otherwise let it reflow inside a box built for it.
 */
function frameDocument(svg: string, size: { width: number; height: number }): string {
  return [
    '<!doctype html><meta charset="utf-8"><style>',
    `html,body{margin:0;padding:0;background:${pageColour('--card', 'transparent')};`,
    'overflow:hidden;}',
    `svg{display:block;width:${size.width}px;height:${size.height}px;max-width:none;}`,
    '</style>',
    svg,
  ].join('');
}

type Drawing =
  /** Nothing attempted yet, or attempted and superseded: `children` is on the page. */
  | { readonly state: 'pending' }
  | {
      readonly state: 'drawn';
      readonly document: string;
      readonly title: string;
      readonly size: { readonly width: number; readonly height: number };
    }
  | { readonly state: 'refused'; readonly reason: string };

const NO_DIMENSIONS =
  'The diagram was drawn, but it carries no readable dimensions, so it cannot be sized.';

export function MermaidDiagram({
  source,
  describedBy,
  children,
}: {
  readonly source: string;
  /** The id of the author's "In words:" paragraph after this diagram, when there is one (AX9). */
  readonly describedBy?: string | undefined;
  readonly children: ReactNode;
}) {
  const [drawing, setDrawing] = useState<Drawing>({ state: 'pending' });
  const refused = drawing.state === 'refused';
  const drawn = drawing.state === 'drawn';
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [dark, setDark] = useState(prefersDark);
  // Counts draws, not diagrams. `useId` is stable for the component's life, and a draw that is
  // still running when the next one starts must not share its id — see the effect below.
  const draws = useRef(0);

  /**
   * Which way the diagram still has content the reader cannot see.
   *
   * Tracked rather than painted unconditionally, so the hint never claims there is more diagram
   * when the whole of it already fits — which is the usual state on a desktop column and would
   * make the cue meaningless where it matters, on a phone.
   */
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const node = scroller.current;
    if (!node) return;

    const update = () => {
      const hidden = node.scrollWidth - node.clientWidth;
      setEdges({ left: node.scrollLeft > 1, right: node.scrollLeft < hidden - 1 });
    };
    update();

    node.addEventListener('scroll', update, { passive: true });
    // The frame's width is fixed, but the column's is not: a rotation or a resize can take the
    // diagram from overflowing to fitting, and the cue has to follow.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : undefined;
    observer?.observe(node);

    return () => {
      node.removeEventListener('scroll', update);
      observer?.disconnect();
    };
  }, [drawn]);

  // The reader has no theme control, so the diagram follows the system the page follows. A drawing
  // made for the other scheme is dark on dark, which is the same as no diagram at all.
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // The in-flight guard. Drawing is several awaits long, and both the source and the colour
    // scheme can change while it runs; without this, a superseded drawing overwrites a current one
    // and the page shows a picture of something that is no longer on it.
    let current = true;

    // A new id for every draw, never one per component. Mermaid's `render` opens by deleting
    // `#<id>`, `#d<id>` and `#i<id>` (mermaid.core.mjs:1256), so two draws that share an id
    // destroy each other's working nodes: the first then throws on a node the second removed, and
    // the second throws on a node the first's cleanup removed. Both fail, and a perfectly valid
    // diagram reports that it could not be drawn. Cancelling is not available — `render` cannot be
    // aborted — so the two are kept apart instead.
    draws.current += 1;
    const frameId = `mermaid-${id}-${draws.current}`;

    const draw = async () => {
      setDrawing({ state: 'pending' });
      try {
        const { default: mermaid } = await import('mermaid');
        if (!current) return;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: dark ? 'dark' : 'default',
        });

        // Asked without `suppressErrors` on purpose: that option replaces the parser's message
        // with a bare `false`, and the message is the only thing that tells a reviewer which line
        // was refused. Asked at all because `render` on bad source leaves its error graphic in
        // document.body, and this keeps the failure path off the page entirely.
        await mermaid.parse(source);
        if (!current) return;

        const { svg } = await mermaid.render(frameId, source);
        if (!current) return;

        const size = naturalSize(svg);
        if (!size) {
          setDrawing({ state: 'refused', reason: NO_DIMENSIONS });
          return;
        }
        setDrawing({
          state: 'drawn',
          document: frameDocument(svg, size),
          title: frameTitle(svg),
          size,
        });
      } catch (failure) {
        // The second mechanism, kept because the first is one bug from being no guarantee: if
        // `render` did run and throw, Mermaid has left its measuring div behind in document.body.
        // Safe to do before the `current` check only because the id belongs to this draw alone.
        document.getElementById(`d${frameId}`)?.remove();
        if (!current) return;
        setDrawing({
          state: 'refused',
          reason: failure instanceof Error ? failure.message : String(failure),
        });
      }
    };

    void draw();
    return () => {
      current = false;
    };
  }, [source, dark, id]);

  /**
   * Mounted in every state, empty until there is something to say.
   *
   * A live region that arrives already holding its text is generally not announced: screen readers
   * watch regions that were present when the page settled, and one inserted together with its
   * content reads as ordinary new markup. Drawing finishes after the first paint, so the region has
   * to be here from the start for the failure to be heard rather than merely seen. `:empty` in the
   * stylesheet takes away its box; it is not hidden, because a hidden region is not watched either.
   */
  const announcement = (
    <p role="status" className={refused ? 'notice diagram-notice' : 'diagram-notice'}>
      {refused ? 'This diagram could not be drawn, so its source is shown below.' : ''}
    </p>
  );

  if (drawing.state === 'pending') {
    return (
      <div className="diagram">
        {announcement}
        {children}
      </div>
    );
  }

  if (drawing.state === 'refused') {
    return (
      <div className="diagram">
        {announcement}
        {children}
        <details className="diagram-reason">
          <summary>Why it could not be drawn</summary>
          {/* Attributed, because the box below uses the same monospace treatment as the source
              above it and would otherwise read as a second sample rather than an explanation. */}
          <p className="diagram-reason-lead">Mermaid’s parser said:</p>
          <pre className="code-block-text" tabIndex={0}>
            {drawing.reason}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="diagram">
      {announcement}
      {/*
        The shadows live out here, over the frame rather than behind it. A code block can paint
        them as its own background because its content is text and lets them through; an iframe is
        opaque and covers anything behind it, so at 375px the diagram was cut off at a plain border
        with nothing to say it continued.
      */}
      <div
        className={`diagram-frame${edges.left ? ' has-left' : ''}${edges.right ? ' has-right' : ''}`}
      >
        <div
          className="diagram-scroll"
          tabIndex={0}
          role="region"
          aria-label={drawing.title}
          aria-describedby={describedBy}
          ref={scroller}
        >
          {/*
            Out of the tab order on purpose. `sandbox=""` means nothing inside can ever be
            interactive, so focusing the frame does nothing a reader can see — it has no focus ring
            of its own — and costs a silent Tab press between the scroll box and the disclosure. Its
            `title` stays: it names the frame for a screen reader reaching it any other way.
          */}
          <iframe
            title={drawing.title}
            sandbox=""
            srcDoc={drawing.document}
            width={drawing.size.width}
            height={drawing.size.height}
            loading="lazy"
            tabIndex={-1}
          />
        </div>
      </div>
      <details className="diagram-source">
        <summary>Show diagram source</summary>
        {children}
      </details>
    </div>
  );
}
