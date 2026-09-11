import { useEffect, useRef } from 'react';
import { LessonPage } from './LessonPage.js';
import { ReleasePage } from './ReleasePage.js';
import { RouteLink } from './RouteLink.js';
import { useRoute } from './route.js';

/** The shell every address shares, plus the one decision about which page the address names. */
export function App() {
  const route = useRoute();
  const main = useRef<HTMLElement>(null);
  const settled = useRef(false);

  // A keyboard or screen-reader user who follows a lesson link would otherwise be left with focus
  // on `body`, at the top of a document they have no idea changed. Moving focus to the new page's
  // region announces the change and puts the next Tab in the right place. Skipped on first paint,
  // where nothing has changed yet and stealing focus would be wrong.
  useEffect(() => {
    if (settled.current) main.current?.focus();
    settled.current = true;
  }, [route.kind, route.kind === 'lesson' ? route.candidateLessonId : '']);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <p className="site-name">EduCode</p>
        <p className="site-scope">HTTP Lessons 1–5 · owner rehearsal</p>
      </header>
      <main id="main" className="reading-column" ref={main} tabIndex={-1}>
        {route.kind === 'home' && <ReleasePage />}
        {route.kind === 'lesson' && <LessonPage candidateLessonId={route.candidateLessonId} />}
        {route.kind === 'unknown' && (
          <>
            <h1>There is no page at this address</h1>
            <p>
              Nothing in this app answers to <code>{route.path}</code>.
            </p>
            <p>
              <RouteLink href="/">All lessons</RouteLink>
            </p>
          </>
        )}
      </main>
    </>
  );
}
