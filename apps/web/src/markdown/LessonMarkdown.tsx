import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import type { Element } from 'hast';
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
   * top-level heading that breaks the outline.
   */
  h1({ children }) {
    return <h2>{children}</h2>;
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

export function LessonMarkdown({ markdown }: { readonly markdown: string }) {
  return (
    <div className="lesson-body">
      <Markdown
        remarkPlugins={[remarkGfm, remarkInertContent]}
        // Order matters: the guard has to run before the sanitizer, or the sanitizer strips an
        // unsafe href first and the target it names can never be shown to the reader.
        rehypePlugins={[rehypeInertElements, rehypeSanitize]}
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  );
}
