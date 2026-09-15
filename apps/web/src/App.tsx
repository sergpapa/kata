import { useApi } from './api.js';
import { DashboardPage } from './DashboardPage.js';
import { LessonPage } from './LessonPage.js';
import { releaseViewOf } from './releaseView.js';
import { RouteLink } from './RouteLink.js';
import { useRoute } from './route.js';
import { Shell } from './Shell.js';
import { StandbyPage } from './StandbyPage.js';

/**
 * One decision about which page the address names, inside the shell they all share.
 *
 * The release is fetched here rather than by the dashboard, because two things need it: the page
 * that lists the lessons, and the sidebar that states which release is loaded and how large it is.
 * A second request for the same answer would be two chances to disagree.
 */
export function App() {
  const route = useRoute();
  const release = releaseViewOf(useApi('/api/release'));

  return (
    <Shell route={route} release={release}>
      {route.kind === 'home' && <DashboardPage view={release} />}
      {route.kind === 'lesson' && <LessonPage candidateLessonId={route.candidateLessonId} />}
      {route.kind === 'standby' && <StandbyPage section={route.section} />}
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
    </Shell>
  );
}
