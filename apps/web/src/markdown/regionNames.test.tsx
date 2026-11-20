import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria AX6 and AX7 in docs/specs/accessibility-pass.md: what a screen reader is told a table or
 * a code sample is.
 *
 * A screen reader lists a page's regions by name so its reader can jump between them. Before this
 * slice every table was "Table" and every TypeScript sample "ts sample", so that list was a column
 * of identical words (axe-core `landmark-unique`, 260 nodes across the app). Names across the
 * several Markdown places of one lesson page are lessonRegionNames.test.tsx.
 *
 * Mermaid is mocked as in MermaidDiagram.test.tsx: jsdom cannot lay out SVG. The diagram's source
 * block is in the document from the first render (shown while drawing, then under the disclosure),
 * so names are read synchronously.
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
    svg: '<svg id="m" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>x</text></svg>',
  });
});

afterEach(cleanup);

function md(...lines: string[]): string {
  return lines.join('\n');
}

function names(container: HTMLElement, selector: string): string[] {
  return [...container.querySelectorAll(selector)].map(
    (one) => one.getAttribute('aria-label') ?? '',
  );
}

const TABLES = '.table-scroll[role="region"]';
const CODE = 'pre[role="region"]';

const THREE_TABLES = md(
  '| Method | Path |',
  '| --- | --- |',
  '| GET | / |',
  '',
  'Between the tables.',
  '',
  '| Method | Path |',
  '| --- | --- |',
  '| HEAD | /menu |',
  '',
  '| Status | Meaning |',
  '| --- | --- |',
  '| 404 | Not found |',
);

describe('tables (AX6)', () => {
  it('names each table by its place and its header cells, so no two share a name', () => {
    const { container } = render(<LessonMarkdown markdown={THREE_TABLES} />);

    expect(names(container, TABLES)).toEqual([
      'Table 1: Method, Path',
      'Table 2: Method, Path',
      'Table 3: Status, Meaning',
    ]);
  });

  it('names a table whose header cells are empty by its place alone', () => {
    const { container } = render(
      <LessonMarkdown markdown={md('|  |  |', '| --- | --- |', '| a | b |')} />,
    );

    expect(names(container, TABLES)).toEqual(['Table 1']);
  });

  it('takes only the text of header cells that carry markup', () => {
    const { container } = render(
      <LessonMarkdown markdown={md('| **Path** | `status` |', '| --- | --- |', '| / | 200 |')} />,
    );

    expect(names(container, TABLES)).toEqual(['Table 1: Path, status']);
  });
});

describe('code samples (AX7)', () => {
  const FENCES = md(
    '```ts',
    'const a = 1;',
    '```',
    '',
    '```mermaid',
    'sequenceDiagram',
    '    A->>B: hello',
    '```',
    '',
    '```ts title="server.ts"',
    'const a = 1;',
    '```',
    '',
    '```',
    'plain output',
    '```',
    '',
    '```mermaid',
    'sequenceDiagram',
    '    B->>A: bye',
    '```',
    '',
    '```TS',
    'const b = 2;',
    '```',
  );

  it('names each code block by its place and language, and each diagram’s source by its own', () => {
    const { container } = render(<LessonMarkdown markdown={FENCES} />);

    expect(names(container, CODE)).toEqual([
      'Code sample 1, ts',
      'Source of diagram 1',
      'Code sample 2, ts',
      'Code sample 3',
      'Source of diagram 2',
      'Code sample 4, TS',
    ]);
  });
});

describe('the same names on every render (AX6, AX7)', () => {
  it('keeps the names when the same Markdown renders again', () => {
    const view = render(<LessonMarkdown markdown={md(THREE_TABLES, '', '```ts', 'x', '```')} />);
    const first = [...names(view.container, TABLES), ...names(view.container, CODE)];

    view.rerender(<LessonMarkdown markdown={md(THREE_TABLES, '', '```ts', 'x', '```')} />);

    expect([...names(view.container, TABLES), ...names(view.container, CODE)]).toEqual(first);
    expect(first).toEqual([
      'Table 1: Method, Path',
      'Table 2: Method, Path',
      'Table 3: Status, Meaning',
      'Code sample 1, ts',
    ]);
  });

  it('keeps the names under StrictMode, which renders twice', () => {
    const { container } = render(
      <StrictMode>
        <LessonMarkdown markdown={md(THREE_TABLES, '', '```ts', 'x', '```')} />
      </StrictMode>,
    );

    expect([...names(container, TABLES), ...names(container, CODE)]).toEqual([
      'Table 1: Method, Path',
      'Table 2: Method, Path',
      'Table 3: Status, Meaning',
      'Code sample 1, ts',
    ]);
  });
});
