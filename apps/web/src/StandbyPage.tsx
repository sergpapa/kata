import { RouteLink } from './RouteLink.js';
import { useReportPageName } from './Shell.js';
import type { StandbySection } from './route.js';

/**
 * The three destinations the sidebar names whose work is not built. Criteria P1 and P2 in
 * docs/specs/visual-design-integration.md.
 *
 * Each says what it will hold and which milestone builds it, and shows nothing else. The failure
 * these pages invite is a plausible sample — three example reviews, a count of zero, a date — and
 * a sample is indistinguishable from a record to the person reading it. So there is no number on
 * these pages except the milestone's, and the test enforces exactly that.
 */

const pages: Readonly<Record<StandbySection, { title: string; what: string; when: string }>> = {
  practice: {
    title: 'Practice',
    what: 'This is where the local lab kits will be. Each lesson that has one gets its own download, served with the version identity the release gives it, beside copy-exact commands for your own terminal — copied when you ask, never run for you.',
    when: 'Nothing here yet. Lab downloads are Milestone 3 of the roadmap.',
  },
  reviews: {
    title: 'Reviews',
    what: 'This is where feedback from the content author will appear, kept against the lesson and the content version you were reading when you wrote the note it answers.',
    when: 'Nothing here yet, and nothing is invented to fill the space. Sending your work back to the author is Milestone 3 of the roadmap.',
  },
  progress: {
    title: 'Progress',
    what: 'This is where your own record will be: which lessons you have opened, what you predicted before running a command, and what you found when you ran it.',
    when: 'Nothing here yet. This application does not record what you read — acknowledged saving is Milestone 2 of the roadmap.',
  },
};

export function StandbyPage({ section }: { readonly section: StandbySection }) {
  const page = pages[section];
  useReportPageName(page.title);

  return (
    <>
      <header className="page-title">
        <div>
          <p className="eyebrow">NOT IN THIS TRIAL YET</p>
          <h1>{page.title}</h1>
          <p className="lede">{page.what}</p>
        </div>
      </header>

      <section className="card standby-card">
        <p>{page.when}</p>
        <p className="fine">
          <RouteLink href="/">Back to the lessons</RouteLink>
        </p>
      </section>
    </>
  );
}
