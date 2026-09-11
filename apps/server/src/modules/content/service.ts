import type { Db } from '../lifecycle/database.js';
import type { ReleaseState } from './types.js';

export function importRelease(_db: Db, _releaseDir: string): ReleaseState {
  throw new Error('importRelease is not implemented yet');
}
