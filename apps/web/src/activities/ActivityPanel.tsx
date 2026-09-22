import type { LessonActivity } from '../releaseTypes.js';
import type { UnplacedReason } from './placeActivities.js';

/**
 * What an activity looks like on the page while the app cannot yet keep an answer to it.
 *
 * It says what the author asks for and states, without hedging, that there is nowhere to write it.
 * There is deliberately no box — not even a disabled one. Somebody would type into it and lose the
 * work, which is the single failure Milestone 2 exists to prevent (docs/specs/activity-placement.md
 * decision 1).
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

/** The same for `response_fields`, phrased as the thing the learner would supply. */
const FIELD_WORDS: Readonly<Record<string, string>> = {
  prediction: 'your prediction',
  observation: 'what you observed',
  explanation: 'your explanation',
  help_used: 'whether you used help',
};

function inWords(values: readonly string[]): string {
  if (values.length <= 1) return values.join('');
  return `${values.slice(0, -1).join(', ')} and ${values[values.length - 1]}`;
}

function notPlacedText(activity: LessonActivity, reason: UnplacedReason): string {
  const named = `This activity belongs beside a section called “${activity.sourceHeading}”.`;
  return reason === 'heading_ambiguous'
    ? `${named} This lesson has more than one heading with that name, so it is shown here rather than beside a guess.`
    : `${named} This lesson has no heading with that name, so it is shown here instead.`;
}

export function ActivityPanel({
  activity,
  headingText,
  notPlaced,
  children,
}: {
  readonly activity: LessonActivity;
  /** The heading this panel sits under, or null when it could not be placed. */
  readonly headingText: string | null;
  readonly notPlaced?: UnplacedReason;
  /** The rendered prompt, supplied only where the authored section is not on the page. */
  readonly children?: React.ReactNode;
}) {
  const asks = activity.responseFields.map((field) => FIELD_WORDS[field] ?? field);
  // The section's own heading is right there; printing it again a paragraph below is noise. A
  // title the author made different from the heading is not, so it is shown.
  const showTitle = headingText === null || headingText !== activity.title;

  return (
    <aside
      className={`activity-panel${notPlaced ? ' activity-panel-unplaced' : ''}`}
      data-activity-id={activity.activityId}
    >
      <p className="eyebrow activity-kind">
        {KIND_WORDS[activity.kind] ?? activity.kind} · {activity.activityId}
      </p>

      {showTitle && <p className="activity-title">{activity.title}</p>}

      {notPlaced && <p className="activity-not-placed">{notPlacedText(activity, notPlaced)}</p>}

      {children}

      {asks.length > 0 && <p className="activity-asks">This activity asks for {inWords(asks)}.</p>}

      <p className="activity-no-store">
        The app cannot store any of it yet, so there is nowhere here to write it.
      </p>
    </aside>
  );
}
