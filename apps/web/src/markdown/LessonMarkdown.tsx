import { createContext, useContext, useEffect, useId, useMemo, useRef } from 'react';
import Markdown, { type Components, type ExtraProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import type { Element, Root } from 'hast';
import { visit } from 'unist-util-visit';
import { isSafeHttpUrl, rehypeInertElements, remarkInertContent } from './inertNodes.js';
import { diagramFence, isDiagramLanguage } from './DiagramFence.js';
import { languageOf, REGION_NAME, rehypeRegionNames } from './regionNames.js';
import { CopyBlock } from './CopyBlock.js';
import { ActivityPanel } from '../activities/ActivityPanel.js';
import {
  ACTIVITY_AUTHORED_ATTRIBUTE,
  ACTIVITY_HEADING_ATTRIBUTE,
  ACTIVITY_ID_ATTRIBUTE,
  rehypePlaceActivities,
  type UnplacedActivity,
} from '../activities/placeActivities.js';
import type { LessonContext } from '../activities/recoveryFile.js';
import type { LessonActivity, StoredResponse } from '../releaseTypes.js';

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

/** The name `rehypeRegionNames` gave this region; the fallback only if that plugin did not run. */
function regionName(node: Element | undefined, fallback: string): string {
  const name = node?.properties?.[REGION_NAME];
  return typeof name === 'string' ? name : fallback;
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
   * The language label and the Copy button share a header row outside the `pre`. Text inside the
   * block would become part of the sample, and these samples are HTTP messages whose every
   * character is the lesson.
   */
  pre({ node, children }) {
    const language = languageOf(node);
    const name = regionName(node, language ? `${language} sample` : 'Code sample');
    const block = (
      <div className="code-block">
        {/* The header, never inside the `pre`: anything in there becomes part of the sample, and
            these samples are HTTP messages whose every character is the lesson. It also keeps the
            button clear of the first line, which is the line a reader is looking for. */}
        <div className="code-block-header">
          {language ? <p className="code-block-language">{language}</p> : <span />}
          <CopyBlock source={fenceText(node)} language={language} />
        </div>
        <pre className="code-block-text" tabIndex={0} role="region" aria-label={name}>
          {children}
        </pre>
      </div>
    );

    // A diagram is the one fence that becomes something other than itself (DiagramFence.tsx).
    if (!isDiagramLanguage(language)) return block;
    return diagramFence(node, language, fenceText(node), block);
  },

  /** A wide table scrolls inside its own box, so the page never scrolls sideways at 375px. */
  table({ node, children }) {
    return (
      <div
        className="table-scroll"
        tabIndex={0}
        role="region"
        aria-label={regionName(node, 'Table')}
      >
        <table>{children}</table>
      </div>
    );
  },
};

/**
 * What an activity panel needs to draw itself, handed down by context rather than closed over.
 *
 * **This indirection is load-bearing and is not a style choice.** React identifies an element by its
 * component's identity, so a component map rebuilt for new data is a *different* `div` component:
 * React unmounts the panels it drew and mounts fresh ones, and every box on the lesson loses the
 * text the reader had typed into it. Closing over the data — the obvious way to write this — makes
 * that rebuild necessary on every change.
 *
 * So the component below is defined once, at module scope, and reads what changes out of a context.
 * Its identity is a constant, a context change re-renders rather than remounts, and the hazard is
 * gone rather than merely unlikely: the earlier fix rested on two `useMemo` caches, which React
 * documents as discardable, so an eviction would silently bring the data loss back
 * (docs/specs/save-failure-recovery.md, review finding 3).
 */
interface ActivitySlot {
  readonly byId: ReadonlyMap<string, LessonActivity>;
  readonly responses: readonly StoredResponse[] | undefined;
  readonly lessonContext: LessonContext;
}

const ActivitySlotContext = createContext<ActivitySlot | null>(null);

/** The marker the placement plugin leaves behind, turned back into the author's panel. */
function ActivityMarker({
  node,
  children,
  ...rest
}: React.ComponentPropsWithoutRef<'div'> & ExtraProps) {
  const slot = useContext(ActivitySlotContext);
  const activityId = node?.properties?.[ACTIVITY_ID_ATTRIBUTE];
  if (typeof activityId !== 'string') {
    return <div {...rest}>{children}</div>;
  }
  const activity = slot?.byId.get(activityId);
  if (!activity || !slot) return null;
  const heading = node?.properties?.[ACTIVITY_HEADING_ATTRIBUTE];
  const authored = node?.properties?.[ACTIVITY_AUTHORED_ATTRIBUTE];
  return (
    <ActivityPanel
      activity={activity}
      headingText={typeof heading === 'string' ? heading : null}
      authoredHeading={typeof authored === 'string' ? authored : null}
      responses={slot.responses}
      lessonContext={slot.lessonContext}
    />
  );
}

/** Both maps are module constants, so neither can ever hand React a new component identity. */
const componentsWithActivities: Components = { ...components, div: ActivityMarker };

/**
 * The activity half of this component's props, as a union rather than three loose optionals.
 *
 * A panel that renders writing surfaces has to be able to name its lesson, because a recovery file
 * carries the lesson, the version and the release (docs/specs/save-failure-recovery.md). Expressed
 * this way, passing `activities` without `lessonContext` is a type error at the composition root
 * rather than a page that renders a Download nobody can use. The ~55 call sites that render no
 * activities at all are untouched by it.
 */
type ActivityProps =
  | {
      readonly activities?: undefined;
      readonly responses?: undefined;
      readonly lessonContext?: undefined;
    }
  | {
      /** The lesson's activities, each placed at the end of the section its heading names. */
      readonly activities: readonly LessonActivity[];
      /** What the server has stored for those activities, so each box is drawn already filled. */
      readonly responses?: readonly StoredResponse[] | undefined;
      /** Which lesson these panels belong to. Named in every file a reader recovers from them. */
      readonly lessonContext: LessonContext;
    };

export function LessonMarkdown({
  markdown,
  activities,
  responses,
  lessonContext,
  headingIds = true,
  place,
  onOutline,
  onUnplacedActivities,
}: {
  readonly markdown: string;
  /**
   * Where this Markdown sits when it is not the lesson body — "the prompt for Practice B",
   * "Claude’s reply 2 on Practice A". Its tables, samples and diagrams say so in their names, so no
   * two regions on one lesson page share a name (docs/specs/accessibility-pass.md AX6, AX7).
   */
  readonly place?: string;
  /**
   * Whether headings get anchor ids. False for anything rendered beside the lesson body — a
   * second pass slugs independently, so a prompt heading matching a body heading would put the
   * same id on the page twice and give a contents anchor two targets.
   */
  readonly headingIds?: boolean;
  /** Called after render with the section outline of exactly what rendered. */
  readonly onOutline?: (entries: readonly OutlineEntry[]) => void;
  /** Called after render with the activities whose section this body does not carry. */
  readonly onUnplacedActivities?: (unplaced: readonly UnplacedActivity[]) => void;
} & ActivityProps) {
  // Written by the collector plugin during the synchronous Markdown pass, read by the effect after
  // commit — a callback fired mid-render would be a state write inside someone else's render.
  const box = useRef<{ entries: OutlineEntry[] }>({ entries: [] });
  const placement = useRef<{ unplaced: UnplacedActivity[] }>({ unplaced: [] });
  // Unique per rendered pass and stable across renders, so a description id is never shared.
  const idPrefix = useId();

  useEffect(() => {
    onOutline?.(box.current.entries);
  }, [markdown, onOutline]);

  useEffect(() => {
    onUnplacedActivities?.(placement.current.unplaced);
  }, [markdown, activities, onUnplacedActivities]);

  // What the panel component reads, rebuilt whenever the lesson's own data changes. A *value*, not
  // a component: changing it re-renders the panels and never remounts them.
  const slot: ActivitySlot | null = useMemo(() => {
    if (!activities || activities.length === 0 || !lessonContext) return null;
    return {
      byId: new Map(activities.map((activity) => [activity.activityId, activity])),
      responses,
      lessonContext,
    };
  }, [activities, responses, lessonContext]);

  return (
    <ActivitySlotContext.Provider value={slot}>
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
            ...(headingIds ? [rehypeSlug] : []),
            rehypeSanitize,
            () => rehypeRegionNames(place, idPrefix),
            () => rehypeCollectOutline(box.current),
            // Last of all, and after the outline is settled: the panels are the app's own furniture,
            // so they can neither be stripped by the sanitizer nor appear in the contents list.
            () => rehypePlaceActivities(activities ?? [], markdown, placement.current),
          ]}
          components={slot ? componentsWithActivities : components}
        >
          {markdown}
        </Markdown>
      </div>
    </ActivitySlotContext.Provider>
  );
}
