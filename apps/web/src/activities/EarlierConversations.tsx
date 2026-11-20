import { timeOnDay } from '../format.js';
import type { EarlierConversation } from './feedbackTypes.js';
import { FeedbackTurns } from './FeedbackTurns.js';

/**
 * The conversations Start over hid, read-only (docs/specs/earlier-conversations.md EC4–EC9).
 *
 * A closed `details`, so it costs one line on every activity and is operable by keyboard and
 * screen reader without a key handler. The turns are drawn by the same component as the current
 * conversation but nothing here can send, start over or try again: an earlier conversation is a
 * record, and a control on it would suggest it can be continued.
 */
export function EarlierConversations({
  conversations,
  activityTitle,
}: {
  /** Newest first, as the server sends them. */
  readonly conversations: readonly EarlierConversation[];
  /** Named in each reply's region names, with the conversation, so none repeats the current one's (AX7). */
  readonly activityTitle: string;
}) {
  if (conversations.length === 0) return null;
  return (
    <details className="feedback-earlier">
      <summary className="feedback-earlier-summary">
        Earlier conversations ({conversations.length})
      </summary>
      {conversations.map((one) => {
        const when = timeOnDay(one.clearedAt);
        return (
          <div key={one.conversationId} className="feedback-earlier-item">
            <p className="feedback-earlier-when">Started over {when}</p>
            <FeedbackTurns
              turns={one.turns}
              writing={null}
              activityTitle={`${activityTitle}, earlier conversation started over ${when}`}
              label={`Earlier conversation, started over ${when}`}
            />
          </div>
        );
      })}
    </details>
  );
}
