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
];
