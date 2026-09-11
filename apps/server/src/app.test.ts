import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { migrate, openDatabase, readSchemaVersion, type Db } from './modules/lifecycle/database.js';

let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
});

describe('the walking skeleton', () => {
  it('answers /api/health with the schema version actually stored in the database', async () => {
    db = openDatabase(':memory:');
    const app = buildApp({ db });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', schemaVersion: '1' });
    await app.close();
  });

  it('applies each migration once, so restarting the app does not re-seed the database', () => {
    db = openDatabase(':memory:');
    migrate(db);
    migrate(db);

    const rows = db.prepare('SELECT count(*) AS n FROM schema_meta').get() as { n: number };
    expect(rows.n).toBe(1);
    expect(readSchemaVersion(db)).toBe('1');
  });
});
