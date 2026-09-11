import { SKIP, visit } from 'unist-util-visit';
import type { Image, Link, Nodes, Paragraph, Parent, Root, RootContent, Text } from 'mdast';

/**
 * Rewrites every lesson node that must not become a live page element into visible text, before
 * anything downstream can act on it.
 *
 * Doing this in the Markdown tree rather than in the React components is deliberate. The sanitizer
 * that runs afterwards would strip a raw HTML node, an unsafe `href` and a remote image source
 * outright — which is safe but silent, and a lesson that quietly loses the author's words is the
 * failure this project refuses everywhere else. Converting first means the sanitizer never meets
 * anything it has to delete, and the reader sees exactly what was written.
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

/** The words inside a node, for a link label that is about to become plain text. */
function plainText(node: Nodes): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return node.children.map((child) => plainText(child)).join('');
  return '';
}

function withLowercaseScheme(target: string): string {
  const colon = target.indexOf(':');
  return colon < 0 ? target : target.slice(0, colon).toLowerCase() + target.slice(colon);
}

/** Block containers whose children must stay block-level, so replacement text needs a paragraph. */
const BLOCK_PARENTS = new Set(['root', 'blockquote', 'listItem', 'footnoteDefinition']);

/**
 * Puts replacement text where a node used to be.
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

/** Named rather than loaded: an image is either a remote embed or an asset route that does not
 * exist yet, and both are refused. The alt text is often the only description of the picture. */
function imageAsText(node: Image): string {
  const described = node.alt?.trim() ? node.alt.trim() : 'Image';
  return `[${described} — not shown: ${node.url}]`;
}

function unsafeLinkAsText(node: Link): string {
  const label = plainText(node);
  return label === '' ? node.url : `${label} (${node.url})`;
}

export function remarkInertContent() {
  return (tree: Root): void => {
    visit(tree, 'html', (node, index, parent) => {
      if (!parent || index === undefined) return;
      replaceWithText(parent, index, node.value);
      return SKIP;
    });

    visit(tree, 'image', (node, index, parent) => {
      if (!parent || index === undefined) return;
      replaceWithText(parent, index, imageAsText(node));
      return SKIP;
    });

    visit(tree, 'link', (node, index, parent) => {
      if (!parent || index === undefined) return;

      if (!isSafeHttpUrl(node.url)) {
        replaceWithText(parent, index, unsafeLinkAsText(node));
        return SKIP;
      }

      // A scheme is case-insensitive, but the sanitizer downstream compares it literally and would
      // drop `HTTPS://...` altogether, leaving an anchor with nowhere to go. Lowering just the
      // scheme keeps the target identical and keeps the link alive.
      node.url = withLowercaseScheme(node.url);
      return SKIP;
    });
  };
}
