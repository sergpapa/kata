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
];
