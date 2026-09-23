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
];
