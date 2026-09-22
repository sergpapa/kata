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
  children,
}: {
  readonly activity: LessonActivity;
  /** The heading this panel sits under, or null when it could not be placed. */
  readonly headingText: string | null;
  /** The same heading as the author spelled it, when that differs from the rendered text. */
  readonly authoredHeading?: string | null;
  readonly notPlaced?: UnplacedReason;
  /** The rendered prompt, supplied only where the authored section is not on the page. */
  readonly children?: React.ReactNode;
}) {
  const kind = KIND_WORDS[activity.kind] ?? activity.kind;
  const asks = activity.responseFields.map((field) => FIELD_WORDS[field] ?? field);
  // The section's own heading is right there; printing it again a paragraph below is noise. Both
  // spellings count: a heading matched by the Markdown the author typed is still this heading, and
  // printing `What kind of action? \`GET\`` under a heading reading "What kind of action? GET"
  // repeats the name and shows the backticks. A title the author made genuinely different is not
  // noise, so that one is shown.
  const namesItsOwnHeading = activity.title === headingText || activity.title === authoredHeading;
  const showTitle = headingText === null || !namesItsOwnHeading;

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

      {asks.length > 0 && <p className="activity-asks">This activity asks for {inWords(asks)}.</p>}

      <p className="activity-no-store">
        The app cannot store any of it yet, so there is nowhere here to write it.
      </p>
    </aside>
  );
}
