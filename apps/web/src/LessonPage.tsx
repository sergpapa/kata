import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApi, type ApiResult } from './api.js';
import { LessonMarkdown, type OutlineEntry } from './markdown/LessonMarkdown.js';
import { CourseScope, courseApi } from './course.js';
import { BackToLessons, NeighbourNav, type LessonNeighbour } from './LessonNav.js';
import { useReportLessonOutline, useReportPageName } from './Shell.js';
import { ActivityPanel } from './activities/ActivityPanel.js';
import { FeedbackScope } from './activities/feedbackScope.js';
import type { LessonFeedback } from './activities/feedbackTypes.js';
import type { LessonContext } from './activities/recoveryFile.js';
import type { UnplacedActivity } from './activities/placeActivities.js';
import { LabKitPanel } from './LabKitPanel.js';
import type {
  ImportFailure,
  LabKit,
  LessonActivity,
  LessonSummary,
  StoredResponse,
} from './releaseTypes.js';

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

/**
 * Whether two reports name the same activities, unplaced for the same reasons. The renderer hands
 * back a fresh array every pass, so without this the page would store each one and re-render for
 * ever.
 */
function sameActivities(
  left: readonly UnplacedActivity[],
  right: readonly UnplacedActivity[],
): boolean {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.activity.activityId === right[index]?.activity.activityId &&
        entry.reason === right[index]?.reason,
    )
  );
}

/**
 * The activities the body could not carry, at the foot of the lesson rather than dropped.
 *
 * This is the guard path, not the expected one: all 45 activities in the shipped release name a
 * heading their lesson has. A release that renames one still reads, and the reader is told which
 * section the activity was written for (docs/specs/activity-placement.md, U1–U3).
 */
function UnplacedActivities({
  unplaced,
  responses,
  lessonContext,
}: {
  readonly unplaced: readonly UnplacedActivity[];
  readonly responses: readonly StoredResponse[];
  readonly lessonContext: LessonContext;
}) {
  if (unplaced.length === 0) return null;

  return (
    <section className="activity-foot" aria-label="Activities with no section on this page">
      {unplaced.map(({ activity, reason }) => (
        <ActivityPanel
          key={activity.activityId}
          activity={activity}
          headingText={null}
          notPlaced={reason}
          responses={responses}
          lessonContext={lessonContext}
        >
          {/* The one place the prompt is rendered, and only when the section is genuinely absent.
              An ambiguous heading means the section IS on the page — twice — so showing the
              prompt would put the authored excerpt there a third time, which is exactly what the
              activity file's own presentation rule forbids. No ids either: a second Markdown pass
              slugs independently of the body's. */}
          {reason === 'heading_missing' && (
            <div className="activity-prompt">
              <LessonMarkdown markdown={activity.promptMarkdown} headingIds={false} />
            </div>
          )}
        </ActivityPanel>
      ))}
    </section>
  );
}

type LessonView =
  | { readonly state: 'reading' }
  | {
      readonly state: 'lesson';
      readonly release: { readonly releaseId: string; readonly version: string };
      readonly lesson: LessonDetail;
      /** The kit this lesson declares, or null when it declares none (lesson 1 alone). */
      readonly labKit: LabKit | null;
      readonly activities: readonly LessonActivity[];
      readonly responses: readonly StoredResponse[];
      /** Practice feedback for the lesson's activities; absent from an older server (PF11). */
      readonly feedback?: LessonFeedback;
      /**
       * What a recovery file says about where an answer came from (criterion F4).
       *
       * Built here, once per answer, rather than in the render body — and that placement is
       * load-bearing, not tidiness. `LessonMarkdown` memoises its component map on this, so a fresh
       * object every render gives React a new component identity for the activity panels, which
       * unmounts and remounts every box on the lesson and takes the reader's typed text with it.
       * Found by `unsavedNavigation.test.tsx`, which noticed a field had gone missing from the
       * unsaved registry — the visible end of losing twelve boxes of work on any re-render.
       */
      readonly lessonContext: LessonContext;
      readonly previous: LessonNeighbour | null;
      readonly next: LessonNeighbour | null;
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
  if (body?.state === 'failed') return body as LessonView;
  if (body?.state === 'lesson') {
    const answered = body as Omit<Extract<LessonView, { state: 'lesson' }>, 'lessonContext'>;
    return {
      ...answered,
      lessonContext: {
        order: answered.lesson.order,
        candidateLessonId: answered.lesson.candidateLessonId,
        displayTitle: answered.lesson.displayTitle,
        contentVersion: answered.lesson.contentVersion,
        releaseId: answered.release.releaseId,
        releaseVersion: answered.release.version,
      },
    };
  }
  return { state: 'unavailable', reason: 'The app answered in a shape this page cannot read.' };
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

/**
 * One lesson, read through one course (ADR 0018). Everything below it that links, downloads or
 * saves takes its course from the scope set here, so no control on the page can address another
 * course's lesson.
 */
export function LessonPage({
  courseId,
  candidateLessonId,
}: {
  readonly courseId: string;
  readonly candidateLessonId: string;
}) {
  return (
    <CourseScope courseId={courseId}>
      <LessonPageBody courseId={courseId} candidateLessonId={candidateLessonId} />
    </CourseScope>
  );
}

function LessonPageBody({
  courseId,
  candidateLessonId,
}: {
  readonly courseId: string;
  readonly candidateLessonId: string;
}) {
  const answer = useApi(`${courseApi(courseId)}/lessons/${encodeURIComponent(candidateLessonId)}`);
  /**
   * One view per answer, not one per render — and this memo is load-bearing, not an optimisation.
   *
   * `LessonMarkdown` memoises the component map it hands react-markdown on the activity props, so a
   * view rebuilt every render gives React a new component identity for the activity panels. React
   * treats a new type as a different component: it unmounts the old subtree and mounts a fresh one,
   * and every box on the lesson loses the text the reader had typed into it.
   *
   * Until slice 13 this was stable by accident — `toLessonView` returned the parsed body itself, the
   * same object `useApi` was holding. The moment it derived anything (`lessonContext`), the accident
   * ended and twelve boxes a lesson became droppable on any re-render. `unsavedNavigation.test.tsx`
   * caught it as a field missing from the unsaved dialog, 2 runs in 10.
   */
  const view = useMemo(() => toLessonView(answer, candidateLessonId), [answer, candidateLessonId]);

  // The top bar's trail ends in this page's name, and the authored title is content only this
  // request has seen. Reported before any early return, because a hook cannot be conditional.
  useReportPageName(view.state === 'lesson' ? view.lesson.displayTitle : null);

  // The sidebar's contents list, reported the same way. Cleared when this lesson leaves the page
  // or another is asked for, so no outline outlives the body it describes.
  const reportOutline = useReportLessonOutline();
  const handleOutline = useCallback(
    (entries: readonly OutlineEntry[]) => reportOutline(entries),
    [reportOutline],
  );
  useEffect(() => {
    return () => reportOutline(null);
  }, [reportOutline, candidateLessonId]);

  // Which activities the body could not place. Kept only when the answer actually changed: the
  // renderer reports a fresh array on every pass, and storing each one would set state in a loop.
  const [unplaced, setUnplaced] = useState<readonly UnplacedActivity[]>([]);
  const handleUnplaced = useCallback((reported: readonly UnplacedActivity[]) => {
    setUnplaced((current) => (sameActivities(current, reported) ? current : reported));
  }, []);

  // The resume point: recorded only once the lesson actually answered, silently (ADR 0010). No
  // state, no retry, no message — a failed write leaves the previous record standing, and the next
  // lesson open corrects it.
  const openedLesson = view.state === 'lesson' ? view.lesson.candidateLessonId : null;
  useEffect(() => {
    if (!openedLesson) return;
    void fetch(`${courseApi(courseId)}/resume-point`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ candidateLessonId: openedLesson }),
    }).catch(() => {});
  }, [courseId, openedLesson]);

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

  const { lesson, release, lessonContext } = view;
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
      <LabKitPanel labKit={view.labKit ?? null} />
      <FeedbackScope feedback={view.feedback ?? null}>
        <LessonMarkdown
          markdown={lesson.bodyMarkdown}
          activities={view.activities}
          responses={view.responses}
          lessonContext={lessonContext}
          onOutline={handleOutline}
          onUnplacedActivities={handleUnplaced}
        />
        <UnplacedActivities
          unplaced={unplaced}
          responses={view.responses}
          lessonContext={lessonContext}
        />
      </FeedbackScope>
      <NeighbourNav previous={view.previous} next={view.next} />
    </article>
  );
}
