/**
 * Forward-only migrations. Never edit an applied migration: add the next one.
 * Kept as strings rather than .sql files so the compiled server needs no asset copying.
 */
export interface Migration {
  readonly id: number;
  readonly name: string;
  readonly sql: string;
}

export const migrations: readonly Migration[] = [
  {
    id: 1,
    name: 'schema_meta',
    sql: `
      CREATE TABLE schema_meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      INSERT INTO schema_meta (key, value) VALUES ('app_schema_version', '1');
    `,
  },
  {
    id: 2,
    name: 'imported_content',
    sql: `
      CREATE TABLE content_release (
        id              INTEGER PRIMARY KEY,
        release_id      TEXT NOT NULL,
        release_version TEXT NOT NULL,
        release_date    TEXT,
        status          TEXT,
        audience        TEXT,
        source_of_truth TEXT,
        manifest_sha256 TEXT NOT NULL,
        imported_at     TEXT NOT NULL,
        UNIQUE (release_id, release_version, manifest_sha256)
      );

      CREATE TABLE content_lesson (
        id                  INTEGER PRIMARY KEY,
        release_row_id      INTEGER NOT NULL REFERENCES content_release(id),
        display_order       INTEGER NOT NULL,
        candidate_lesson_id TEXT NOT NULL,
        content_version     TEXT NOT NULL,
        document_id         TEXT NOT NULL,
        module              TEXT,
        display_title       TEXT NOT NULL,
        manifest_title      TEXT NOT NULL,
        source_path         TEXT NOT NULL,
        sha256              TEXT NOT NULL,
        front_matter_json   TEXT NOT NULL,
        source_text         TEXT NOT NULL,
        lab_id              TEXT,
        UNIQUE (release_row_id, candidate_lesson_id),
        UNIQUE (release_row_id, display_order)
      );

      -- Work is recorded against a lesson key and a content version, so that pair is the lookup.
      CREATE INDEX idx_content_lesson_key
        ON content_lesson (candidate_lesson_id, content_version);

      CREATE TABLE content_lab_kit (
        id              INTEGER PRIMARY KEY,
        release_row_id  INTEGER NOT NULL REFERENCES content_release(id),
        lab_id          TEXT NOT NULL,
        lab_version     TEXT NOT NULL,
        source_path     TEXT NOT NULL,
        sha256          TEXT NOT NULL,
        byte_size       INTEGER NOT NULL,
        lesson_ids_json TEXT NOT NULL,
        UNIQUE (release_row_id, lab_id)
      );

      CREATE TABLE content_activity_set (
        id             INTEGER PRIMARY KEY,
        release_row_id INTEGER NOT NULL REFERENCES content_release(id),
        source_path    TEXT NOT NULL,
        sha256         TEXT NOT NULL,
        source_text    TEXT NOT NULL,
        UNIQUE (release_row_id)
      );

      UPDATE schema_meta SET value = '2' WHERE key = 'app_schema_version';
    `,
  },
  {
    id: 3,
    name: 'resume_point',
    sql: `
      -- One row, by construction: the resume point is a pointer, not a history (ADR 0010). It
      -- deliberately has no content_version column — work is pinned to the version it answered,
      -- but a pointer follows the lesson across an authorized correction.
      CREATE TABLE resume_point (
        id                  INTEGER PRIMARY KEY CHECK (id = 1),
        candidate_lesson_id TEXT NOT NULL,
        recorded_at         TEXT NOT NULL
      );

      UPDATE schema_meta SET value = '3' WHERE key = 'app_schema_version';
    `,
  },
  {
    id: 4,
    name: 'learner_response',
    sql: `
      -- One live record per (activity, field), which is the unit a save covers (ADR 0004, ADR
      -- 0011). The content version is stamped on each accepted write rather than being part of the
      -- key: an authorized correction must leave the owner's answer on screen and editable, not
      -- file it under a version string they never saw.
      --
      -- \`revision\` is what makes a save a compare-and-set. It starts at 1 on the first accepted
      -- write; a client that believes nothing is stored sends 0.
      CREATE TABLE learner_response (
        id                  INTEGER PRIMARY KEY,
        activity_id         TEXT NOT NULL,
        field_name          TEXT NOT NULL,
        candidate_lesson_id TEXT NOT NULL,
        content_version     TEXT NOT NULL,
        release_id          TEXT NOT NULL,
        text                TEXT NOT NULL,
        revision            INTEGER NOT NULL,
        updated_at          TEXT NOT NULL,
        UNIQUE (activity_id, field_name)
      );

      -- No separate index on activity_id: the UNIQUE constraint above already builds a B-tree
      -- whose leftmost column is activity_id, which is what a WHERE activity_id IN (...) needs.

      UPDATE schema_meta SET value = '4' WHERE key = 'app_schema_version';
    `,
  },
  {
    id: 5,
    name: 'learner_response_revision',
    sql: `
      -- Every accepted write that changed the text, kept for good (ADR 0012). Nothing edits or
      -- deletes a row here: this is where "importing a new content version must not overwrite an
      -- earlier recorded prediction" stops being a claim about the app and becomes a property of
      -- the store.
      --
      -- Additive on purpose. \`learner_response\` is not altered, so the compare-and-set of ADR
      -- 0004 and the key of ADR 0011 are exactly what they were, and the live record remains the
      -- one row the reader edits.
      --
      -- \`revision\` is the number the live record took from the write that appended this row, not
      -- a counter of its own. It can therefore have gaps: a save whose text repeats the newest
      -- revision's is accepted, moves the live record, and appends nothing, because nothing about
      -- the work changed.
      CREATE TABLE learner_response_revision (
        id                  INTEGER PRIMARY KEY,
        activity_id         TEXT NOT NULL,
        field_name          TEXT NOT NULL,
        revision            INTEGER NOT NULL,
        candidate_lesson_id TEXT NOT NULL,
        content_version     TEXT NOT NULL,
        release_id          TEXT NOT NULL,
        text                TEXT NOT NULL,
        written_at          TEXT NOT NULL,
        UNIQUE (activity_id, field_name, revision)
      );

      -- No separate index: the UNIQUE above builds a B-tree keyed
      -- (activity_id, field_name, revision), which is what both reads here want — one field's
      -- revisions in order, and the highest revision of a field.

      -- Every answer already in the store becomes its own first revision, at the number and stamp
      -- it already carries. Without this, a store upgraded from schema 4 — which is the owner's,
      -- since they have been recording work since slice 10 — would drop the answer they wrote
      -- before today the first time they corrected it, because the append would have nothing to
      -- come after. That is the exact loss ADR 0012 exists to prevent, on the one store that
      -- matters. It also makes the live-text invariant true from the moment this migration
      -- finishes rather than from the next write.
      --
      -- \`updated_at\` is the only time this row has, and it is the truthful one: it is when that
      -- text was acknowledged. Anything earlier in that field's life was never recorded and cannot
      -- be recovered here.
      INSERT INTO learner_response_revision
        (activity_id, field_name, revision, candidate_lesson_id, content_version, release_id,
         text, written_at)
      SELECT activity_id, field_name, revision, candidate_lesson_id, content_version, release_id,
             text, updated_at
        FROM learner_response;

      UPDATE schema_meta SET value = '5' WHERE key = 'app_schema_version';
    `,
  },
  {
    id: 6,
    name: 'course_resume_point',
    sql: `
      -- One resume point per course (ADR 0018), still a pointer and not a history (ADR 0010).
      -- The single row the one-course app kept belonged to the full-stack course, the only course
      -- there was, so it moves there. It is the reader's last-opened lesson, not their work, which
      -- is why the old table can go: nothing in learner_response or its revisions is touched.
      CREATE TABLE course_resume_point (
        course_id           TEXT PRIMARY KEY,
        candidate_lesson_id TEXT NOT NULL,
        recorded_at         TEXT NOT NULL
      );
      INSERT INTO course_resume_point (course_id, candidate_lesson_id, recorded_at)
      SELECT 'FSSE', candidate_lesson_id, recorded_at FROM resume_point;
      DROP TABLE resume_point;
      UPDATE schema_meta SET value = '6' WHERE key = 'app_schema_version';
    `,
  },
  {
    id: 7,
    name: 'practice_feedback',
    sql: `
      -- Claude's feedback on practice activities (ADR 0019, docs/specs/practice-feedback.md).
      -- Additive: no existing table is touched.
      --
      -- A conversation is keyed by activity alone, like an answer (ADR 0018). Start over sets
      -- cleared_at once; nothing else about a conversation ever changes, and none is deleted.
      -- The session id is chosen by the app before the first run (--session-id), so the row is
      -- born complete and never needs filling in.
      CREATE TABLE feedback_conversation (
        id                INTEGER PRIMARY KEY,
        activity_id       TEXT NOT NULL,
        claude_session_id TEXT NOT NULL,
        started_at        TEXT NOT NULL,
        cleared_at        TEXT
      );
      -- At most one current conversation per activity, whatever two tabs do at once.
      CREATE UNIQUE INDEX feedback_conversation_current
        ON feedback_conversation (activity_id) WHERE cleared_at IS NULL;

      -- Every turn, append-only, stamped with what it answered (as ADR 0011 stamps a save).
      CREATE TABLE feedback_turn (
        conversation_id     INTEGER NOT NULL REFERENCES feedback_conversation (id),
        turn_number         INTEGER NOT NULL,
        role                TEXT NOT NULL CHECK (role IN ('learner', 'claude')),
        text                TEXT NOT NULL,
        sent_fields_json    TEXT,
        model               TEXT,
        outcome             TEXT CHECK (outcome IN ('complete', 'failed')),
        failure             TEXT,
        candidate_lesson_id TEXT NOT NULL,
        content_version     TEXT NOT NULL,
        release_id          TEXT NOT NULL,
        written_at          TEXT NOT NULL,
        PRIMARY KEY (conversation_id, turn_number)
      );

      -- The newest usage report Claude Code gave, for the pause that keeps the plan out of paid
      -- extra usage (PF20). One row, replaced: only the newest report counts.
      CREATE TABLE feedback_usage (
        id          INTEGER PRIMARY KEY CHECK (id = 1),
        info_json   TEXT NOT NULL,
        observed_at TEXT NOT NULL
      );

      -- The store itself refuses what the app must never do (PF7), so a later bug cannot.
      CREATE TRIGGER feedback_turn_no_update BEFORE UPDATE ON feedback_turn
      BEGIN SELECT RAISE(ABORT, 'feedback turns are never edited'); END;
      CREATE TRIGGER feedback_turn_no_delete BEFORE DELETE ON feedback_turn
      BEGIN SELECT RAISE(ABORT, 'feedback turns are never deleted'); END;
      CREATE TRIGGER feedback_conversation_no_delete BEFORE DELETE ON feedback_conversation
      BEGIN SELECT RAISE(ABORT, 'feedback conversations are never deleted'); END;
      CREATE TRIGGER feedback_conversation_clear_once BEFORE UPDATE ON feedback_conversation
      WHEN OLD.cleared_at IS NOT NULL
        OR NEW.cleared_at IS NULL
        OR NEW.id IS NOT OLD.id
        OR NEW.activity_id IS NOT OLD.activity_id
        OR NEW.claude_session_id IS NOT OLD.claude_session_id
        OR NEW.started_at IS NOT OLD.started_at
      BEGIN SELECT RAISE(ABORT, 'a feedback conversation changes only by being cleared, once'); END;

      UPDATE schema_meta SET value = '7' WHERE key = 'app_schema_version';
    `,
  },
];
