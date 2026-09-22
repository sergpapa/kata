import { useEffect, useRef } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { isSafeHttpUrl, rehypeInertElements, remarkInertContent } from './inertNodes.js';
import { MermaidDiagram } from './MermaidDiagram.js';

/**
 * Renders an authored lesson body. The contract is docs/specs/markdown-rendering.md.
 *
 * Markdown becomes React elements directly — no HTML string is produced anywhere, so there is no
 * `dangerouslySetInnerHTML` and nothing for a sanitizer allow-list to get wrong. Four layers, in
 * order: `remarkInertContent` turns raw HTML into visible text; `rehypeInertElements` does the
 * same for images and unsafe link targets, working on the element tree so that both Markdown
 * spellings of a link and an image are covered; `rehype-sanitize` then meets a tree with nothing
 * dangerous left in it; and the component map below decides how the survivors are presented.
 */

/** One contents-list entry: where an anchor points, and the heading text to call it by. */
export interface OutlineEntry {
  readonly id: string;
  readonly text: string;
}

/** The heading's visible characters, which is what the sidebar entry has to say. */
function textOf(node: Element): string {
  let text = '';
  visit(node, 'text', (child: { value: string }) => {
    text += child.value;
  });
  return text;
}

/**
 * Collects the outline off the very tree that renders, after the sanitizer has settled the final
 * ids — so the contents list can never drift from the page it points into. Sections are the
 * tree's level-1 and level-2 headings: a body-carried H1 is demoted to `h2` at render, so both
 * arrive on the page as sections.
 */
function rehypeCollectOutline(box: { entries: OutlineEntry[] }) {
  return (tree: Root): void => {
    const entries: OutlineEntry[] = [];
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'h1' && node.tagName !== 'h2') return;
      const id = node.properties?.id;
      if (typeof id === 'string') entries.push({ id, text: textOf(node) });
    });
    box.entries = entries;
  };
}

/** The fence's info string, read off the `language-*` class mdast puts on the `code` element. */
function fenceLanguage(node: Element | undefined): string | undefined {
  const code = node?.children.find((child) => child.type === 'element');
  const className = code && code.type === 'element' ? code.properties?.className : undefined;
  const names = Array.isArray(className) ? className : [];

  for (const name of names) {
    if (typeof name === 'string' && name.startsWith('language-')) {
      return name.slice('language-'.length);
    }
  }
  return undefined;
}

/**
 * The characters between the fences, taken from the tree rather than from the React children.
 *
 * Mermaid is given exactly what the author typed. Reassembling the source out of rendered children
 * would mean trusting React's text nodes to have preserved every space and newline, and a fence's
 * whitespace is load-bearing here for the same reason criterion W1 says it is everywhere else.
 */
function fenceText(node: Element | undefined): string {
  const code = node?.children.find((child) => child.type === 'element');
  if (!code || code.type !== 'element') return '';
  return code.children.map((child) => (child.type === 'text' ? child.value : '')).join('');
}

const components: Components = {
  /**
   * An authored link is external by the time it gets here — anything that was not `http:` or
   * `https:` became text upstream. It opens in its own tab, and `noopener` keeps the opened page
   * from reaching back into this one through `window.opener`.
   *
   * Not every anchor here is authored, though: a footnote marker and its back-reference are
   * generated after the Markdown pass and point within this same page. Sending those to a new tab
   * would break the one thing a footnote is for.
   */
  a({ href, children }) {
    if (!isSafeHttpUrl(href)) return <a href={href}>{children}</a>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },

  /**
   * The page's `h1` is the lesson title. Only the *first* authored H1 becomes that title, so a
   * later one is still in the body; it renders here as a section heading rather than as a rival
   * top-level heading that breaks the outline. The rest of its attributes — its anchor id above
   * all — travel with it, or the contents list would point at a heading that lost its name.
   */
  h1({ node: _node, children, ...rest }) {
    return <h2 {...rest}>{children}</h2>;
  },

  /**
   * The language label sits outside the `pre`, never inside it: text inside the block would become
   * part of the sample, and these samples are HTTP messages whose every character is the lesson.
   */
  pre({ node, children }) {
    const language = fenceLanguage(node);
    const block = (
      <div className="code-block">
        {language ? <p className="code-block-language">{language}</p> : null}
        <pre
          className="code-block-text"
          tabIndex={0}
          role="region"
          aria-label={language ? `${language} sample` : 'Code sample'}
        >
          {children}
        </pre>
      </div>
    );

    // A diagram is the one fence that becomes something other than itself. The block above is
    // handed over as the fallback rather than rebuilt, so the labelled source a reader falls back
    // to is the same markup every other fence gets — including its character-for-character text.
    if (language !== 'mermaid') return block;
    return <MermaidDiagram source={fenceText(node)}>{block}</MermaidDiagram>;
  },

  /** A wide table scrolls inside its own box, so the page never scrolls sideways at 375px. */
  table({ children }) {
    return (
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Table">
        <table>{children}</table>
      </div>
    );
  },
};

export function LessonMarkdown({
  markdown,
  onOutline,
}: {
  readonly markdown: string;
  /** Called after render with the section outline of exactly what rendered. */
  readonly onOutline?: (entries: readonly OutlineEntry[]) => void;
}) {
  // Written by the collector plugin during the synchronous Markdown pass, read by the effect after
  // commit — a callback fired mid-render would be a state write inside someone else's render.
  const box = useRef<{ entries: OutlineEntry[] }>({ entries: [] });

  useEffect(() => {
    onOutline?.(box.current.entries);
  }, [markdown, onOutline]);

  return (
    <div className="lesson-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkInertContent]}
        // Order matters twice over: the guard has to run before the sanitizer, or the sanitizer
        // strips an unsafe href first and the target it names can never be shown to the reader;
        // and the slugger runs before the sanitizer so its ids pick up the clobber prefix that
        // keeps authored heading text from capturing the app's own element ids. The collector runs
        // last, on the settled tree.
        rehypePlugins={[
          rehypeInertElements,
          rehypeSlug,
          rehypeSanitize,
          () => rehypeCollectOutline(box.current),
        ]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
