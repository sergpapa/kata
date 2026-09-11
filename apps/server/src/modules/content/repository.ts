import type { Db } from '../lifecycle/database.js';
import type { StoredReleaseSummary, VerifiedRelease } from './types.js';

export function saveRelease(_db: Db, _release: VerifiedRelease): number {
  throw new Error('saveRelease is not implemented yet');
}

export function loadReleaseSummary(_db: Db, _releaseRowId: number): StoredReleaseSummary | undefined {
  throw new Error('loadReleaseSummary is not implemented yet');
}
