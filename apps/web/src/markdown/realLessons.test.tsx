import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria D in docs/specs/markdown-rendering.md and C5–C6 in
 * docs/specs/content-release-first-thirteen.md: the renderer against the author's own files, read
 * from disk. A fixture proves the contract; only the real release proves the contract covers what
 * the author actually wrote.
 *
 * The file list comes from the release manifest rather than being written out here, so this suite
 * cannot quietly cover less than the release: a fourteenth lesson joins it on arrival.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const releaseDir = path.join(
  repoRoot,
  'HTTP_Caching_Lessons_09_13_v1/http-lessons-09-13-release-v1/content',
);
const lessonsDir = path.join(releaseDir, 'lessons');

const lessonFiles = (
  JSON.parse(fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8')) as {
    lessons: { path: string }[];
  }
).lessons.map((entry) => path.basename(entry.path));

/**
 * Cuts the front matter and the title heading the way the server does before serving a body.
 * Duplicated here on purpose: this suite exercises the client renderer, and importing across the
 * workspace boundary to reuse six lines would tie the client to the server's module graph.
 */
function bodyOf(file: string): string {
  const source = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
  const closing = source.indexOf('\n---', 4);
  const body = source.slice(source.indexOf('\n', closing + 1) + 1);
  const lines = body.split('\n');
  const title = lines.findIndex((line) => line.startsWith('# '));
  if (title >= 0) lines.splice(title, 1);
  return lines.join('\n');
}

function renderLesson(file: string): HTMLElement {
  return render(<LessonMarkdown markdown={bodyOf(file)} />).container;
}

afterEach(cleanup);

describe('the thirteen authored lessons', () => {
  it('has all thirteen files where the release puts them', () => {
    expect(lessonFiles).toHaveLength(13);
    for (const file of lessonFiles) {
      expect(fs.existsSync(path.join(lessonsDir, file))).toBe(true);
    }
  });

  it.each(lessonFiles)('renders %s as prose, headings and blocks', (file) => {
    const container = renderLesson(file);

    expect(container.querySelectorAll('h2').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('p').length).toBeGreaterThan(10);
    expect(container.textContent?.length ?? 0).toBeGreaterThan(2000);
  });

  it.each(lessonFiles)('leaves the title of %s to the page, not to the body', (file) => {
    expect(renderLesson(file).querySelector('h1')).toBeNull();
  });

  it.each(lessonFiles)('leaves no YAML front matter visible in %s', (file) => {
    const container = renderLesson(file);

    expect(container.textContent).not.toContain('candidate_lesson_id');
    expect(container.textContent).not.toContain('document_id');
  });
});

describe('Lesson 3, which teaches HTML', () => {
  it('shows its HTML examples as code and builds no page elements from them', () => {
    const container = renderLesson('HTTP_Lesson_03_Student_Edition_v1.md');

    const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    expect(headings.map((heading) => heading.textContent)).not.toContain('Cafe menu');
    expect(container.querySelector('title')).toBeNull();
    expect(container.textContent).toContain('<h1>Cafe menu</h1>');
    expect(container.textContent).toContain('<li>Tea</li>');
  });

  it('keeps the two table cells that hold HTML tags as code, not as elements', () => {
    const container = renderLesson('HTTP_Lesson_03_Student_Edition_v1.md');

    const cellText = [...container.querySelectorAll('td code')].map((cell) => cell.textContent);
    expect(cellText).toContain('<head> ... </head>');
    expect(cellText).toContain('<body> ... </body>');
  });
});

describe('Lesson 2, the handoff’s own inspection check', () => {
  it('shows its tables, its terminal commands and its multiline sample output', () => {
    const container = renderLesson('HTTP_Lesson_02_Student_Edition_v1.md');

    expect(container.querySelectorAll('table').length).toBeGreaterThan(0);

    const blocks = [...container.querySelectorAll('pre')].map((block) => block.textContent ?? '');
    expect(blocks.some((text) => text.includes('node server.mjs'))).toBe(true);
    expect(
      blocks.some(
        (text) =>
          text.includes('Cafe server is listening on http://127.0.0.1:4312') &&
          text.includes('To stop: focus this terminal and press Ctrl+C.'),
      ),
    ).toBe(true);
  });
});

describe('Lesson 1, whose request example depends on a blank line', () => {
  it('keeps the blank line that separates the request headers from the body', () => {
    const container = renderLesson('HTTP_Lesson_01_Student_Edition_v2.md');

    const request = [...container.querySelectorAll('pre')]
      .map((block) => block.textContent ?? '')
      .find((text) => text.startsWith('GET /menu HTTP/1.1'));

    expect(request).toBe('GET /menu HTTP/1.1\nHost: cafe.example\n\n');
  });
});

/**
 * Criteria F6 and P1 in docs/specs/mermaid-diagrams.md, against the author's own bytes.
 *
 * What this suite can and cannot say, stated precisely, because an earlier version of this comment
 * claimed more than the tests underneath it proved:
 *
 * Mermaid is not mocked here, but the first two tests assert *before* it has done anything —
 * `import('mermaid')` defers to a microtask, so they read the component's opening state. That is
 * the point rather than a flaw: they pin F6, that the author's source is on the page from the first
 * paint and never absent, and P1, that the prose sits directly after the diagram. Both hold against
 * the real lesson files.
 *
 * The third test waits for a terminal state, and it is the only one here that exercises the real
 * library. jsdom has no SVG layout, so the draw must end in the refusal path — criterion F5. It
 * asserts that the component actually *reaches* an end rather than sitting in `pending` forever,
 * which is the failure the earlier version could not have seen: `children` renders in all three
 * states, so "the source is on the page" was true no matter what the library did, or whether it
 * ran at all.
 *
 * That a diagram genuinely becomes a picture is checked by tools/screenshots.mjs in a real browser.
 * jsdom cannot answer that question and nothing here pretends to.
 *
 * (Supersedes slice 2's criterion D4, which required every fence to stay a labelled source
 * block. Four of the five now become pictures where a browser can draw them; Lesson 2's keeps
 * its honest fallback until CF-001 is accepted in a reissued release.)
 */
/**
 * The five lessons that carry a Mermaid fence, and where each one's equivalent textual account
 * sits. Lessons 1, 2, 5 and 6 put an "In words:" paragraph directly after the fence; Lesson 11
 * introduces its diagram in the paragraph directly before it. The authoring standard requires the
 * account ("provide an equivalent textual account"), not a fixed position, so the assertion
 * follows the author.
 */
const diagramLessons = [
  { file: 'HTTP_Lesson_01_Student_Edition_v2.md', grammar: 'sequenceDiagram', account: 'after' },
  { file: 'HTTP_Lesson_02_Student_Edition_v1.md', grammar: 'sequenceDiagram', account: 'after' },
  { file: 'HTTP_Lesson_05_Student_Edition_v1.md', grammar: 'sequenceDiagram', account: 'after' },
  { file: 'HTTP_Lesson_06_Student_Edition_v1.md', grammar: 'flowchart', account: 'after' },
  { file: 'HTTP_Lesson_11_Student_Edition_v1.md', grammar: 'sequenceDiagram', account: 'before' },
] as const;

/** The exact bytes between the fences, which is what the reader must be able to get back to. */
function mermaidSourceOf(file: string): string {
  const text = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
  const start = text.indexOf('```mermaid\n') + '```mermaid\n'.length;
  return text.slice(start, text.indexOf('\n```', start) + 1);
}

describe('the five Mermaid diagrams', () => {
  it.each(diagramLessons)('never leaves $file’s diagram source off the page', ({ file }) => {
    const container = renderLesson(file);

    const blocks = [...container.querySelectorAll('pre')].map((block) => block.textContent ?? '');
    expect(blocks).toContain(mermaidSourceOf(file));
  });

  it.each(diagramLessons)(
    'keeps $file’s textual account beside the diagram',
    ({ file, grammar, account }) => {
      const container = renderLesson(file);

      const diagram = [...container.querySelectorAll('.diagram')].find((element) =>
        (element.textContent ?? '').includes(grammar),
      );
      expect(diagram).toBeDefined();
      if (account === 'after') {
        expect(diagram?.nextElementSibling?.textContent).toMatch(/^In words:/);
      } else {
        expect(diagram?.previousElementSibling?.textContent).toMatch(/^The diagram shows/);
      }
    },
  );

  /**
   * The real library, doing its real thing. The generous budget is the honest cost of importing
   * Mermaid into jsdom, not cover for a race: there is one draw, nothing competes with it, and the
   * assertion is on the state it settles into rather than on how long it took to get there.
   */
  it('drives the real library to a stated outcome instead of sitting in limbo', async () => {
    const file = 'HTTP_Lesson_01_Student_Edition_v2.md';
    const container = renderLesson(file);

    const notice = await waitFor(
      () => {
        const status = container.querySelector('[role="status"]');
        expect(status?.textContent ?? '').toMatch(/could not be drawn/i);
        return status as HTMLElement;
      },
      { timeout: 20_000 },
    );

    expect(notice).not.toBeNull();
    const blocks = [...container.querySelectorAll('pre')].map((block) => block.textContent ?? '');
    expect(blocks).toContain(mermaidSourceOf(file));
  }, 30_000);
});
