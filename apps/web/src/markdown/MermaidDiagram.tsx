import { useEffect, useId, useState, type ReactNode } from 'react';

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
    `html,body{margin:0;padding:0;background:${pageColour('--paper', 'transparent')};`,
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
  children,
}: {
  readonly source: string;
  readonly children: ReactNode;
}) {
  const [drawing, setDrawing] = useState<Drawing>({ state: 'pending' });
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const [dark, setDark] = useState(prefersDark);

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
    const frameId = `mermaid-${id}`;

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

  if (drawing.state === 'pending') return <div className="diagram">{children}</div>;

  if (drawing.state === 'refused') {
    return (
      <div className="diagram">
        <p role="status" className="notice diagram-notice">
          This diagram could not be drawn, so its source is shown below.
        </p>
        {children}
        <details className="diagram-reason">
          <summary>Why it could not be drawn</summary>
          <pre className="code-block-text" tabIndex={0}>
            {drawing.reason}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="diagram">
      <div className="diagram-scroll" tabIndex={0} role="region" aria-label={drawing.title}>
        <iframe
          title={drawing.title}
          sandbox=""
          srcDoc={drawing.document}
          width={drawing.size.width}
          height={drawing.size.height}
          loading="lazy"
        />
      </div>
      <details className="diagram-source">
        <summary>Show diagram source</summary>
        {children}
      </details>
    </div>
  );
}
