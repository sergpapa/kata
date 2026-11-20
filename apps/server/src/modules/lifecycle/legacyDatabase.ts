import fs from 'node:fs';
import path from 'node:path';

export type LegacyDatabaseOutcome = 'moved' | 'kept-both' | 'none';

/**
 * The app was called EduCode and kept the learner's work in `educode.sqlite`. This moves that file
 * to `kata.sqlite` before the store is opened, so the rename never looks like lost work
 * (docs/specs/kata-rename.md, R1). It runs before `openDatabase`, while nothing holds the file.
 *
 * A leftover rollback journal moves first: if the main file then failed to move, the next start
 * would find the old store without its journal, which is the state an unclean stop already leaves.
 * When both names exist, which one holds the learner's work is not knowable here, so neither is
 * touched and the caller says so.
 */
export function renameLegacyDatabase(dataDir: string): LegacyDatabaseOutcome {
  const oldFile = path.join(dataDir, 'educode.sqlite');
  const newFile = path.join(dataDir, 'kata.sqlite');
  if (!fs.existsSync(oldFile)) return 'none';
  if (fs.existsSync(newFile)) return 'kept-both';

  if (fs.existsSync(`${oldFile}-journal`)) {
    fs.renameSync(`${oldFile}-journal`, `${newFile}-journal`);
  }
  fs.renameSync(oldFile, newFile);
  return 'moved';
}
