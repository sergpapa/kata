import { LessonPage } from './LessonPage.js';
import { ReleasePage } from './ReleasePage.js';
import { RouteLink } from './RouteLink.js';
import { useRoute } from './route.js';

/** The shell every address shares, plus the one decision about which page the address names. */
export function App() {
  const route = useRoute();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <p className="site-name">EduCode</p>
        <p className="site-scope">HTTP Lessons 1–5 · owner rehearsal</p>
      </header>
      <main id="main" className="reading-column">
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
