import type { Element, ElementContent, Root, RootContent } from 'hast';
import { visit } from 'unist-util-visit';
import { readKataDiagram } from './kataDiagram.js';

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
/**
 * How a `kata-diagram` fence and the `mermaid` fence straight after it share one diagram
 * (docs/specs/kata-diagrams.md KD13 to KD15). On the Mermaid fence: `superseded` when the Kata
 * fence is drawn, so the fallback renders nothing, or `fallback` when it stands in. On the Kata
 * fence: `fallback` when a Mermaid fence stands in for it.
 */
export const PAIRED = 'dataPaired';

/** The language of an authored Kata diagram fence (ADR 0025). */
export const KATA_LANGUAGE = 'kata-diagram';

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

    /**
     * Links a drawn diagram to the paragraph straight after `last` — the diagram's own fence, or
     * its fallback when it has one. Only a paragraph that begins exactly "In words:" counts: the
     * authors' own convention. Anything looser would let the app attach a description the author
     * did not write as one.
     */
    const describe = (
      drawn: Element,
      last: Element,
      siblings: readonly (RootContent | ElementContent)[],
    ) => {
      const next = nextElement(siblings, siblings.indexOf(last as ElementContent));
      if (next?.tagName === 'p' && textOf(next).startsWith(IN_WORDS)) {
        const id = `${idPrefix}-words-${diagrams}`;
        next.properties.id = id;
        drawn.properties[DESCRIBED_BY] = id;
      }
    };

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
      if (language !== 'mermaid' && language !== KATA_LANGUAGE) {
        samples += 1;
        node.properties[REGION_NAME] =
          `Code sample ${samples}${language ? `, ${language}` : ''}${where}`;
        return;
      }
      // Already named as the fallback of the Kata fence before it.
      if (node.properties[PAIRED] !== undefined) return;

      diagrams += 1;
      node.properties[REGION_NAME] = `Source of diagram ${diagrams}${where}`;
      node.properties[DIAGRAM_NUMBER] = `Diagram ${diagrams}`;
      node.properties[DIAGRAM_PLACE] = where;
      const siblings = parent?.children ?? [];

      const next = parent && index !== undefined ? nextElement(parent.children, index) : undefined;
      const fallback =
        language === KATA_LANGUAGE && next?.tagName === 'pre' && languageOf(next) === 'mermaid'
          ? next
          : undefined;
      if (!fallback) {
        describe(node, node, siblings);
        return;
      }

      // One diagram, two fences: the pair shares this number, and whichever one is drawn is the
      // one the "In words:" paragraph after the pair describes.
      fallback.properties[REGION_NAME] = `Fallback source of diagram ${diagrams}${where}`;
      fallback.properties[DIAGRAM_NUMBER] = `Diagram ${diagrams}`;
      fallback.properties[DIAGRAM_PLACE] = where;
      if (readKataDiagram(textOf(node)).ok) {
        fallback.properties[PAIRED] = 'superseded';
        describe(node, fallback, siblings);
      } else {
        fallback.properties[PAIRED] = 'fallback';
        node.properties[PAIRED] = 'fallback';
        describe(fallback, fallback, siblings);
      }
    });
  };
}
