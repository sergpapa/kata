import type { Db } from '../lifecycle/database.js';
import type {
  FeedbackConversationForPage,
  FeedbackTurnForPage,
  RateLimitInfo,
  SentField,
} from './types.js';

/**
 * The feedback tables (migration 7). Turns are only ever inserted; a conversation is only ever
 * inserted or cleared once. The store's triggers refuse anything else, so this module is not the
 * only thing keeping that promise (docs/specs/practice-feedback.md PF7).
 */

export interface StoredConversation {
  readonly id: number;
  readonly sessionId: string;
  readonly turns: readonly FeedbackTurnForPage[];
}

/** What a turn answered, read server-side from the activity's lesson (ADR 0011). */
export interface TurnProvenance {
  readonly candidateLessonId: string;
  readonly contentVersion: string;
  readonly releaseId: string;
}

interface TurnRow {
  readonly turn_number: number;
  readonly role: 'learner' | 'claude';
  readonly text: string;
  readonly sent_fields_json: string | null;
  readonly model: string | null;
  readonly outcome: 'complete' | 'failed' | null;
  readonly failure: string | null;
  readonly written_at: string;
}

function turnForPage(row: TurnRow): FeedbackTurnForPage {
  const base = { turn: row.turn_number, role: row.role, text: row.text, writtenAt: row.written_at };
  if (row.role === 'learner') {
    return row.sent_fields_json === null
      ? base
      : { ...base, sentFields: JSON.parse(row.sent_fields_json) as SentField[] };
  }
  return {
    ...base,
    model: row.model,
    outcome: row.outcome ?? 'failed',
    failure: row.failure,
  };
}

export function currentConversation(db: Db, activityId: string): StoredConversation | null {
  const conversation = db
    .prepare(
      'SELECT id, claude_session_id FROM feedback_conversation WHERE activity_id = ? AND cleared_at IS NULL',
    )
    .get(activityId) as { id: number; claude_session_id: string } | undefined;
  if (!conversation) return null;

  const rows = db
    .prepare(
      `SELECT turn_number, role, text, sent_fields_json, model, outcome, failure, written_at
         FROM feedback_turn WHERE conversation_id = ? ORDER BY turn_number`,
    )
    .all(conversation.id) as TurnRow[];
  return {
    id: conversation.id,
    sessionId: conversation.claude_session_id,
    turns: rows.map(turnForPage),
  };
}

export function conversationForPage(
  stored: StoredConversation | null,
): FeedbackConversationForPage | null {
  return stored ? { conversationId: stored.id, turns: stored.turns } : null;
}

/** Opens a conversation with its first learner turn, in one transaction. */
export function startConversation(
  db: Db,
  input: {
    readonly activityId: string;
    readonly sessionId: string;
    readonly sentFields: readonly SentField[];
    readonly provenance: TurnProvenance;
    readonly at: string;
  },
): { readonly conversationId: number; readonly turn: FeedbackTurnForPage } {
  return db.transaction(() => {
    const inserted = db
      .prepare(
        'INSERT INTO feedback_conversation (activity_id, claude_session_id, started_at) VALUES (?, ?, ?)',
      )
      .run(input.activityId, input.sessionId, input.at);
    const conversationId = Number(inserted.lastInsertRowid);
    const turn = appendTurn(db, conversationId, {
      role: 'learner',
      text: '',
      sentFields: input.sentFields,
      provenance: input.provenance,
      at: input.at,
    });
    return { conversationId, turn };
  })();
}

/** Adds the next turn of a conversation. The number is the store's, never the caller's. */
export function appendTurn(
  db: Db,
  conversationId: number,
  turn: {
    readonly role: 'learner' | 'claude';
    readonly text: string;
    readonly sentFields?: readonly SentField[];
    readonly model?: string | null;
    readonly outcome?: 'complete' | 'failed';
    readonly failure?: string | null;
    readonly provenance: TurnProvenance;
    readonly at: string;
  },
): FeedbackTurnForPage {
  return db.transaction(() => {
    const { next } = db
      .prepare(
        'SELECT COALESCE(MAX(turn_number), 0) + 1 AS next FROM feedback_turn WHERE conversation_id = ?',
      )
      .get(conversationId) as { next: number };
    db.prepare(
      `INSERT INTO feedback_turn
         (conversation_id, turn_number, role, text, sent_fields_json, model, outcome, failure,
          candidate_lesson_id, content_version, release_id, written_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      conversationId,
      next,
      turn.role,
      turn.text,
      turn.sentFields ? JSON.stringify(turn.sentFields) : null,
      turn.role === 'claude' ? (turn.model ?? null) : null,
      turn.role === 'claude' ? (turn.outcome ?? 'failed') : null,
      turn.role === 'claude' ? (turn.failure ?? null) : null,
      turn.provenance.candidateLessonId,
      turn.provenance.contentVersion,
      turn.provenance.releaseId,
      turn.at,
    );
    return turnForPage({
      turn_number: next,
      role: turn.role,
      text: turn.text,
      sent_fields_json: turn.sentFields ? JSON.stringify(turn.sentFields) : null,
      model: turn.role === 'claude' ? (turn.model ?? null) : null,
      outcome: turn.role === 'claude' ? (turn.outcome ?? 'failed') : null,
      failure: turn.role === 'claude' ? (turn.failure ?? null) : null,
      written_at: turn.at,
    });
  })();
}

/** Hides a current conversation. False when it was not current any more. */
export function clearConversation(db: Db, conversationId: number, at: string): boolean {
  return (
    db
      .prepare(
        'UPDATE feedback_conversation SET cleared_at = ? WHERE id = ? AND cleared_at IS NULL',
      )
      .run(at, conversationId).changes === 1
  );
}

export function saveUsage(db: Db, info: RateLimitInfo, at: string): void {
  db.prepare(
    `INSERT INTO feedback_usage (id, info_json, observed_at) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET info_json = excluded.info_json, observed_at = excluded.observed_at`,
  ).run(JSON.stringify(info), at);
}

export function loadUsage(
  db: Db,
): { readonly info: RateLimitInfo; readonly observedAt: Date } | null {
  const row = db.prepare('SELECT info_json, observed_at FROM feedback_usage WHERE id = 1').get() as
    { info_json: string; observed_at: string } | undefined;
  if (!row) return null;
  // Claude Code's format, stored as received: a row that does not read as an object is no report,
  // and the next run's report replaces it.
  let info: unknown;
  try {
    info = JSON.parse(row.info_json);
  } catch {
    return null;
  }
  if (typeof info !== 'object' || info === null || Array.isArray(info)) return null;
  return { info: info as RateLimitInfo, observedAt: new Date(row.observed_at) };
}

export const INTERRUPTED = 'The app was stopped before Claude replied. Try again, or start over.';

/**
 * Closes every current conversation whose last turn is the learner's (PF16).
 *
 * Called once as the app starts, when no run can be going: a learner turn with nothing after it
 * then means the server stopped mid-reply, and left open it would offer a follow-up to a session
 * Claude Code may never have written. The closing turn is stamped like the turn it answers.
 */
export function closeInterruptedTurns(db: Db, at: string): number {
  const open = db
    .prepare(
      `SELECT t.conversation_id, t.candidate_lesson_id, t.content_version, t.release_id
         FROM feedback_turn t
         JOIN feedback_conversation c ON c.id = t.conversation_id
        WHERE c.cleared_at IS NULL
          AND t.role = 'learner'
          AND t.turn_number = (SELECT MAX(turn_number) FROM feedback_turn
                                WHERE conversation_id = t.conversation_id)`,
    )
    .all() as {
    conversation_id: number;
    candidate_lesson_id: string;
    content_version: string;
    release_id: string;
  }[];
  for (const row of open) {
    appendTurn(db, row.conversation_id, {
      role: 'claude',
      text: '',
      model: null,
      outcome: 'failed',
      failure: INTERRUPTED,
      provenance: {
        candidateLessonId: row.candidate_lesson_id,
        contentVersion: row.content_version,
        releaseId: row.release_id,
      },
      at,
    });
  }
  return open.length;
}
