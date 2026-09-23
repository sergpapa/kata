import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria C1–C7 in docs/specs/lab-downloads.md.
 *
 * The handoff's sentence is "A Copy button copies exactly the command or code shown", and the word
 * carrying the weight is *exactly*. These samples are HTTP messages and shell commands whose every
 * space and blank line is the lesson — a copy that trims, joins or adds a newline hands the reader
 * something that does not do what the page says it does. So the assertions here compare against the
 * authored bytes rather than against rendered text.
 *
 * The other half is what the button must *not* do. The app never runs lesson code (ADR 0005, and
 * four handoffs say so): pressing Copy writes to the clipboard and changes nothing else.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const lessonsDir = path.join(
  repoRoot,
  'content/releases/http-first-fifteen-v1_0_1/content/lessons',
);

function md(...lines: string[]): string {
  return lines.join('\n');
}

/** A clipboard that records, so a test can compare what was written character for character. */
function stubClipboard(): { written: string[]; fail?: boolean } {
  const state: { written: string[]; fail?: boolean } = { written: [] };
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: vi.fn(async (text: string) => {
        if (state.fail) throw new Error('Write permission denied.');
        state.written.push(text);
      }),
    },
  });
  return state;
}

function copyButtons(container: HTMLElement): HTMLButtonElement[] {
  return [...container.querySelectorAll<HTMLButtonElement>('.code-block button')];
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  // In afterEach, not at the end of the one test that installs them: a fake clock left running by a
  // test that failed makes `waitFor` in every later test wait for a clock nobody advances, and the
  // suite then reports three failures for one cause.
  vi.useRealTimers();
});

describe('every code block offers a copy', () => {
  it('puts a Copy button on each fenced block, whatever its language', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={md(
          '```sh',
          'node server.mjs',
          '```',
          '',
          '```http',
          'GET /api/menu HTTP/1.1',
          '```',
          '',
          '```json',
          '{ "ok": true }',
          '```',
        )}
      />,
    );

    expect(container.querySelectorAll('.code-block')).toHaveLength(3);
    expect(copyButtons(container)).toHaveLength(3);
  });

  it('puts one on the labelled source a diagram falls back to', async () => {
    const { container } = render(
      <LessonMarkdown markdown={md('```mermaid', 'not a diagram at all', '```')} />,
    );

    await waitFor(() => expect(container.querySelector('.code-block')).not.toBeNull());
    expect(copyButtons(container)).toHaveLength(1);
  });

  it('leaves the button out of the pre, so the sample is only the sample', () => {
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );

    // "There is a button, and it is not in the pre" — not "there is no button in the pre", which
    // is true of a page with no buttons at all.
    expect(copyButtons(container)).toHaveLength(1);
    expect(container.querySelector('pre button')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toBe('node server.mjs\n');
  });

  it('sits above the sample rather than over it', () => {
    // A button drawn on top of the block covers the first line, and the first line of an HTTP
    // request is the part a reader is looking for. It goes in the row the language label already
    // occupies, ahead of the pre in document order.
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );

    const block = container.querySelector('.code-block') as HTMLElement;
    const button = block.querySelector('button') as HTMLElement;
    const pre = block.querySelector('pre') as HTMLElement;

    expect(button.compareDocumentPosition(pre) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('what it copies', () => {
  it('copies the characters between the fences, spaces and blank lines included', async () => {
    const clipboard = stubClipboard();
    const source = md(
      'GET /api/menu HTTP/1.1',
      'Host: localhost:4317',
      '',
      '  indented by two',
      '\ttabbed',
    );
    const { container } = render(<LessonMarkdown markdown={md('```http', source, '```')} />);

    fireEvent.click(copyButtons(container)[0] as HTMLButtonElement);

    await waitFor(() => expect(clipboard.written).toHaveLength(1));
    expect(clipboard.written[0]).toBe(`${source}\n`);
  });

  it('adds no trailing newline the author did not write, and removes none they did', async () => {
    const clipboard = stubClipboard();
    const { container } = render(<LessonMarkdown markdown={md('```sh', 'one', '', '', '```')} />);

    fireEvent.click(copyButtons(container)[0] as HTMLButtonElement);

    await waitFor(() => expect(clipboard.written).toHaveLength(1));
    expect(clipboard.written[0]).toBe('one\n\n\n');
  });

  it('never copies its own label into the text', async () => {
    const clipboard = stubClipboard();
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );

    fireEvent.click(copyButtons(container)[0] as HTMLButtonElement);

    await waitFor(() => expect(clipboard.written).toHaveLength(1));
    expect(clipboard.written[0]?.toLowerCase()).not.toContain('copy');
  });

  it('copies a real lesson’s commands byte for byte', async () => {
    const clipboard = stubClipboard();
    const source = fs.readFileSync(
      path.join(lessonsDir, 'HTTP_Lesson_06_Student_Edition_v1.md'),
      'utf8',
    );
    // The authored fences, read from the file rather than retyped here: retyping one is the one
    // way this test could agree with a renderer that both got it wrong.
    const authored = [...source.matchAll(/^```sh\r?\n([\s\S]*?)^```/gm)].map((match) => match[1]);
    expect(authored.length).toBeGreaterThan(0);

    const { container } = render(
      <LessonMarkdown
        markdown={authored.map((block) => `\`\`\`sh\n${block}\`\`\``).join('\n\n')}
      />,
    );

    const buttons = copyButtons(container);
    expect(buttons).toHaveLength(authored.length);
    for (const [index, button] of buttons.entries()) {
      fireEvent.click(button);
      await waitFor(() => expect(clipboard.written).toHaveLength(index + 1));
      expect(clipboard.written[index]).toBe(authored[index]);
    }
  });
});

describe('what it must not do', () => {
  it('makes no request, navigates nowhere, and leaves the block’s text alone', async () => {
    const clipboard = stubClipboard();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );
    const before = container.querySelector('pre')?.textContent;
    const wasAt = window.location.href;

    const button = copyButtons(container)[0] as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('button');
    fireEvent.click(button);

    await waitFor(() => expect(clipboard.written).toHaveLength(1));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(window.location.href).toBe(wasAt);
    expect(container.querySelector('pre')?.textContent).toBe(before);
  });
});

describe('what it says afterwards', () => {
  it('says the text was copied, then offers Copy again', async () => {
    vi.useFakeTimers();
    stubClipboard();
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );
    const button = copyButtons(container)[0] as HTMLButtonElement;

    fireEvent.click(button);
    await vi.waitFor(() => expect(button.textContent).toMatch(/copied/i));

    // Five seconds, not the implementation's own delay: the claim is that it goes back on its own,
    // not that it goes back after any particular wait.
    await vi.advanceTimersByTimeAsync(5000);
    await vi.waitFor(() => expect(button.textContent).toMatch(/^copy$/i));
  });

  it('says the copy did not happen when the clipboard refuses, and never says it did', async () => {
    const clipboard = stubClipboard();
    clipboard.fail = true;
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );
    const button = copyButtons(container)[0] as HTMLButtonElement;

    fireEvent.click(button);

    await waitFor(() => expect(button.textContent).toMatch(/could not copy|copy failed/i));
    expect(button.textContent).not.toMatch(/copied/i);
  });

  it('says the copy did not happen when there is no clipboard at all', async () => {
    vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: undefined });
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );
    const button = copyButtons(container)[0] as HTMLButtonElement;

    fireEvent.click(button);

    await waitFor(() => expect(button.textContent).toMatch(/could not copy|copy failed/i));
  });
});

describe('reaching it without a mouse', () => {
  it('gives each button a name saying which block it copies', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={md('```sh', 'node server.mjs', '```', '', '```http', 'GET / HTTP/1.1', '```')}
      />,
    );

    const names = copyButtons(container).map(
      (button) => button.getAttribute('aria-label') ?? button.textContent ?? '',
    );
    // Two buttons called "Copy" and nothing else is a screen reader hearing the same word twice
    // with no way to tell which sample it belongs to.
    expect(new Set(names).size).toBe(2);
    expect(names[0]?.toLowerCase()).toContain('sh');
    expect(names[1]?.toLowerCase()).toContain('http');
  });

  it('is a real button, so Enter and Space work without a key handler of its own', () => {
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );
    const button = copyButtons(container)[0] as HTMLButtonElement;

    button.focus();

    expect(document.activeElement).toBe(button);
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('tabindex')).not.toBe('-1');
  });

  it('does not take the code block out of the tab order it already had', () => {
    const { container } = render(
      <LessonMarkdown markdown={md('```sh', 'node server.mjs', '```')} />,
    );

    // The button's presence is asserted here too, or this reads as a regression guard that is
    // satisfied by the button never having been added.
    expect(copyButtons(container)).toHaveLength(1);
    const block = container.querySelector('pre');
    expect(block?.getAttribute('tabindex')).toBe('0');
    expect(block?.getAttribute('role')).toBe('region');
  });
});

describe('over the whole release', () => {
  /**
   * The five mermaid fences are counted apart from the other 155, not excused. A diagram that draws
   * *replaces* its source block, so there is no block left to put a button on; the labelled
   * fallback a diagram falls back to has one, and the case above asserts it. Counting all 160 here
   * would pass or fail on whether mermaid happened to finish drawing inside jsdom, which is a fact
   * about the test runner rather than about the app.
   */
  it('leaves no non-diagram fence in any lesson without a copy', () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(lessonsDir, '..', 'learning-release.json'), 'utf8'),
    ) as { lessons: { path: string }[] };

    let fences = 0;
    let mermaid = 0;
    let buttons = 0;
    for (const entry of manifest.lessons) {
      const source = fs.readFileSync(path.join(lessonsDir, '..', entry.path), 'utf8');
      const closing = source.indexOf('\n---', 4);
      const body = source.slice(source.indexOf('\n', closing + 1) + 1);
      fences += (body.match(/^```[a-z]/gm) ?? []).length;
      mermaid += (body.match(/^```mermaid$/gm) ?? []).length;

      const { container } = render(<LessonMarkdown markdown={body} />);
      buttons += [...container.querySelectorAll('.code-block button')].filter(
        (button) => button.closest('.diagram') === null,
      ).length;
      cleanup();
    }

    expect(fences).toBe(160);
    expect(mermaid).toBe(5);
    expect(buttons).toBe(fences - mermaid);
  });
});
