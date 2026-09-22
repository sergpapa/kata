import { useApi, type ApiResult } from './api.js';
import { LessonMarkdown } from './markdown/LessonMarkdown.js';
import { RouteLink } from './RouteLink.js';
import { useReportPageName } from './Shell.js';
import type { ImportFailure, LessonSummary } from './releaseTypes.js';

/** One lesson to read: the authored title, the facts a learner is shown, and the body. */

export interface LessonFact {
  readonly key: string;
  readonly label: string;
  readonly kind: 'line' | 'list';
  readonly text?: string;
  readonly items?: readonly string[];
}

export interface LessonDetail extends LessonSummary {
  readonly facts: readonly LessonFact[];
  readonly bodyMarkdown: string;
}

type LessonView =
  | { readonly state: 'reading' }
  | {
      readonly state: 'lesson';
      readonly release: { readonly releaseId: string; readonly version: string };
      readonly lesson: LessonDetail;
    }
  /** The release was refused whole. Said in the server's own words, not translated. */
  | { readonly state: 'failed'; readonly failure: ImportFailure }
  | { readonly state: 'missing'; readonly message: string }
  | { readonly state: 'unavailable'; readonly reason: string };

function toLessonView(result: ApiResult, candidateLessonId: string): LessonView {
  if (result.state === 'reading') return { state: 'reading' };
  if (result.state === 'unavailable') return { state: 'unavailable', reason: result.reason };

  const body = result.body as Partial<LessonView> & { message?: string };

  if (result.status === 404) {
    return {
      state: 'missing',
      message: body?.message ?? `This release has no lesson ${candidateLessonId}.`,
    };
  }
  if (result.status !== 200) {
    return { state: 'unavailable', reason: `The app answered with status ${result.status}.` };
  }
  if (body?.state === 'failed' || body?.state === 'lesson') return body as LessonView;
  return { state: 'unavailable', reason: 'The app answered in a shape this page cannot read.' };
}

function BackToLessons() {
  return (
    <p className="lesson-back">
      <RouteLink href="/">All lessons</RouteLink>
    </p>
  );
}

/**
 * The author's own `status` caveat is lifted out and always visible. On Lesson 1 it reads "not yet
 * learner-tested", and the brief's no-overstated-claims rule makes that the one fact here that
 * cannot be behind a disclosure.
 *
 * The rest — audience, prerequisites, outcomes, scope — is useful but is not the lesson. Left
 * expanded it pushed the first sentence of Lesson 2 more than a screen and a half down a phone,
 * so the reader tapped a title and saw no lesson at all.
 */
function FactList({ facts }: { readonly facts: readonly LessonFact[] }) {
  const status = facts.find((fact) => fact.key === 'status');
  const rest = facts.filter((fact) => fact.key !== 'status');

  return (
    <>
      {status?.text && (
        <p className="lesson-status">
          <span className="lesson-status-label">Status</span>{' '}
          <span className="lesson-status-text">{status.text}</span>
        </p>
      )}

      {rest.length > 0 && (
        <details className="lesson-facts-panel">
          <summary>About this lesson</summary>
          <dl>
            {rest.map((fact) => (
              <div key={fact.key} className="lesson-fact">
                <dt>{fact.label}</dt>
                <dd>
                  {fact.kind === 'list' ? (
                    <ul>
                      {(fact.items ?? []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    fact.text
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </>
  );
}

export function LessonPage({ candidateLessonId }: { readonly candidateLessonId: string }) {
  const view = toLessonView(
    useApi(`/api/lessons/${encodeURIComponent(candidateLessonId)}`),
    candidateLessonId,
  );

  // The top bar's trail ends in this page's name, and the authored title is content only this
  // request has seen. Reported before any early return, because a hook cannot be conditional.
  useReportPageName(view.state === 'lesson' ? view.lesson.displayTitle : null);

  if (view.state === 'reading') return <p role="status">Reading the lesson…</p>;

  if (view.state === 'unavailable') {
    return (
      <>
        <p role="alert" className="notice notice-bad">
          The local app did not answer: {view.reason}
        </p>
        <BackToLessons />
      </>
    );
  }

  if (view.state === 'failed') {
    return (
      <>
        <p role="alert" className="notice notice-bad">
          {view.failure.message}
        </p>
        <p>
          No lesson can be shown while the release stands refused. Nothing here is filled in with
          substitute content.
        </p>
        <BackToLessons />
      </>
    );
  }

  if (view.state === 'missing') {
    return (
      <>
        <p role="alert" className="notice notice-bad">
          {view.message}
        </p>
        <BackToLessons />
      </>
    );
  }

  const { lesson, release } = view;
  return (
    <article className="card lesson-reader">
      <BackToLessons />
      <h1>{lesson.displayTitle}</h1>
      {/* No `no-wrap` on the release segment: `white-space: nowrap` beats `overflow-wrap:
          anywhere`, and at 375px the un-wrappable release ID ran flush to the card's border —
          on every lesson, since they all carry the same release. Wrapping mid-segment is the
          lesser cost. */}
      <p className="lesson-provenance">
        Lesson {lesson.order} · {lesson.candidateLessonId} · content version {lesson.contentVersion}{' '}
        · release {release.releaseId} {release.version}
      </p>
      <FactList facts={lesson.facts} />
      <LessonMarkdown markdown={lesson.bodyMarkdown} />
    </article>
  );
}
