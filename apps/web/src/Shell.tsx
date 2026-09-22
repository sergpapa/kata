import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  BookIcon,
  ChevronRightIcon,
  CodeIcon,
  LayersIcon,
  MenuIcon,
  MessageIcon,
  TerminalIcon,
} from './icons.js';
import { RouteLink } from './RouteLink.js';
import type { OutlineEntry } from './markdown/LessonMarkdown.js';
import type { ReleaseView } from './releaseTypes.js';
import type { Route } from './route.js';

/**
 * The frame every address is read inside: the course sidebar, the top bar, and the region a page
 * renders into. Criteria S1–S6 in docs/specs/visual-design-integration.md.
 *
 * Three of the four destinations lead to work that is not built. They are still real addresses
 * with real pages, because the design package is explicit that a recreated label over a dead
 * control is worse than no label — see decision 5 in the spec.
 */

const destinations = [
  { href: '/', label: 'Learn', Icon: BookIcon },
  { href: '/practice', label: 'Practice', Icon: TerminalIcon },
  { href: '/reviews', label: 'Reviews', Icon: MessageIcon },
  { href: '/progress', label: 'Progress', Icon: LayersIcon },
] as const;

/**
 * How a page tells the top bar what it is called.
 *
 * The trail has to end in the page's own name, and on a lesson that name is authored content the
 * shell has not fetched — only the lesson page knows it. A context is the cheapest way for the
 * page to hand it upward without the shell duplicating the request.
 */
const PageName = createContext<(name: string | null) => void>(() => {});

export function useReportPageName(name: string | null): void {
  const report = useContext(PageName);
  useEffect(() => {
    report(name);
    return () => report(null);
  }, [report, name]);
}

/**
 * How the lesson page hands its section outline to the sidebar, the same way it hands its name to
 * the top bar: the outline is derived from body content only the lesson's own render has seen.
 * The setter is called with entries when a lesson body settles and with null on the way out, so a
 * page that reports nothing shows nothing — the dashboard and the standby pages never call it.
 */
const LessonOutline = createContext<(entries: readonly OutlineEntry[] | null) => void>(() => {});

export function useReportLessonOutline(): (entries: readonly OutlineEntry[] | null) => void {
  return useContext(LessonOutline);
}

/** Which destination the current address belongs to. A lesson belongs to Learn. */
function currentHref(route: Route): string | null {
  if (route.kind === 'home' || route.kind === 'lesson') return '/';
  if (route.kind === 'standby') return `/${route.section}`;
  return null;
}

function trailFor(route: Route, pageName: string | null): readonly string[] {
  if (route.kind === 'home') return ['EduCode', 'Learning workspace'];
  if (route.kind === 'standby') {
    const label = destinations.find((entry) => entry.href === `/${route.section}`)?.label;
    return ['EduCode', label ?? route.section];
  }
  if (route.kind === 'lesson') {
    // The key until the lesson answers with its authored title: truthful, and already in the
    // address bar, so it is not new information the reader has to decode.
    return ['EduCode', 'Learn', pageName ?? route.candidateLessonId];
  }
  return ['EduCode', 'Not found'];
}

/** What the sidebar can honestly say about the release, which is its identity and its size. */
function releaseNote(release: ReleaseView): { audience: string | null; count: number } | null {
  if (release.state !== 'imported') return null;
  return { audience: release.release.audience, count: release.lessons.length };
}

export function Shell({
  route,
  release,
  children,
}: {
  readonly route: Route;
  readonly release: ReleaseView;
  readonly children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pageName, setPageName] = useState<string | null>(null);
  const [outline, setOutline] = useState<readonly OutlineEntry[] | null>(null);
  const sidebarId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const main = useRef<HTMLElement>(null);
  /**
   * The address whose page last claimed focus — null until first paint. A plain "have I run"
   * boolean cannot tell StrictMode's doubled mount effect from a navigation, and stole focus on
   * initial load in dev; only an actual change of address is a navigation.
   */
  const focusedRoute = useRef<string | null>(null);
  const wasOpen = useRef(false);
  /** Whether the drawer was dismissed rather than navigated out of. Decides where focus lands. */
  const dismissed = useRef(false);

  function dismissDrawer(): void {
    dismissed.current = true;
    setOpen(false);
  }

  const here = currentHref(route);
  const note = releaseNote(release);

  // Every address this app has, as one value. `route.kind` alone cannot tell /practice from
  // /reviews, so moving between them swapped the whole page and left focus where it was.
  const routeKey =
    route.kind === 'lesson'
      ? `lesson:${route.candidateLessonId}`
      : route.kind === 'standby'
        ? `standby:${route.section}`
        : route.kind;

  // Stable, so the effect in useReportPageName does not re-run on every render of the page.
  const report = useCallback((name: string | null) => setPageName(name), []);
  const reportOutline = useCallback(
    (entries: readonly OutlineEntry[] | null) => setOutline(entries),
    [],
  );

  // A keyboard or screen-reader user who follows a lesson link would otherwise be left with focus
  // on `body`, at the top of a document they have no idea changed. Moving focus to the new page's
  // region announces the change and puts the next Tab in the right place. Skipped on first paint,
  // where nothing has changed yet and stealing focus would be wrong.
  useEffect(() => {
    if (focusedRoute.current !== null && focusedRoute.current !== routeKey) main.current?.focus();
    focusedRoute.current = routeKey;
  }, [routeKey]);

  // The drawer owns the focus it took. Opening puts the reader on the first destination, because a
  // drawer that opens behind the cursor is a drawer a keyboard cannot reach.
  //
  // Closing hands focus back to the trigger — but only when the drawer was dismissed. Following a
  // destination also closes it, and there the new page has already claimed focus in the effect
  // above; restoring the trigger on top of that would drop the reader back on the navigation they
  // just left, one commit after arriving.
  useEffect(() => {
    if (open) {
      sidebar.current?.querySelector('a')?.focus();
    } else if (wasOpen.current && dismissed.current) {
      trigger.current?.focus();
    }
    dismissed.current = false;
    wasOpen.current = open;
  }, [open]);

  // While the drawer is open it covers the page behind a scrim, so Tab must stay inside it.
  // Without this the next Tab lands on a link the reader cannot see and cannot reach with a
  // pointer, which is the same as losing focus entirely.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        dismissDrawer();
        return;
      }
      if (event.key !== 'Tab') return;

      const stops = [...(sidebar.current?.querySelectorAll('a') ?? [])];
      const first = stops[0];
      const last = stops.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const trail = trailFor(route, pageName);

  return (
    // `data-view` lets the stylesheet know which kind of page is inside — the reading-progress
    // hairline draws only on a lesson, where position in a 12,000px document is worth showing.
    <div className="shell" data-drawer={open ? 'open' : 'closed'} data-view={route.kind}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <nav
        id={sidebarId}
        ref={sidebar}
        className="sidebar"
        aria-label="Sections"
        data-open={open ? 'true' : 'false'}
      >
        <p className="brand">
          <span className="brand-mark">
            <CodeIcon />
          </span>
          <span className="brand-name">
            EduCode
            <span>Owner rehearsal</span>
          </span>
        </p>

        <p className="eyebrow sidebar-group-label">YOUR WORKSPACE</p>
        <ul className="nav-list">
          {destinations.map(({ href, label, Icon }) => (
            <li key={href}>
              <RouteLink
                href={href}
                className="nav-button"
                aria-current={here === href ? 'page' : undefined}
                onNavigate={() => setOpen(false)}
              >
                <Icon />
                <span>{label}</span>
              </RouteLink>
            </li>
          ))}
        </ul>

        {note && (
          <div className="sidebar-course">
            <p className="eyebrow">THIS RELEASE</p>
            {note.audience && <p>{note.audience}</p>}
            {/* The count, and only the count. A bar here would read as progress, and nothing in
                this application records what has been read. */}
            <p className="fine">
              {note.count} {note.count === 1 ? 'lesson' : 'lessons'} in this release
            </p>
          </div>
        )}

        {/* Only while a lesson page has reported sections — an empty block on the dashboard would
            be the dead surface decision 5 refuses. Following an entry closes the drawer like any
            destination; focus is not handed back to the trigger, because the reader is leaving for
            the section, not dismissing the drawer. */}
        {outline && outline.length > 0 && (
          <div className="sidebar-contents">
            <p className="eyebrow sidebar-group-label">In this lesson</p>
            <ul className="contents-list">
              {outline.map((entry) => (
                <li key={entry.id}>
                  <a href={`#${entry.id}`} onClick={() => setOpen(false)}>
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Covers the page the drawer opened over, and closes it on a tap outside. Inert to a
          keyboard, which reaches the drawer by Tab and leaves it by Escape. */}
      <div className="drawer-scrim" onClick={dismissDrawer} aria-hidden="true" />

      <div className="workspace">
        <div className="topbar">
          <button
            type="button"
            ref={trigger}
            className="sidebar-trigger"
            aria-label="Navigation"
            aria-expanded={open}
            aria-controls={sidebarId}
            onClick={() => (open ? dismissDrawer() : setOpen(true))}
          >
            <MenuIcon />
          </button>
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <ol>
              {trail.map((crumb, index) => (
                <li key={crumb}>
                  {index > 0 && <ChevronRightIcon />}
                  <span className={index === trail.length - 1 ? 'crumb-here' : undefined}>
                    {crumb}
                  </span>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        <main id="main" className="page-content" ref={main} tabIndex={-1}>
          <PageName.Provider value={report}>
            <LessonOutline.Provider value={reportOutline}>{children}</LessonOutline.Provider>
          </PageName.Provider>
        </main>
      </div>
    </div>
  );
}
