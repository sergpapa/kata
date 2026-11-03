export interface ReleaseChanges {
  readonly release_id: string;
  readonly previous_version: string;
  readonly version: string;
  readonly accepted_feedback: readonly string[];
  readonly lessons: readonly {
    lesson_id: string;
    path: string;
    status: 'changed' | 'unchanged';
    previous_version: string;
    version: string;
    previous_sha256: string;
    sha256: string;
  }[];
  readonly labs: readonly {
    lab_id: string;
    path: string;
    status: 'changed' | 'unchanged';
    previous_version: string;
    version: string;
    previous_sha256: string;
    sha256: string;
  }[];
  readonly activities: {
    path: string;
    status: 'changed' | 'unchanged';
    previous_sha256: string;
    sha256: string;
  };
}

export type BuildOutcome =
  | { readonly state: 'built'; readonly changes: ReleaseChanges }
  | { readonly state: 'refused'; readonly reason: string };

export function buildRelease(_sourceDir: string, _outDir: string): BuildOutcome {
  throw new Error('not implemented');
}
