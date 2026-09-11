import type { Db } from '../lifecycle/database.js';
import { saveRelease } from './repository.js';
import type { ReleaseState } from './types.js';
import { verifyRelease } from './verify.js';

/**
 * Reads the release directory, proves it, and stores it — or reports why it was refused, having
 * written nothing. Run on every start: verification is a claim about the bytes on disk right now,
 * and "it was fine last time" is not verification.
 */
export function importRelease(db: Db, releaseDir: string): ReleaseState {
  const outcome = verifyRelease(releaseDir);
  if (outcome.state === 'failed') {
    return { state: 'failed', failure: outcome.failure };
  }
  return { state: 'imported', releaseRowId: saveRelease(db, outcome.release) };
}
