import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { openDatabase } from './database.js';
import { renameLegacyDatabase } from './legacyDatabase.js';

/** Criterion R1 in docs/specs/kata-rename.md — the owner's saved work survives the rename. */
describe('renaming the EduCode store to the Kata name', () => {
  let dataDir: string;
  const oldFile = () => path.join(dataDir, 'educode.sqlite');
  const newFile = () => path.join(dataDir, 'kata.sqlite');

  beforeEach(() => {
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kata-legacy-db-'));
  });

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it('moves educode.sqlite to kata.sqlite when only the old file exists, rows intact', () => {
    const old = openDatabase(oldFile());
    old.exec("CREATE TABLE marker (note TEXT); INSERT INTO marker VALUES ('saved before rename')");
    old.close();

    expect(renameLegacyDatabase(dataDir)).toBe('moved');

    expect(fs.existsSync(oldFile())).toBe(false);
    const renamed = openDatabase(newFile());
    expect(renamed.prepare('SELECT note FROM marker').pluck().get()).toBe('saved before rename');
    renamed.close();
  });

  it('carries a leftover rollback journal along, so an interrupted write can still be undone', () => {
    fs.writeFileSync(oldFile(), 'main bytes');
    fs.writeFileSync(`${oldFile()}-journal`, 'journal bytes');

    renameLegacyDatabase(dataDir);

    expect(fs.readFileSync(`${newFile()}-journal`, 'utf8')).toBe('journal bytes');
    expect(fs.existsSync(`${oldFile()}-journal`)).toBe(false);
  });

  it('touches neither file when both exist, and says so', () => {
    fs.writeFileSync(oldFile(), 'old store');
    fs.writeFileSync(newFile(), 'new store');

    expect(renameLegacyDatabase(dataDir)).toBe('kept-both');

    expect(fs.readFileSync(oldFile(), 'utf8')).toBe('old store');
    expect(fs.readFileSync(newFile(), 'utf8')).toBe('new store');
  });

  it('does nothing on a fresh clone with no store yet', () => {
    expect(renameLegacyDatabase(dataDir)).toBe('none');
    expect(fs.readdirSync(dataDir)).toEqual([]);
  });

  it('does nothing when the data directory does not exist yet', () => {
    const missing = path.join(dataDir, 'not-made');

    expect(renameLegacyDatabase(missing)).toBe('none');
    expect(fs.existsSync(missing)).toBe(false);
  });
});
