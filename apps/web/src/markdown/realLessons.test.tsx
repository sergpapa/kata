import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria D in docs/specs/markdown-rendering.md: the renderer against the author's own five files,
 * read from disk. A fixture proves the contract; only the real release proves the contract covers
 * what the author actually wrote.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const lessonsDir = path.join(
  repoRoot,
  'VS_Code_App_and_First_Five_Lessons_v1/vs-code-first-five-v1/content/lessons',
);

const lessonFiles = [
  'HTTP_Lesson_01_Student_Edition_v2.md',
  'HTTP_Lesson_02_Student_Edition_v1.md',
  'HTTP_Lesson_03_Student_Edition_v1.md',
  'HTTP_Lesson_04_Student_Edition_v1.md',
  'HTTP_Lesson_05_Student_Edition_v1.md',
];

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

describe('the five authored lessons', () => {
  it('has all five files where the release puts them', () => {
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

    expect(request?.split('\n')).toEqual(['GET /menu HTTP/1.1', 'Host: cafe.example', '']);
  });
});

describe('the three Mermaid diagrams, before slice 3 renders them', () => {
  it.each([
    'HTTP_Lesson_01_Student_Edition_v2.md',
    'HTTP_Lesson_02_Student_Edition_v1.md',
    'HTTP_Lesson_05_Student_Edition_v1.md',
  ])('shows %s’s diagram source in a labelled block', (file) => {
    const container = renderLesson(file);

    const diagram = [...container.querySelectorAll('pre')]
      .map((block) => block.textContent ?? '')
      .find((text) => text.includes('sequenceDiagram'));

    expect(diagram).toBeDefined();
    expect(container.textContent).toContain('mermaid');
  });
});
