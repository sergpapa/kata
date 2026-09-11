import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * The rendering contract from docs/specs/markdown-rendering.md, criteria R, S and W. Written
 * against the renderer as a black box: Markdown goes in, the document is inspected for what the
 * author wrote and for what must never appear.
 */

afterEach(cleanup);

/** Markdown lines joined, so a fenced block in a test reads the way it does in a lesson file. */
function md(...lines: string[]): string {
  return lines.join('\n');
}

function renderMarkdown(source: string): HTMLElement {
  return render(<LessonMarkdown markdown={source} />).container;
}

describe('block constructs render as themselves', () => {
  it('renders paragraphs, emphasis and inline code', () => {
    const container = renderMarkdown(
      md('A plain paragraph with **strong words**, *emphasis* and `inline code`.'),
    );

    expect(container.querySelector('p')?.textContent).toContain('A plain paragraph');
    expect(container.querySelector('strong')?.textContent).toBe('strong words');
    expect(container.querySelector('em')?.textContent).toBe('emphasis');
    expect(container.querySelector('code')?.textContent).toBe('inline code');
  });

  it('renders ordered, unordered and nested lists', () => {
    const container = renderMarkdown(
      md('- first', '- second', '  - nested', '', '1. step one', '2. step two'),
    );

    const unordered = container.querySelector('ul');
    expect(unordered?.querySelectorAll('li').length).toBe(3);
    expect(unordered?.querySelector('ul')).not.toBeNull();
    expect(container.querySelectorAll('ol > li').length).toBe(2);
  });

  it('renders a blockquote as a blockquote, keeping the quoted words', () => {
    const container = renderMarkdown(md('> \u201cCould I see the drinks menu, please?\u201d'));

    expect(container.querySelector('blockquote')?.textContent).toContain('drinks menu');
  });

  it('renders a thematic break', () => {
    expect(
      renderMarkdown(md('Above.', '', '---', '', 'Below.')).querySelector('hr'),
    ).not.toBeNull();
  });

  it('renders a GFM pipe table as a table with real header cells', () => {
    const container = renderMarkdown(
      md(
        '| In the caf\u00e9 | In our web example |',
        '| --- | --- |',
        '| You ask for a menu | The browser acts as a client |',
      ),
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();
    expect([...(table?.querySelectorAll('th') ?? [])].map((cell) => cell.textContent)).toEqual([
      'In the caf\u00e9',
      'In our web example',
    ]);
    expect(table?.querySelectorAll('tbody td').length).toBe(2);
  });

  it('starts the body outline at h2, so the lesson title above it is the only h1', () => {
    const container = renderMarkdown(md('## A section', '', 'Prose.', '', '### A subsection'));

    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('A section');
    expect(container.querySelector('h3')?.textContent).toBe('A subsection');
  });

  it('demotes a second top-level heading rather than putting a rival h1 on the page', () => {
    // Only the *first* H1 is the display title, so the importer leaves any later one in the body.
    const container = renderMarkdown(md('## A section', '', '# A second top-level heading'));

    expect(container.querySelector('h1')).toBeNull();
    expect([...container.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([
      'A section',
      'A second top-level heading',
    ]);
  });
});

describe('fenced code blocks', () => {
  it('renders as pre > code carrying the info string as a language class', () => {
    const container = renderMarkdown(md('```http', 'GET /menu HTTP/1.1', '```'));

    const code = container.querySelector('pre > code');
    expect(code).not.toBeNull();
    expect(code?.className).toContain('language-http');
  });

  it('shows the fence language to the reader, so a command is not mistaken for output', () => {
    renderMarkdown(md('```sh', 'node server.mjs', '```'));

    expect(screen.getByText('sh')).toBeDefined();
  });

  it('invents no label for a fence the author left unlabelled', () => {
    const container = renderMarkdown(md('```', 'just some text', '```'));

    expect(container.querySelector('pre > code')?.className).not.toContain('language-');
    expect(container.textContent?.trim()).toBe('just some text');
  });

  it('can be scrolled by keyboard, so a wide block is reachable without a mouse', () => {
    const container = renderMarkdown(md('```text', 'a very wide line of sample output', '```'));

    expect(container.querySelector('pre')?.getAttribute('tabindex')).toBe('0');
  });
});

describe('whitespace inside a fence', () => {
  it('keeps the blank line that separates HTTP headers from the body', () => {
    const container = renderMarkdown(
      md('```http', 'GET /menu HTTP/1.1', 'Host: cafe.example', '', '```'),
    );

    // Character for character what the author wrote between the fences. Exact equality, not
    // `toContain`: a renderer that trims the block, or that collapses the blank line, is the whole
    // failure this criterion exists to catch, and `toContain` cannot see either.
    expect(container.querySelector('pre')?.textContent).toBe(
      'GET /menu HTTP/1.1\nHost: cafe.example\n\n',
    );
  });

  it('keeps the language label out of the block, where it would corrupt the sample', () => {
    const container = renderMarkdown(md('```http', 'GET /menu HTTP/1.1', '```'));

    expect(container.querySelector('pre')?.textContent).toBe('GET /menu HTTP/1.1\n');
  });

  it('keeps runs of spaces used to line sample output up', () => {
    const container = renderMarkdown(
      md('```text', 'GET  /menu    200', 'GET  /missing 404', '```'),
    );

    expect(container.querySelector('pre')?.textContent).toContain('GET  /menu    200');
  });

  it('keeps leading indentation inside the block', () => {
    const container = renderMarkdown(md('```text', '  indented line', '```'));

    expect(container.querySelector('pre')?.textContent).toContain('  indented line');
  });
});

describe('HTML in a lesson stays inert', () => {
  it('shows HTML inside a fence as characters, never as page elements', () => {
    const container = renderMarkdown(
      md(
        '```html',
        '<!DOCTYPE html>',
        '<html lang="en">',
        '  <head><title>Cafe menu</title></head>',
        '  <body>',
        '    <h1>Cafe menu</h1>',
        '    <ul><li>Tea</li></ul>',
        '  </body>',
        '</html>',
        '```',
      ),
    );

    expect(container.querySelector('h1')).toBeNull();
    expect(container.querySelector('ul')).toBeNull();
    expect(container.querySelector('title')).toBeNull();
    expect(container.querySelector('pre')?.textContent).toContain('<h1>Cafe menu</h1>');
  });

  it('shows tags inside an inline code span as characters, including inside a table cell', () => {
    const container = renderMarkdown(
      md(
        '| Term | Where it lives |',
        '| --- | --- |',
        '| `<head> ... </head>` | In the document |',
      ),
    );

    expect(container.querySelector('head')).toBeNull();
    expect(container.querySelector('td > code')?.textContent).toBe('<head> ... </head>');
  });

  it('shows raw HTML outside a fence as characters, and never runs it', () => {
    const container = renderMarkdown(md('Before. <script>alert(1)</script> After.'));

    expect(container.querySelectorAll('script').length).toBe(0);
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('never discards raw HTML: the authored words stay on the page as text', () => {
    const container = renderMarkdown(md('Use a <div class="note">note box</div> to group them.'));

    expect(container.querySelector('div.note')).toBeNull();
    expect(container.textContent).toContain('<div class="note">');
    expect(container.textContent).toContain('note box');
    expect(container.textContent).toContain('</div>');
  });

  it('shows a raw HTML block standing on its own as characters', () => {
    const container = renderMarkdown(
      md('Before.', '', '<div class="note">A note box</div>', '', 'After.'),
    );

    expect(container.querySelector('div.note')).toBeNull();
    expect(container.textContent).toContain('<div class="note">A note box</div>');
    expect(container.textContent).toContain('Before.');
    expect(container.textContent).toContain('After.');
  });

  it('shows a raw HTML block inside a blockquote as characters', () => {
    const container = renderMarkdown(md('> <div class="note">A quoted note</div>'));

    expect(container.querySelector('div.note')).toBeNull();
    expect(container.querySelector('blockquote')?.textContent).toContain('<div class="note">');
  });

  it('lets no event handler or inline style attribute reach a rendered element', () => {
    const container = renderMarkdown(
      md('An image: <img src="x" onerror="alert(1)"> and a <p style="color:red">styled</p> one.'),
    );

    for (const element of container.querySelectorAll('*')) {
      expect(element.getAttribute('onerror')).toBeNull();
      expect(element.getAttribute('onclick')).toBeNull();
      expect(element.getAttribute('style')).toBeNull();
    }
    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.textContent).toContain('onerror="alert(1)"');
  });
});

describe('links', () => {
  it('makes an https link a usable anchor that cannot reach back into the app', () => {
    const container = renderMarkdown(
      md('[MDN: HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages)'),
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')).toBe(
      'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages',
    );
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('target')).toBe('_blank');
    expect(anchor?.textContent).toBe('MDN: HTTP messages');
  });

  it('makes a plain http link an anchor too: Lesson 2 teaches http://127.0.0.1:4312/menu', () => {
    const container = renderMarkdown(md('[The local cafe](http://127.0.0.1:4312/menu)'));

    expect(container.querySelector('a')?.getAttribute('href')).toBe('http://127.0.0.1:4312/menu');
  });

  it('judges the scheme case-insensitively, as a browser does', () => {
    const container = renderMarkdown(md('[Shouting](HTTPS://example.com/page)'));

    // The claim is that the link still works, not that the scheme keeps the author's capitals:
    // a scheme is case-insensitive by definition. An anchor with no href would fail this.
    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(new URL(anchor?.getAttribute('href') ?? '').href).toBe('https://example.com/page');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('target')).toBe('_blank');
  });

  it('makes a bare URL the author did not wrap in brackets usable', () => {
    const container = renderMarkdown(md('See https://curl.se/docs/manpage.html for the options.'));

    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://curl.se/docs/manpage.html',
    );
    expect(container.querySelector('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it.each([
    ['javascript:alert(1)', 'a script URL'],
    ['JaVaScRiPt:alert(1)', 'a script URL in mixed case'],
    ['data:text/html,alert', 'a data URL'],
    ['vbscript:msgbox(1)', 'a vbscript URL'],
    ['mailto:author@example.com', 'a mail address'],
    ['file:///C:/Users/author/lesson.md', 'an author-workspace file URL'],
    ['sandbox:/mnt/data/lesson.md', 'a sandbox link'],
    ['./HTTP_Lesson_02_Student_Edition_v1.md', 'a relative link'],
    ['/mnt/data/authoring/notes.md', 'an absolute workspace path'],
  ])('refuses to make %s into an anchor (%s)', (target) => {
    const container = renderMarkdown(md('[Read this](' + target + ')'));

    expect(container.querySelectorAll('a').length).toBe(0);
    expect(container.textContent).toContain('Read this');
    expect(container.textContent).toContain(target);
  });

  it('refuses a protocol-relative target, which resolving against the page would make live', () => {
    const container = renderMarkdown(md('[Read this](//evil.example/page)'));

    expect(container.querySelectorAll('a').length).toBe(0);
    expect(container.textContent).toContain('//evil.example/page');
  });

  it('refuses a script URL whose scheme is broken up by whitespace', () => {
    const container = renderMarkdown(md('[Read this](java&#9;script:alert(1))'));

    expect(container.querySelectorAll('a').length).toBe(0);
    expect(container.textContent).toContain('Read this');
    expect(container.textContent).toContain('script:alert(1)');
  });

  /**
   * Reference syntax is the other half of the language. `[text][ref]` is a `linkReference` in the
   * Markdown tree and is not resolved into an anchor until that tree becomes an element tree — so
   * a guard that only knows about `link` nodes covers the inline spelling and nothing else.
   */
  it.each([
    ['javascript:alert(1)', 'a script URL'],
    ['mailto:author@example.com', 'a mail address'],
    ['./HTTP_Lesson_02_Student_Edition_v1.md', 'a relative link'],
    ['sandbox:/mnt/data/lesson.md', 'a sandbox link'],
    ['//evil.example/page', 'a protocol-relative target'],
  ])('refuses %s written as a reference definition (%s)', (target) => {
    const container = renderMarkdown(md('[Read this][ref]', '', '[ref]: ' + target));

    expect(container.querySelectorAll('a').length).toBe(0);
    expect(container.textContent).toContain('Read this');
    expect(container.textContent).toContain(target);
  });

  it('still makes a safe reference-style link an anchor', () => {
    const container = renderMarkdown(
      md('[The manual][curl]', '', '[curl]: https://curl.se/docs/manpage.html'),
    );

    expect(container.querySelector('a')?.getAttribute('href')).toBe(
      'https://curl.se/docs/manpage.html',
    );
  });

  it('keeps a footnote marker pointing inside the page rather than at a new tab', () => {
    const container = renderMarkdown(md('Tea is a drink[^1].', '', '[^1]: So is coffee.'));

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('href')?.startsWith('#')).toBe(true);
    expect(anchor?.getAttribute('target')).toBeNull();
    expect(container.textContent).toContain('So is coffee.');
  });

  it('refuses a fragment link to something this lesson does not contain', () => {
    const container = renderMarkdown(md('[Jump ahead](#a-section-that-is-not-here)'));

    expect(container.querySelectorAll('a').length).toBe(0);
    expect(container.textContent).toContain('#a-section-that-is-not-here');
  });
});

describe('images', () => {
  it('never loads one: the alt text and the source are shown as text instead', () => {
    const container = renderMarkdown(md('![A cafe menu](https://example.com/menu.png)'));

    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.textContent).toContain('A cafe menu');
    expect(container.textContent).toContain('https://example.com/menu.png');
  });

  it('names a release-relative image rather than shipping a broken one', () => {
    const container = renderMarkdown(md('![Diagram](assets/request.png)'));

    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.textContent).toContain('assets/request.png');
  });

  it('never loads one written as a reference definition either', () => {
    const container = renderMarkdown(
      md('![A cafe menu][pic]', '', '[pic]: https://tracker.example/pixel.png'),
    );

    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.textContent).toContain('A cafe menu');
    expect(container.textContent).toContain('https://tracker.example/pixel.png');
  });

  it('never loads one written as a collapsed reference', () => {
    const container = renderMarkdown(md('![menu]', '', '[menu]: https://tracker.example/p.png'));

    expect(container.querySelectorAll('img').length).toBe(0);
    expect(container.textContent).toContain('https://tracker.example/p.png');
  });
});
