import { useApi, type ApiResult } from './api.js';
import { courseApi } from './course.js';
import { ExportCard } from './ExportCard.js';
import { twoDigits } from './format.js';
import { ArrowRightIcon, ChevronRightIcon } from './icons.js';
import { RouteLink } from './RouteLink.js';
import { lessonHref } from './route.js';
import type { LessonSummary, ReleaseView } from './releaseTypes.js';

/**
 * The page that answers "where do I begin?" — or, once a lesson has been opened, "where was I?".
 * Criteria D1–D6 in docs/specs/visual-design-integration.md and R3–R5 in
 * docs/specs/reader-navigation-and-resume.md.
 *
 * It answers out of the release and the resume point, and out of nothing else. The one recorded
 * fact is which lesson was last *opened* — so that is the word the card uses, never read, studied
 * or completed, and there is still no ratio and no bar anywhere on the page.
 */

/** Manifest order, not array order: the release decides the sequence, not the JSON's shape. */
function inOrder(lessons: readonly LessonSummary[]): readonly LessonSummary[] {
  return [...lessons].sort((a, b) => a.order - b.order);
}

/**
 * What the resume answer amounts to. Anything that is not a well-formed `set` — none, an old
 * server, a refusal, a request still in flight — reads as "nothing recorded", because the only
 * honest fallback is the start of the release.
 */
function resumeLessonId(result: ApiResult): string | null {
  if (result.state !== 'answered' || result.status !== 200) return null;
  const body = result.body as { state?: unknown; candidateLessonId?: unknown } | null;
  if (body?.state !== 'set' || typeof body.candidateLessonId !== 'string') return null;
  return body.candidateLessonId;
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

export function DashboardPage({
  courseId,
  view,
}: {
  readonly courseId: string;
  readonly view: ReleaseView;
}) {
  // Asked before any early return, because a hook cannot be conditional.
  const resume = useApi(`${courseApi(courseId)}/resume-point`);

  // Held until BOTH answers are in (/code-review finding): a card drawn before the resume answer
  // says Start for lesson 1, and following that transient link records lesson 1 over the reader's
  // real place. An unanswered request is not "none" — but a settled failure is, because the only
  // honest fallback is the start of the release.
  if (view.state === 'reading' || resume.state === 'reading') {
    return <p role="status">Reading the release…</p>;
  }
  const resumeId = resumeLessonId(resume);

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
  // The guard against a stale pointer runs here too: a resume point naming a lesson this release
  // does not carry falls back to the start, rather than linking to a page that would say 404.
  const resumeLesson = resumeId
    ? lessons.find((entry) => entry.candidateLessonId === resumeId)
    : undefined;
  const current = resumeLesson ?? first;

  return (
    <>
      <p className="lesson-back">
        <RouteLink href="/">All courses</RouteLink>
      </p>
      <header className="page-title">
        <div>
          <p className="eyebrow">YOUR LEARNING PLAN</p>
          <h1>{resumeLesson ? 'Pick up where you left off.' : 'Start with the first lesson.'}</h1>
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
        {current && (
          <section className="continue-card" data-testid="current-lesson">
            {/* Ornament, not information: the same two digits the LESSON line announces, at card
                scale behind the content. Drawn by CSS from the attribute rather than written as
                text, so it is not in the card's text (a copy, a contrast check) and nothing is said
                twice (docs/specs/accessibility-pass.md AX10, AX4a). */}
            <span
              className="continue-ghost"
              aria-hidden="true"
              data-ghost={twoDigits(current.order)}
            />
            <p className="card-kicker">
              {/* "Last opened" is the whole recorded fact — the card claims nothing about how far
                  it was followed, because the app cannot know. */}
              <span className="pill lime">
                {resumeLesson ? 'LAST OPENED' : 'FIRST IN THE RELEASE'}
              </span>
            </p>
            <p className="lesson-number">LESSON {twoDigits(current.order)}</p>
            <h2>{current.displayTitle}</h2>
            <RouteLink
              className="lime-button"
              href={lessonHref(courseId, current.candidateLessonId)}
            >
              {resumeLesson ? 'Continue lesson' : 'Start lesson'}
              <ArrowRightIcon />
            </RouteLink>
          </section>
        )}

        <ExportCard courseId={courseId} lessons={lessons} />
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
                <RouteLink href={lessonHref(courseId, lesson.candidateLessonId)}>
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
