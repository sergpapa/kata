import { SKIP, visit } from 'unist-util-visit';
import type { Root as MdastRoot, Paragraph, Parent, RootContent, Text } from 'mdast';
import type { Element, ElementContent, Root as HastRoot } from 'hast';

/**
 * Two passes that between them make certain no lesson node becomes a live page element.
 *
 * Converting rather than deleting is the point. The sanitizer that runs after these would strip a
 * raw tag, an unsafe `href` and a remote image source outright — safe, but silent, and a lesson
 * that quietly loses the author's words is the failure this project refuses everywhere else.
 * Converting first means the sanitizer never meets anything it has to delete, and the reader sees
 * exactly what was written.
 *
 * The split between them is not stylistic. Raw HTML only exists in the Markdown tree, so it is
 * handled there. Links and images are handled in the *element* tree instead, because Markdown has
 * two spellings for each — `[text](url)` and `[text][ref]` with a definition elsewhere — and only
 * the first is a `link` node. The reference spellings stay unresolved until mdast becomes hast,
 * long after any remark plugin has run. A guard on the Markdown tree therefore covers half the
 * syntax, and `![menu][c]` with `[c]: https://tracker.example/p.png` would load.
 */

/**
 * True only for an absolute `http:` or `https:` URL.
 *
 * Parsed with no base on purpose. Resolving against the page's own address would turn `/notes.md`
 * and `//evil.example/page` into same-origin and off-site links respectively, which is how a
 * scheme-less target becomes a live link. The URL parser also strips the tabs and newlines that
 * hide a scheme, so `java&#9;script:` is recognised for what it is.
 */
export function isSafeHttpUrl(target: string | null | undefined): boolean {
  if (!target) return false;
  try {
    const { protocol } = new URL(target);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * A scheme is case-insensitive, but the sanitizer downstream compares it literally and would drop
 * `HTTPS://...` altogether, leaving an anchor with nowhere to go.
 */
function withLowercaseScheme(target: string): string {
  const colon = target.indexOf(':');
  return colon < 0 ? target : target.slice(0, colon).toLowerCase() + target.slice(colon);
}

/** Block containers whose children must stay block-level, so replacement text needs a paragraph. */
const BLOCK_PARENTS = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition']);

/**
 * Puts replacement text where a Markdown node used to be.
 *
 * The cast is the one place the mdast types cannot help: they know a paragraph's children must be
 * phrasing and a root's must be blocks, but not that this function picks the right one of the two.
 */
function replaceWithText(parent: Parent, index: number, value: string): void {
  const text: Text = { type: 'text', value };
  const replacement: Paragraph | Text = BLOCK_PARENTS.has(parent.type)
    ? { type: 'paragraph', children: [text] }
    : text;
  (parent.children as RootContent[])[index] = replacement;
}

/** Raw HTML an author wrote outside a fence, shown as the characters they typed. */
export function remarkInertContent() {
  return (tree: MdastRoot): void => {
    visit(tree, 'html', (node, index, parent) => {
      if (!parent || index === undefined) return;
      replaceWithText(parent, index, node.value);
      return SKIP;
    });
  };
}

/** The words inside an element, for a link label that is about to become plain text. */
function elementText(node: ElementContent | Element): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map((child) => elementText(child)).join('');
  return '';
}

function propertyString(element: Element, name: string): string | undefined {
  const value = element.properties?.[name];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Links and images in the finished element tree, whichever Markdown spelling produced them.
 *
 * An image is never loaded: it is either a remote embed, which REQ-18 forbids, or a release-local
 * asset for which no route exists yet. The alt text is often the only description of the picture,
 * so it is what the reader is given.
 *
 * A same-document `#fragment` link survives only when something in this lesson actually carries
 * that id — which is how a generated footnote marker keeps working while an authored link to a
 * heading that does not exist becomes text instead of a dead anchor.
 */
export function rehypeInertElements() {
  return (tree: HastRoot): void => {
    const ids = new Set<string>();
    visit(tree, 'element', (node) => {
      const id = propertyString(node, 'id');
      if (id) ids.add(id);
    });

    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index === undefined) return;

      if (node.tagName === 'img') {
        const source = propertyString(node, 'src') ?? '';
        const alt = propertyString(node, 'alt')?.trim();
        const text: ElementContent = {
          type: 'text',
          value: `[${alt || 'Image'} — not shown: ${source}]`,
        };
        parent.children[index] = text;
        return SKIP;
      }

      if (node.tagName !== 'a') return;

      const href = propertyString(node, 'href') ?? '';
      if (isSafeHttpUrl(href)) {
        (node.properties ??= {}).href = withLowercaseScheme(href);
        return SKIP;
      }
      if (href.startsWith('#') && ids.has(href.slice(1))) return SKIP;

      const label = elementText(node);
      parent.children[index] = {
        type: 'text',
        value: label === '' ? href : `${label} (${href})`,
      };
      return SKIP;
    });
  };
}
