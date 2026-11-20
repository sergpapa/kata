import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { fieldLabel } from './fieldLabels.js';
import type { FeedbackTurn } from './feedbackTypes.js';

/**
 * One conversation, as the page shows it (docs/specs/practice-feedback.md PF5, PF8, PF10, PF12,
 * PF16).
 *
 * Claude's words go through the lesson's own Markdown renderer, which is sanitised and keeps code
 * inert, because they are text the app did not write. A reply that was cut off is shown under its
 * reason and called unfinished, never presented as a reply.
 */

function SentFields({ fields }: { readonly fields: NonNullable<FeedbackTurn['sentFields']> }) {
  return (
    <details className="feedback-sent">
      <summary className="feedback-sent-summary">What you sent</summary>
      <dl className="feedback-sent-list">
        {fields.map((field) => (
          <div key={field.fieldName} className="feedback-sent-field">
            <dt>{fieldLabel(field.fieldName)}</dt>
            <dd>{field.text.trim() === '' ? '(left empty)' : field.text}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function LearnerTurn({ turn }: { readonly turn: FeedbackTurn }) {
  return (
    <li className="feedback-turn feedback-turn-learner">
      <p className="feedback-turn-label">You</p>
      {turn.sentFields ? (
        <>
          <p className="feedback-turn-text">Asked for feedback on your answers.</p>
          <SentFields fields={turn.sentFields} />
        </>
      ) : (
        <p className="feedback-turn-text">{turn.text}</p>
      )}
    </li>
  );
}

function ClaudeTurn({
  turn,
  activityTitle,
}: {
  readonly turn: FeedbackTurn;
  readonly activityTitle: string;
}) {
  // Names this reply's tables, samples and diagrams apart from the body's (accessibility-pass AX7).
  const place = `Claude’s reply ${turn.turn} on ${activityTitle}`;
  const label = `AI feedback · ${turn.model ?? 'model not reported'}`;
  if (turn.outcome === 'failed') {
    return (
      <li className="feedback-turn feedback-turn-claude" data-outcome="stopped">
        <p className="feedback-turn-label">{label}</p>
        <p className="feedback-stopped">{turn.failure}</p>
        {turn.text.trim() !== '' && (
          <div className="feedback-unfinished">
            <p className="feedback-unfinished-lead">
              Unfinished: what Claude had written before it stopped.
            </p>
            <div className="feedback-reply">
              <LessonMarkdown markdown={turn.text} headingIds={false} place={place} />
            </div>
          </div>
        )}
      </li>
    );
  }
  return (
    <li className="feedback-turn feedback-turn-claude">
      <p className="feedback-turn-label">{label}</p>
      <div className="feedback-reply">
        <LessonMarkdown markdown={turn.text} headingIds={false} place={place} />
      </div>
    </li>
  );
}

export function FeedbackTurns({
  turns,
  writing,
  activityTitle,
  label = 'Conversation',
}: {
  readonly turns: readonly FeedbackTurn[];
  /** The activity these turns belong to, named in each reply's region names. */
  readonly activityTitle: string;
  /** Text Claude is writing now, shown as it arrives and replaced by the stored reply. */
  readonly writing: string | null;
  /** The list's accessible name; an earlier conversation names itself by when it ended (EC9). */
  readonly label?: string;
}) {
  return (
    <ol className="feedback-turns" aria-label={label} aria-busy={writing !== null}>
      {turns.map((turn) =>
        turn.role === 'learner' ? (
          <LearnerTurn key={turn.turn} turn={turn} />
        ) : (
          <ClaudeTurn key={turn.turn} turn={turn} activityTitle={activityTitle} />
        ),
      )}
      {writing !== null && (
        <li className="feedback-turn feedback-turn-claude">
          <p className="feedback-turn-label">Claude is replying…</p>
          {writing !== '' && <p className="feedback-writing">{writing}</p>}
        </li>
      )}
    </ol>
  );
}
