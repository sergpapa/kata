import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criterion AX7 for a diagram once drawn (docs/specs/accessibility-pass.md; `/code-review`
 * finding). The drawn picture is its own region, and it was named only by its kind — "Flowchart
 * diagram" — so two drawn diagrams on one lesson page shared a name, the defect AX7 exists to end.
 *
 * Diagrams are mounted one after another, as in diagramDescription.test.tsx: two simultaneous
 * imports of a mocked module reach the real package under vitest 5.
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
  mermaid.parse.mockReset().mockResolvedValue({ diagramType: 'flowchart-v2', config: {} });
  mermaid.render.mockReset().mockResolvedValue({
    svg:
      '<svg id="m-1" width="100%" xmlns="http://www.w3.org/2000/svg" style="max-width: 755px;" ' +
      'viewBox="0 0 755 495" aria-roledescription="flowchart-v2"><g><text>B</text></g></svg>',
  });
});

afterEach(cleanup);

const DIAGRAM = ['```mermaid', 'flowchart TD', '    A --> B', '```'].join('\n');

async function drawnNames(container: HTMLElement, count: number): Promise<string[]> {
  return waitFor(() => {
    const found = container.querySelectorAll('.diagram-scroll[role="region"]');
    expect(found).toHaveLength(count);
    return [...found].map((one) => one.getAttribute('aria-label') ?? '');
  });
}

describe('a drawn diagram’s name (AX7)', () => {
  it('numbers each drawn diagram, so two on one page never share a name', async () => {
    const view = render(<LessonMarkdown markdown={DIAGRAM} />);
    const [first] = await drawnNames(view.container, 1);
    view.rerender(<LessonMarkdown markdown={`${DIAGRAM}\n\nBetween.\n\n${DIAGRAM}`} />);

    const names = await drawnNames(view.container, 2);

    // The kind Mermaid reported (the frame's title, from aria-roledescription) follows the number.
    expect(first).toBe('Diagram 1: Flowchart-v2 diagram');
    expect(names).toEqual(['Diagram 1: Flowchart-v2 diagram', 'Diagram 2: Flowchart-v2 diagram']);
  });

  it('says where it is when it is not in the lesson body', async () => {
    const view = render(
      <LessonMarkdown markdown={DIAGRAM} place="Claude’s reply 2 on Practice A" />,
    );

    const [name] = await drawnNames(view.container, 1);

    expect(name).toBe('Diagram 1: Flowchart-v2 diagram in Claude’s reply 2 on Practice A');
  });
});
