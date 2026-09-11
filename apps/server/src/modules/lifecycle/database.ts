import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrations } from './migrations.js';

export type Db = Database.Database;

/**
 * Opens the record store and brings it to the current schema. Pass ':memory:' in tests.
 *
 * WAL is off deliberately: a single local process writes here, and a plain journal keeps the
 * learner's work in one file they can copy or delete without stray sidecars.
 */
export function openDatabase(file: string): Db {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  migrate(db);
  return db;
}

/** Applies every migration not yet recorded, each inside its own transaction. */
export function migrate(db: Db): void {
  db.exec(
    'CREATE TABLE IF NOT EXISTS applied_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)',
  );
  const applied = new Set(
    db
      .prepare('SELECT id FROM applied_migrations')
      .all()
      .map((row) => (row as { id: number }).id),
  );
  for (const migration of migrations) {
    if (applied.has(migration.id)) continue;
    const run = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO applied_migrations (id, name, applied_at) VALUES (?, ?, ?)').run(
        migration.id,
        migration.name,
        new Date().toISOString(),
      );
    });
    run();
  }
}

export function readSchemaVersion(db: Db): string {
  const row = db.prepare("SELECT value FROM schema_meta WHERE key = 'app_schema_version'").get();
  if (!row)
    throw new Error('schema_meta is missing app_schema_version; the database is not migrated');
  return (row as { value: string }).value;
}
