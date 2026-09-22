import { ArrowRightIcon, ChevronRightIcon } from './icons.js';
import { RouteLink } from './RouteLink.js';
import { lessonHref } from './route.js';
import type { LessonSummary, ReleaseView } from './releaseTypes.js';

/**
 * The page that answers "where do I begin?". Criteria D1–D6 in
 * docs/specs/visual-design-integration.md.
 *
 * It answers out of the release and out of nothing else. This application records nothing about
 * what has been read, so the action is **Start** rather than Continue, there is no ratio and no
 * bar anywhere on it, and the neighbouring card says plainly that nothing is kept yet. A number
 * here that nothing backs is the failure this page is shaped to avoid.
 */

/** Manifest order, not array order: the release decides the sequence, not the JSON's shape. */
function inOrder(lessons: readonly LessonSummary[]): readonly LessonSummary[] {
  return [...lessons].sort((a, b) => a.order - b.order);
}

function twoDigits(order: number): string {
  return String(order).padStart(2, '0');
}

function ReleaseDetails({
  release,
  lessons,
}: {
  readonly release: Extract<ReleaseView, { state: 'imported' }>['release'];
  readonly lessons: readonly LessonSummary[];
}) {
  return (
    <details className="card release-details">
      <summary>Release details</summary>
      <p className="fine">
        Release {release.releaseId}, version {release.version}
        {release.date ? `, dated ${release.date}` : ''}.
      </p>
      <dl className="compact-dl">
        {lessons.map((lesson) => (
          <div key={lesson.candidateLessonId}>
            <dt>{lesson.candidateLessonId}</dt>
            <dd>
              <span className="no-wrap">version {lesson.contentVersion}</span>{' '}
              <span className="no-wrap">
                {lesson.labId ? `lab kit ${lesson.labId}` : 'no lab kit'}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="fine">
        Every file above was checked against the hash the release publishes, on this start.
      </p>
    </details>
  );
}

export function DashboardPage({ view }: { readonly view: ReleaseView }) {
  if (view.state === 'reading') return <p role="status">Reading the release…</p>;

  if (view.state === 'unavailable') {
    return (
      <p role="alert" className="notice notice-bad">
        The local app did not answer: {view.reason}
      </p>
    );
  }

  if (view.state === 'failed') {
    return (
      <>
        <p role="alert" className="notice notice-bad">
          {view.failure.message}
        </p>
        <p>
          No lesson has been imported. Nothing here is filled in with substitute content — the
          release is refused whole until the file above matches what the release says it is.
        </p>
      </>
    );
  }

  const lessons = inOrder(view.lessons);
  const first = lessons[0];

  return (
    <>
      <header className="page-title">
        <div>
          <p className="eyebrow">YOUR LEARNING PLAN</p>
          <h1>Start with the first lesson.</h1>
          <p className="lede">
            The release fixes the order. Each lesson is here as its author wrote it, checked against
            the hash the release publishes.
          </p>
        </div>
      </header>

      {/* The author's own caveat about this release, never behind a disclosure: the brief's
          no-overstated-claims rule makes it the one fact here a reader cannot be allowed to miss. */}
      {view.release.status && (
        <p className="notice release-status">
          <strong>About this release:</strong> {view.release.status}
        </p>
      )}

      <div className="overview-grid">
        {first && (
          <section className="continue-card" data-testid="current-lesson">
            {/* Ornament, not information: the same two digits the LESSON line announces, at card
                scale behind the content. Hidden from readers so nothing is said twice. */}
            <span className="continue-ghost" aria-hidden="true">
              {twoDigits(first.order)}
            </span>
            <p className="card-kicker">
              <span className="pill lime">FIRST IN THE RELEASE</span>
            </p>
            <p className="lesson-number">LESSON {twoDigits(first.order)}</p>
            <h2>{first.displayTitle}</h2>
            <RouteLink className="lime-button" href={lessonHref(first.candidateLessonId)}>
              Start lesson
              <ArrowRightIcon />
            </RouteLink>
          </section>
        )}

        <section className="card records-card">
          <h2>Your records</h2>
          <p>
            Nothing is recorded yet. This application does not keep what you read or write — your
            notes, your predictions and where you stopped all arrive with acknowledged saving, in
            Milestone 2.
          </p>
          <p className="fine">
            Until then nothing here would survive a refresh, so nothing pretends to.
          </p>
        </section>
      </div>

      <div className="section-heading">
        <h2>Lessons, in the order the release gives them</h2>
      </div>

      <ol className="lesson-list">
        {lessons.map((lesson) => (
          <li className="lesson-row" key={lesson.candidateLessonId}>
            <span className="lesson-index">{twoDigits(lesson.order)}</span>
            <span className="lesson-label">
              <h3 className="lesson-title">
                <RouteLink href={lessonHref(lesson.candidateLessonId)}>
                  {lesson.displayTitle}
                </RouteLink>
              </h3>
              <small>version {lesson.contentVersion}</small>
            </span>
            <ChevronRightIcon />
          </li>
        ))}
      </ol>

      <ReleaseDetails release={view.release} lessons={lessons} />
    </>
  );
}
