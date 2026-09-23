import type { EarlierVersion } from '../releaseTypes.js';
import { storedWhen } from '../format.js';

/**
 * What the owner wrote before, under the box that replaced it (ADR 0012).
 *
 * Closed, and absent entirely where nothing has been superseded. A field on a first read-through
 * has no history and shows nothing at all, which is what keeps this from adding height to twelve
 * panels a lesson before the owner has written anything.
 *
 * Read-only by design and not by omission: there is no Restore here. Putting an earlier text back
 * in the box is a copy affordance, and copying work out of this app is the next slice's subject.
 */
export function ResponseHistory({
  earlierVersions,
  label,
  activityId,
  fieldName,
}: {
  /** Newest first, as the server orders them. Never the text the box now holds. */
  readonly earlierVersions: readonly EarlierVersion[];
  readonly label: string;
  readonly activityId: string;
  readonly fieldName: string;
}) {
  if (earlierVersions.length === 0) return null;

  return (
    <details className="response-history">
      {/* A native disclosure, so it is operable by keyboard and announced as one without this app
          writing a key handler — and named, because a lesson carries twelve of these and a bare
          "Earlier versions (2)" says nothing about which answer it belongs to. */}
      <summary className="response-history-summary">
        Earlier versions ({earlierVersions.length})
        <span className="visually-hidden">
          {' '}
          of {label}, {activityId}
        </span>
      </summary>

      <ol className="response-history-list">
        {earlierVersions.map((version) => {
          const when = storedWhen(version.writtenAt);
          return (
            <li key={`${fieldName}-${version.revision}`} className="response-version">
              <p className="response-version-when">
                {when ? `Saved ${when}` : 'Saved'}
                {/* The version this text was answering, which is not necessarily the one the box
                    above is answering now. That pairing is the whole reason the record exists. */}
                <span className="response-version-content"> · {version.contentVersion}</span>
              </p>
              {/* The owner's characters, not a rendering of them. Learner input is exactly as
                  untrusted as lesson content is (ADR 0005), and `pre` keeps the whitespace they
                  typed — wrapped, because this is prose in a narrow column and not a sample. */}
              <pre className="response-version-text">{version.text}</pre>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
