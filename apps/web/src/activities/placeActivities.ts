import type { Element, Root, RootContent } from 'hast';
import { visit } from 'unist-util-visit';
import type { LessonActivity } from '../releaseTypes.js';

/**
 * Decides where each activity's panel goes, on the very tree that renders.
 *
 * The contract is docs/specs/activity-placement.md. An activity names a heading; its panel goes at
 * the **end** of that heading's section — after everything the author wrote there, before the next
 * heading a reader would see as a peer. Placing it directly under the heading instead would put
 * the app's furniture in front of the prose the activity asks the reader to work through.
 *
 * This runs after `rehype-sanitize`, so the marker it inserts cannot be stripped by it and the
 * sanitizer still meets authored content with nothing of ours mixed in.
 */

export type UnplacedReason = 'heading_missing' | 'heading_ambiguous';

export interface UnplacedActivity {
  readonly activity: LessonActivity;
  readonly reason: UnplacedReason;
}

export const ACTIVITY_ID_ATTRIBUTE = 'data-activity-id';
export const ACTIVITY_HEADING_ATTRIBUTE = 'data-activity-heading';

/**
 * The depth a reader sees, which is not always the depth the tree says: a body-carried `h1` is
 * demoted to `h2` at render (markdown-rendering R1), so it opens a section at the same level as
 * an `h2` rather than one containing it.
 */
function renderedDepth(node: RootContent): number {
  if (node.type !== 'element') return 0;
  const match = /^h([1-6])$/.exec(node.tagName);
  return match ? Math.max(2, Number(match[1])) : 0;
}

/** A heading's visible characters — what a reader would read the heading as. */
function renderedText(node: Element): string {
  let text = '';
  visit(node, 'text', (child: { value: string }) => {
    text += child.value;
  });
  return text.trim();
}

/**
 * The Markdown the author typed for this heading, with the `#` marks taken off.
 *
 * Both spellings are matched because which one a `source_heading` uses is not knowable in advance:
 * an author naming a heading like ``What kind of action? `GET` `` may write it with the backticks
 * or without them, and only one of those equals the rendered text.
 */
function authoredText(node: Element, markdown: string): string | undefined {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined) return undefined;
  return markdown
    .slice(start, end)
    .replace(/^#{1,6}[ \t]+/, '')
    .replace(/[ \t]+#*[ \t]*$/, '')
    .trim();
}

function marker(activity: LessonActivity, headingText: string): Element {
  return {
    type: 'element',
    tagName: 'div',
    properties: {
      [ACTIVITY_ID_ATTRIBUTE]: activity.activityId,
      [ACTIVITY_HEADING_ATTRIBUTE]: headingText,
    },
    children: [],
  };
}

export function rehypePlaceActivities(
  activities: readonly LessonActivity[],
  markdown: string,
  box: { unplaced: UnplacedActivity[] },
) {
  return (tree: Root): void => {
    const unplaced: UnplacedActivity[] = [];
    const insertions = new Map<number, Element[]>();

    const headings = tree.children
      .map((child, index) => ({ child, index }))
      .filter((entry) => renderedDepth(entry.child) > 0)
      .map((entry) => {
        const element = entry.child as Element;
        return {
          index: entry.index,
          depth: renderedDepth(element),
          rendered: renderedText(element),
          authored: authoredText(element, markdown),
        };
      });

    for (const activity of activities) {
      const matches = headings.filter(
        (heading) =>
          heading.rendered === activity.sourceHeading ||
          heading.authored === activity.sourceHeading,
      );

      if (matches.length === 0) {
        unplaced.push({ activity, reason: 'heading_missing' });
        continue;
      }
      if (matches.length > 1) {
        unplaced.push({ activity, reason: 'heading_ambiguous' });
        continue;
      }

      const opened = matches[0] as (typeof headings)[number];
      // The section runs to the next heading a reader sees as this one's peer, or to the end.
      let endsAt = tree.children.length;
      for (let index = opened.index + 1; index < tree.children.length; index += 1) {
        const depth = renderedDepth(tree.children[index] as RootContent);
        if (depth > 0 && depth <= opened.depth) {
          endsAt = index;
          break;
        }
      }

      const group = insertions.get(endsAt) ?? [];
      group.push(marker(activity, opened.rendered));
      insertions.set(endsAt, group);
    }

    // Back to front, so an earlier insertion never shifts a later one's index out from under it.
    // Activities sharing a section keep the file's order within their group.
    for (const at of [...insertions.keys()].sort((left, right) => right - left)) {
      tree.children.splice(at, 0, ...(insertions.get(at) as Element[]));
    }

    box.unplaced = unplaced;
  };
}
