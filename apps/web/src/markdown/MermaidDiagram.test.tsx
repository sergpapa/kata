import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria M, F, I, P and L in docs/specs/mermaid-diagrams.md, driven through the renderer as a
 * black box: Markdown goes in, the document is inspected.
 *
 * Mermaid itself is mocked here because jsdom has no SVG layout and cannot draw a diagram at all.
 * That the three authored diagrams genuinely appear is checked by tools/screenshots.mjs in real
 * Chromium — the same split slice 2 used for criteria W2 and W3.
 */

const mermaid = vi.hoisted(() => ({
  initialize: vi.fn(),
  parse: vi.fn(),
  render: vi.fn(),
}));

vi.mock('mermaid', () => ({ default: mermaid }));

/**
 * jsdom 29 does not implement `window.matchMedia` at all, so every test that mounts a diagram
 * needs it. Stubbing it here rather than letting the component tolerate its absence means the
 * scheme branches below are genuinely exercised instead of silently defaulted.
 */
function stubColourScheme(dark: boolean): { change: (nowDark: boolean) => void } {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let matches = dark;

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      get matches() {
        return query.includes('dark') ? matches : !matches;
      },
      addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }),
  });

  return {
    change(nowDark: boolean) {
      matches = nowDark;
      for (const listener of listeners) listener({ matches: nowDark } as MediaQueryListEvent);
    },
  };
}

/** Shaped like Mermaid's real output: the id, the 100% width, the max-width style, the viewBox. */
const SVG =
  '<svg id="m-1" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width: 755px;" ' +
  'viewBox="-50 -10 755 495" role="graphics-document document" aria-roledescription="sequence">' +
  '<g><text>Browser</text></g></svg>';

const DIAGRAM_SOURCE = 'sequenceDiagram\n    Reader->>Browser: Open the menu address\n';

function md(...lines: string[]): string {
  return lines.join('\n');
}

/** A lesson fragment: the diagram, then the author's paragraph about it. */
function lessonWithDiagram(...source: string[]): string {
  return md(
    'Read this diagram from top to bottom.',
    '',
    '```mermaid',
    ...source,
    '```',
    '',
    'In words: you open an address; your browser asks the server for the menu.',
  );
}

const LESSON = lessonWithDiagram('sequenceDiagram', '    Reader->>Browser: Open the menu address');

function renderMarkdown(source: string): HTMLElement {
  return render(<LessonMarkdown markdown={source} />).container;
}

/**
 * Waits for the refusal to be announced.
 *
 * Asserts the live region's *text*, not its presence: the region is mounted in every state and
 * starts empty, because a live region inserted together with its content is generally not
 * announced at all.
 */
function refusal(): Promise<HTMLElement> {
  return waitFor(() => {
    const notice = screen.getByRole('status');
    expect(notice.textContent).toMatch(/could not be drawn/i);
    return notice;
  });
}

/** Waits for the async draw to settle, whichever way it settled. */
function diagramFrame(container: HTMLElement): Promise<HTMLIFrameElement> {
  return waitFor(() => {
    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    return frame as HTMLIFrameElement;
  });
}

beforeEach(() => {
  mermaid.initialize.mockReset();
  // Shaped like the real library: parse() resolves with the diagram type, and rejects with the
  // parser's own message for source it cannot read. `suppressErrors` is deliberately not used —
  // it would replace that message with a bare `false` (spec decision 5).
  mermaid.parse.mockReset().mockResolvedValue({ diagramType: 'sequence', config: {} });
  mermaid.render.mockReset().mockResolvedValue({ svg: SVG });
  stubColourScheme(false);
});

afterEach(cleanup);

describe('M — a diagram is drawn', () => {
  it('replaces the source block with a frame once the source parses', async () => {
    const container = renderMarkdown(LESSON);
    const frame = await diagramFrame(container);

    expect(frame.getAttribute('srcdoc')).toContain('<svg');
    const visibleBlocks = [...container.querySelectorAll('pre')].filter(
      (block) => block.closest('details') === null,
    );
    expect(visibleBlocks).toHaveLength(0);
  });

  it('denies the frame every permission and gives it an accessible name', async () => {
    const frame = await diagramFrame(renderMarkdown(LESSON));

    expect(frame.getAttribute('sandbox')).toBe('');
    expect(frame.getAttribute('title')).toMatch(/diagram/i);
  });

  it('injects no HTML string anywhere in the client source', () => {
    const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const offenders: string[] = [];
    // Matches the prop being *used* — `dangerouslySetInnerHTML={` or `:` — not the word itself,
    // which appears in the comments explaining why this application has none of them.
    const used = /dangerouslySetInnerHTML\s*[={:]/;

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
          if (used.test(fs.readFileSync(full, 'utf8'))) offenders.push(path.relative(srcDir, full));
        }
      }
    };
    walk(srcDir);

    expect(offenders).toEqual([]);
  });

  it('keeps the authored source reachable, character for character, behind a disclosure', async () => {
    const container = renderMarkdown(LESSON);
    await diagramFrame(container);

    const disclosure = container.querySelector('details');
    expect(disclosure?.querySelector('summary')?.textContent).toMatch(/source/i);
    expect(disclosure?.open).toBe(false);
    expect(disclosure?.querySelector('pre')?.textContent).toBe(DIAGRAM_SOURCE);
  });

  /**
   * Half of M5. This proves the library is never *used* by a lesson with no diagram; it cannot
   * prove the import is lazy, because `vi.mock` intercepts the module whether it is reached by a
   * top-level import or a dynamic one. The bundle check in tools/screenshots.mjs proves that half.
   */
  it('never uses Mermaid for a lesson that has no diagram', async () => {
    const container = renderMarkdown(
      md('A paragraph.', '', '```sh', 'node server.mjs', '```', '', 'Another paragraph.'),
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mermaid.parse).not.toHaveBeenCalled();
    expect(mermaid.render).not.toHaveBeenCalled();
    expect(container.querySelector('iframe')).toBeNull();
  });
});

describe('F — a diagram that cannot be drawn', () => {
  const PARSE_MESSAGE =
    "Parse error on line 15:\n...ed; the file remains    Learner->>Brows\n-----------------------^\nExpecting 'SOLID_ARROW', got 'NEWLINE'";

  /** Mermaid answers `false` from parse() for source it cannot read. */
  function refuseParse(): void {
    mermaid.parse.mockRejectedValue(new Error(PARSE_MESSAGE));
  }

  it('shows the labelled source block Mermaid refused, unchanged', async () => {
    refuseParse();
    const container = renderMarkdown(LESSON);

    await refusal();
    const block = container.querySelector('pre');
    expect(block?.textContent).toBe(DIAGRAM_SOURCE);
    expect(container.textContent).toContain('mermaid');
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('says the diagram could not be drawn, where assistive technology hears it', async () => {
    refuseParse();
    renderMarkdown(LESSON);

    const notice = await refusal();
    expect(notice.textContent).toMatch(/could not be drawn/i);
  });

  it('gives the parser its own words in full, not a summary', async () => {
    refuseParse();
    const container = renderMarkdown(LESSON);

    await refusal();
    const reason = [...container.querySelectorAll('pre')]
      .map((block) => block.textContent ?? '')
      .find((text) => text.includes('Parse error'));
    expect(reason).toBe(PARSE_MESSAGE);
  });

  it('never lets a refused diagram reach the call that leaves a mess', async () => {
    refuseParse();
    renderMarkdown(LESSON);

    await refusal();
    expect(mermaid.render).not.toHaveBeenCalled();
    expect(mermaid.parse).toHaveBeenCalledWith(DIAGRAM_SOURCE);
  });

  /**
   * The second of the two mechanisms spec decision 5 promises. Real Mermaid appends `div#d<id>`
   * to `document.body` while measuring and leaves it there when `render` throws, holding its
   * error-bomb graphic. The mock does exactly that, so deleting the cleanup fails this test.
   */
  it('sweeps up the error graphic Mermaid leaves behind when drawing throws', async () => {
    mermaid.render.mockImplementation((id: string) => {
      const leftover = document.createElement('div');
      leftover.id = `d${id}`;
      const errorSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      errorSvg.setAttribute('aria-roledescription', 'error');
      leftover.append(errorSvg);
      document.body.append(leftover);
      return Promise.reject(new Error('Cannot read properties of undefined (reading getBBox)'));
    });

    const container = renderMarkdown(LESSON);

    await refusal();
    expect(document.querySelectorAll('svg[aria-roledescription="error"]')).toHaveLength(0);
    expect(document.querySelectorAll('body > div[id^="d"]')).toHaveLength(0);
    expect(container.querySelector('pre')?.textContent).toBe(DIAGRAM_SOURCE);
  });

  it('falls back when Mermaid cannot be loaded at all', async () => {
    vi.resetModules();
    vi.doMock('mermaid', () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    const { LessonMarkdown: Fresh } = await import('./LessonMarkdown.js');

    const { container } = render(<Fresh markdown={LESSON} />);
    await refusal();
    expect(container.querySelector('pre')?.textContent).toBe(DIAGRAM_SOURCE);

    // Restored, not unmocked: vi.doUnmock('mermaid') removes the file-level vi.mock as well, and
    // every later test then imports the real library into jsdom and hangs.
    vi.doMock('mermaid', () => ({ default: mermaid }));
    vi.resetModules();
    // Warmed here, where there is no waitFor budget. Re-resolving the module graph after a reset
    // costs most of a second, and the next test to await a draw would otherwise spend its whole
    // timeout on this test's cleanup rather than on the behaviour it is checking.
    await import('mermaid');
  });

  it('shows the source block from the first paint, before any drawing is attempted', () => {
    const container = renderMarkdown(LESSON);

    expect(container.querySelector('pre')?.textContent).toBe(DIAGRAM_SOURCE);
  });

  it('falls back rather than guess when the drawing has no readable dimensions', async () => {
    mermaid.render.mockResolvedValue({ svg: '<svg xmlns="http://www.w3.org/2000/svg"></svg>' });
    const container = renderMarkdown(LESSON);

    await refusal();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe(DIAGRAM_SOURCE);
  });
});

describe('I — the diagram cannot reach the page', () => {
  it('initializes Mermaid in its strict configuration', async () => {
    await diagramFrame(renderMarkdown(LESSON));

    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ securityLevel: 'strict', startOnLoad: false }),
    );
  });

  it('keeps a script the drawing carries out of the host document', async () => {
    mermaid.render.mockResolvedValue({
      svg: SVG.replace('<g>', '<g><script>window.pwned = true;</script>'),
    });
    const container = renderMarkdown(LESSON);
    const frame = await diagramFrame(container);

    expect(document.querySelectorAll('script')).toHaveLength(0);
    expect((window as unknown as Record<string, unknown>).pwned).toBeUndefined();
    expect(frame.getAttribute('srcdoc')).toContain('window.pwned');
  });

  it('keeps an event handler attribute out of the host document', async () => {
    mermaid.render.mockResolvedValue({ svg: SVG.replace('<g>', '<g onclick="window.tapped=1">') });
    const container = renderMarkdown(LESSON);
    await diagramFrame(container);

    expect(container.querySelectorAll('[onclick]')).toHaveLength(0);
    expect(document.querySelectorAll('[onclick]')).toHaveLength(0);
  });

  it('writes no script of its own into the frame', async () => {
    const frame = await diagramFrame(renderMarkdown(LESSON));

    expect(frame.getAttribute('srcdoc')).not.toMatch(/<script/i);
  });
});

describe('P — the prose stays beside the diagram', () => {
  it('puts the author’s next paragraph directly after the drawn diagram', async () => {
    const container = renderMarkdown(LESSON);
    await diagramFrame(container);

    const frame = container.querySelector('iframe') as HTMLIFrameElement;
    const figure = frame.closest('.diagram');
    expect(figure?.nextElementSibling?.tagName).toBe('P');
    expect(figure?.nextElementSibling?.textContent).toMatch(/^In words:/);
    expect(figure?.previousElementSibling?.textContent).toMatch(/^Read this diagram/);
  });

  it('keeps the same adjacency when the diagram falls back to its source', async () => {
    mermaid.parse.mockRejectedValue(new Error('Parse error on line 2'));
    const container = renderMarkdown(LESSON);

    await refusal();
    const block = container.querySelector('.diagram');
    expect(block?.nextElementSibling?.textContent).toMatch(/^In words:/);
  });
});

describe('L — layout', () => {
  it('puts the diagram in a keyboard-reachable box that scrolls by itself', async () => {
    const container = renderMarkdown(LESSON);
    const frame = await diagramFrame(container);

    const scroller = frame.closest('.diagram-scroll');
    expect(scroller).not.toBeNull();
    expect(scroller?.getAttribute('tabindex')).toBe('0');
    expect(scroller?.getAttribute('role')).toBe('region');
  });

  it('sizes the frame from the drawing’s own viewBox', async () => {
    const frame = await diagramFrame(renderMarkdown(LESSON));

    expect(frame.getAttribute('width')).toBe('755');
    expect(frame.getAttribute('height')).toBe('495');
  });

  it('draws in the light theme when the page is light', async () => {
    stubColourScheme(false);
    const frame = await diagramFrame(renderMarkdown(LESSON));

    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'default' }));
    expect(frame.getAttribute('srcdoc')).toMatch(/background/);
  });

  it('draws in the dark theme when the page is dark', async () => {
    stubColourScheme(true);
    await diagramFrame(renderMarkdown(LESSON));

    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('draws the diagram again when the reader’s colour scheme changes', async () => {
    const scheme = stubColourScheme(false);
    const container = renderMarkdown(LESSON);
    await diagramFrame(container);
    expect(mermaid.render).toHaveBeenCalledTimes(1);

    scheme.change(true);

    await waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(2));
    expect(mermaid.initialize).toHaveBeenLastCalledWith(expect.objectContaining({ theme: 'dark' }));
  });

  it('still draws where the browser cannot report a colour scheme', async () => {
    Reflect.deleteProperty(window, 'matchMedia');

    const frame = await diagramFrame(renderMarkdown(LESSON));
    expect(frame.getAttribute('sandbox')).toBe('');
  });
});

describe('a result that arrives too late is not used', () => {
  /**
   * Without an in-flight guard the first draw writes its result after the source has already been
   * replaced, so the page shows a picture of a diagram that is no longer on it. Each call gets its
   * own promise and only the *first* is settled: with the guard nothing is written, without it the
   * stale drawing appears.
   */
  it('ignores a drawing whose source is no longer the one on the page', async () => {
    const settlers: ((value: { svg: string }) => void)[] = [];
    mermaid.render.mockImplementation(
      () =>
        new Promise<{ svg: string }>((resolve) => {
          settlers.push(resolve);
        }),
    );

    const { rerender, container } = render(<LessonMarkdown markdown={LESSON} />);
    await waitFor(() => expect(settlers).toHaveLength(1));

    rerender(
      <LessonMarkdown markdown={lessonWithDiagram('sequenceDiagram', '    C->>D: a later one')} />,
    );
    await waitFor(() => expect(settlers).toHaveLength(2));

    const stale = settlers[0];
    expect(stale).toBeDefined();
    stale?.({ svg: SVG });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(container.querySelector('iframe')).toBeNull();
  });

  /**
   * Mermaid's `render` opens by deleting `#<id>`, `#d<id>` and `#i<id>`, so two draws that share
   * an id delete each other's working nodes and both throw — reporting "could not be drawn" for a
   * diagram that is perfectly valid. Overlap is ordinary here: a colour-scheme flip re-runs the
   * draw while the previous one is still awaiting.
   */
  it('gives every draw its own Mermaid id, so two in flight cannot delete each other', async () => {
    const scheme = stubColourScheme(false);
    mermaid.render.mockImplementation(() => new Promise<{ svg: string }>(() => {}));

    render(<LessonMarkdown markdown={LESSON} />);
    await waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(1));

    scheme.change(true);
    await waitFor(() => expect(mermaid.render).toHaveBeenCalledTimes(2));

    const ids = mermaid.render.mock.calls.map((call: unknown[]) => call[0]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
