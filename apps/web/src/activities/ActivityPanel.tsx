import type { LessonActivity, StoredResponse } from '../releaseTypes.js';
import type { LessonContext } from './recoveryFile.js';
import type { UnplacedReason } from './placeActivities.js';
import { useCallback, useState } from 'react';
import { ResponseField } from './ResponseField.js';
import { FeedbackArea } from './FeedbackArea.js';
import { useActivityFeedback } from './feedbackScope.js';

/**
 * What an activity looks like on the page: what it is, and one writing surface per field its
 * author declared.
 *
 * Through slice 9 this panel said, in as many words, that the app could not keep an answer, and
 * offered no box — not even a disabled one, because somebody would have typed into it and lost the
 * work. That sentence is gone because it stopped being true: every box here is backed by a write
 * the server acknowledges, and the state beside it says which (docs/specs/acknowledged-saves.md).
 */

/** The author's `kind` values, in words. An unknown one is shown as written, never guessed at. */
const KIND_WORDS: Readonly<Record<string, string>> = {
  interpretation: 'Interpretation',
  explanation: 'Explanation',
  prediction: 'Prediction',
  prediction_and_observation: 'Prediction and observation',
  local_practice: 'Local practice',
  judgment: 'Judgment',
};

/**
 * Why the panel is at the foot instead of beside its section. The missing case says "no section
 * with that heading" rather than "no heading with that name": a heading inside a quote or a list
 * item is a heading, and is in the contents list, but it does not open a section, so the stricter
 * sentence would be a claim the reader can see is false.
 */
function notPlacedText(activity: LessonActivity, reason: UnplacedReason): string {
  const named = `This activity belongs beside a section called “${activity.sourceHeading}”.`;
  return reason === 'heading_ambiguous'
    ? `${named} This lesson has more than one heading with that name, so it is shown here rather than beside a guess.`
    : `${named} This lesson has no section with that heading, so it is shown here instead.`;
}

export function ActivityPanel({
  activity,
  headingText,
  authoredHeading,
  notPlaced,
  responses,
  lessonContext,
  children,
}: {
  readonly activity: LessonActivity;
  /** The heading this panel sits under, or null when it could not be placed. */
  readonly headingText: string | null;
  /** The same heading as the author spelled it, when that differs from the rendered text. */
  readonly authoredHeading?: string | null;
  readonly notPlaced?: UnplacedReason;
  /** What the server has stored for this activity. Absent fields have nothing stored. */
  readonly responses?: readonly StoredResponse[] | undefined;
  /**
   * Which lesson this panel belongs to. Required, not defaulted: every box here can be asked for a
   * recovery file, and a file that cannot name its lesson, version and release is not one anybody
   * can place back a week later (docs/specs/save-failure-recovery.md, criterion F4).
   */
  readonly lessonContext: LessonContext;
  /** The rendered prompt, supplied only where the authored section is not on the page. */
  readonly children?: React.ReactNode;
}) {
  const kind = KIND_WORDS[activity.kind] ?? activity.kind;
  // The section's own heading is right there; printing it again a paragraph below is noise. Both
  // spellings count: a heading matched by the Markdown the author typed is still this heading, and
  // printing `What kind of action? \`GET\`` under a heading reading "What kind of action? GET"
  // repeats the name and shows the backticks. A title the author made genuinely different is not
  // noise, so that one is shown.
  const namesItsOwnHeading = activity.title === headingText || activity.title === authoredHeading;
  const showTitle = headingText === null || !namesItsOwnHeading;

  // Each box's text as typed, for feedback on the boxes as they are (practice-feedback PF1). Read
  // from the boxes, never written back to them.
  const [drafts, setDrafts] = useState<Readonly<Record<string, string>>>({});
  const onTextChange = useCallback((fieldName: string, text: string) => {
    setDrafts((known) => (known[fieldName] === text ? known : { ...known, [fieldName]: text }));
  }, []);
  const feedback = useActivityFeedback(activity.activityId);

  return (
    <aside
      className={`activity-panel${notPlaced ? ' activity-panel-unplaced' : ''}`}
      data-activity-id={activity.activityId}
      // A landmark with no name is one of three identical "complementary" regions per lesson to
      // anybody navigating by landmark. Naming it costs no visible structure.
      aria-label={`${kind}, ${activity.activityId}`}
    >
      <p className="eyebrow activity-kind">
        {kind} · <span className="activity-id">{activity.activityId}</span>
      </p>

      {showTitle && <p className="activity-title">{activity.title}</p>}

      {notPlaced && <p className="activity-not-placed">{notPlacedText(activity, notPlaced)}</p>}

      {children}

      {activity.responseFields.map((fieldName) => (
        <ResponseField
          key={fieldName}
          activityId={activity.activityId}
          fieldName={fieldName}
          stored={responses?.find(
            (one) => one.activityId === activity.activityId && one.fieldName === fieldName,
          )}
          lessonContext={lessonContext}
          onTextChange={onTextChange}
        />
      ))}

      {feedback && (
        <FeedbackArea
          activityId={activity.activityId}
          activityTitle={activity.title}
          fieldNames={activity.responseFields}
          drafts={drafts}
          area={feedback.area}
          availability={feedback.availability}
        />
      )}
    </aside>
  );
}
