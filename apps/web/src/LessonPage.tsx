import { useApi, type ApiResult } from './api.js';
import { LessonMarkdown } from './markdown/LessonMarkdown.js';
import { RouteLink } from './RouteLink.js';
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

function FactList({ facts }: { readonly facts: readonly LessonFact[] }) {
  if (facts.length === 0) return null;

  return (
    <div className="lesson-facts-panel">
      <h2>About this lesson</h2>
      <dl>
        {facts.map((fact) => (
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
    </div>
  );
}

export function LessonPage({ candidateLessonId }: { readonly candidateLessonId: string }) {
  const view = toLessonView(
    useApi(`/api/lessons/${encodeURIComponent(candidateLessonId)}`),
    candidateLessonId,
  );

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
    <article className="lesson">
      <BackToLessons />
      <h1>{lesson.displayTitle}</h1>
      <p className="lesson-provenance">
        Lesson {lesson.order} · {lesson.candidateLessonId} · content version {lesson.contentVersion}{' '}
        · release {release.releaseId} {release.version}
      </p>
      <FactList facts={lesson.facts} />
      <LessonMarkdown markdown={lesson.bodyMarkdown} />
    </article>
  );
}
