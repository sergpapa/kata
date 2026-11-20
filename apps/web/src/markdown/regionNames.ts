import type { Element, ElementContent, Root, RootContent } from 'hast';
import { visit } from 'unist-util-visit';

/**
 * Names every scrollable region one Markdown pass renders, and links each diagram to the authored
 * paragraph that says it in words (docs/specs/accessibility-pass.md AX6, AX7, AX9).
 *
 * A screen reader lists a page's regions by name so its reader can jump between them, so two
 * regions with one name are two entries nobody can tell apart. Each pass numbers its own tables,
 * code samples and diagrams from 1 in document order; a pass that is not the lesson body (an
 * activity's prompt, one of Claude's replies) says where it is, so the names stay distinct across
 * the whole page. The counts live in this one run over the tree, so a re-render — or StrictMode's
 * second render — names everything exactly as the first did.
 *
 * Runs after the sanitizer: the `data-*` properties it writes are the app's own, and the sanitizer
 * would otherwise strip them (and prefix the ids).
 */

/** The property the `pre` and `table` components read their region name from. */
export const REGION_NAME = 'dataRegionName';
/** The property a diagram's `pre` carries: the id of the paragraph that describes it, if any. */
export const DESCRIBED_BY = 'dataDescribedBy';
/** A diagram's `pre`: "Diagram <n>", which the drawn picture's region name starts with. */
export const DIAGRAM_NUMBER = 'dataDiagramNumber';
/** A diagram's `pre`: " in <place>", or empty in the lesson body; the drawn name ends with it. */
export const DIAGRAM_PLACE = 'dataDiagramPlace';

const IN_WORDS = 'In words:';

function textOf(node: Element): string {
  let text = '';
  visit(node, 'text', (child: { value: string }) => {
    text += child.value;
  });
  return text;
}

/** The fence's language: what mdast put after `language-` on the inner `code`, as written. */
/**
 * The one place that reads a fence's language, so the renderer's "is this a diagram?" and this
 * plugin's counting can never disagree.
 */
export function languageOf(pre: Element | undefined): string | undefined {
  if (!pre) return undefined;
  const code = pre.children.find((child): child is Element => child.type === 'element');
  const names = code?.properties?.className;
  for (const name of Array.isArray(names) ? names : []) {
    if (typeof name === 'string' && name.startsWith('language-')) {
      return name.slice('language-'.length);
    }
  }
  return undefined;
}

/** A table's header cells, as text, skipping empty ones. */
function headerOf(table: Element): string[] {
  const cells: string[] = [];
  visit(table, 'element', (node: Element) => {
    if (node.tagName !== 'th') return;
    const text = textOf(node).trim();
    if (text !== '') cells.push(text);
  });
  return cells;
}

/** The next sibling that is an element, skipping only whitespace text between them. */
function nextElement(siblings: readonly (RootContent | ElementContent)[], index: number) {
  for (let at = index + 1; at < siblings.length; at += 1) {
    const sibling = siblings[at];
    if (!sibling) break;
    if (sibling.type === 'element') return sibling;
    if (sibling.type === 'text' && sibling.value.trim() === '') continue;
    return undefined;
  }
  return undefined;
}

/**
 * @param place where this pass sits when it is not the lesson body, e.g. "the prompt for Practice
 *   B"; appended as " in <place>".
 * @param idPrefix unique per rendered pass (React's `useId`), so description ids never collide.
 */
export function rehypeRegionNames(place: string | undefined, idPrefix: string) {
  const where = place ? ` in ${place}` : '';
  return (tree: Root): void => {
    let tables = 0;
    let samples = 0;
    let diagrams = 0;
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName === 'table') {
        tables += 1;
        const header = headerOf(node);
        node.properties[REGION_NAME] =
          `Table ${tables}${header.length > 0 ? `: ${header.join(', ')}` : ''}${where}`;
        return;
      }
      if (node.tagName !== 'pre') return;
      const language = languageOf(node);
      if (language !== 'mermaid') {
        samples += 1;
        node.properties[REGION_NAME] =
          `Code sample ${samples}${language ? `, ${language}` : ''}${where}`;
        return;
      }
      diagrams += 1;
      node.properties[REGION_NAME] = `Source of diagram ${diagrams}${where}`;
      node.properties[DIAGRAM_NUMBER] = `Diagram ${diagrams}`;
      node.properties[DIAGRAM_PLACE] = where;
      // Described only by a paragraph that comes straight after and begins exactly "In words:":
      // the authors' own convention. Anything looser would let the app attach a description the
      // author did not write as one.
      const next = parent && index !== undefined ? nextElement(parent.children, index) : undefined;
      if (next?.tagName === 'p' && textOf(next).startsWith(IN_WORDS)) {
        const id = `${idPrefix}-words-${diagrams}`;
        next.properties.id = id;
        node.properties[DESCRIBED_BY] = id;
      }
    });
  };
}
