import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criterion AX9 in docs/specs/accessibility-pass.md: a drawn diagram is described by the author's
 * own "In words:" paragraph, and by nothing else.
 *
 * Every lesson diagram is followed by a paragraph that says it in words. Linking the two lets a
 * screen reader read that paragraph as the diagram's description; linking the wrong paragraph, or
 * one the author did not write as a description, would tell the reader something false.
 *
 * Mermaid is mocked as in MermaidDiagram.test.tsx. Two-diagram cases mount the second diagram after
 * the first has drawn (`firstThenBoth`): under vitest 5, two simultaneous `import('mermaid')` calls
 * reach the real package, which cannot load in Node, even after the mock has been imported once. A
 * browser shares one module, so this staging is the harness's, not the app's.
 *
 * The "described by nothing else" cases pass before any implementation exists, because nothing
 * writes a description yet: they are guards against an implementation that describes too much, and
 * only become meaningful once one exists. They do wait for the diagram to draw.
 */

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }),
  });
  mermaid.parse.mockReset().mockResolvedValue({ diagramType: 'sequence', config: {} });
  mermaid.render.mockReset().mockResolvedValue({
    svg:
      '<svg id="m-1" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width: 755px;" ' +
      'viewBox="-50 -10 755 495" role="graphics-document document"><g><text>B</text></g></svg>',
  });
});

afterEach(cleanup);

function md(...lines: string[]): string {
  return lines.join('\n');
}

const DIAGRAM = md('```mermaid', 'sequenceDiagram', '    Reader->>Browser: Open the menu', '```');

/** Every drawn diagram's region, once `count` of them have drawn. */
async function drawn(container: HTMLElement, count: number): Promise<HTMLElement[]> {
  return waitFor(() => {
    const found = container.querySelectorAll<HTMLElement>('.diagram-scroll[role="region"]');
    expect(found).toHaveLength(count);
    return [...found];
  });
}

/** Renders `first` (one diagram), waits for it to draw, then renders `both`; returns both regions. */
async function firstThenBoth(first: string, both: string): Promise<HTMLElement[]> {
  const view = render(<LessonMarkdown markdown={first} />);
  await drawn(view.container, 1);
  view.rerender(<LessonMarkdown markdown={both} />);
  return drawn(view.container, 2);
}

function description(region: HTMLElement): string | null {
  const ids = (region.getAttribute('aria-describedby') ?? '').split(' ').filter(Boolean);
  if (ids.length === 0) return null;
  expect(ids).toHaveLength(1);
  return document.getElementById(ids[0] as string)?.textContent ?? 'MISSING';
}

describe('described by its own In words paragraph (AX9)', () => {
  it('is described by the paragraph that immediately follows it', async () => {
    const { container } = render(
      <LessonMarkdown markdown={md(DIAGRAM, '', 'In words: you open an address.')} />,
    );

    const [region] = await drawn(container, 1);
    expect(description(region as HTMLElement)).toBe('In words: you open an address.');
    const id = (region as HTMLElement).getAttribute('aria-describedby') as string;
    expect(document.getElementById(id)?.tagName).toBe('P');
  });

  it('gives two diagrams their own paragraphs', async () => {
    const regions = await firstThenBoth(
      md(DIAGRAM, '', 'In words: the first.'),
      md(DIAGRAM, '', 'In words: the first.', '', DIAGRAM, '', 'In words: the second.'),
    );

    expect(regions.map(description)).toEqual(['In words: the first.', 'In words: the second.']);
  });

  it('does not lend one diagram’s paragraph to the next diagram', async () => {
    const regions = await firstThenBoth(
      md(DIAGRAM, '', 'In words: the first.'),
      md(DIAGRAM, '', 'In words: the first.', '', DIAGRAM, '', 'Something else.'),
    );

    expect(regions.map(description)).toEqual(['In words: the first.', null]);
  });
});

describe('described by nothing else (AX9)', () => {
  it.each([
    ['an unrelated paragraph follows', md(DIAGRAM, '', 'A paragraph about something else.')],
    [
      'another element comes between',
      md(DIAGRAM, '', '- a list item', '', 'In words: after a list.'),
    ],
    ['the paragraph comes before the diagram', md('In words: before it.', '', DIAGRAM)],
    ['the words are lowercase', md(DIAGRAM, '', 'in words: lowercase.')],
    ['the colon is missing', md(DIAGRAM, '', 'In words the colon is missing.')],
    ['the diagram ends the lesson', DIAGRAM],
  ])('has no description when %s', async (_, source) => {
    const { container } = render(<LessonMarkdown markdown={source} />);

    const [region] = await drawn(container, 1);
    expect(description(region as HTMLElement)).toBeNull();
  });
});
