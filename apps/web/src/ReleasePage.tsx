import { useApi, type ApiResult } from './api.js';
import { RouteLink } from './RouteLink.js';
import { lessonHref } from './route.js';
import type { ReleaseView } from './releaseTypes.js';

/** The lesson list: what this release carries, or the named reason it was refused whole. */

function toReleaseView(result: ApiResult): ReleaseView {
  if (result.state === 'reading') return { state: 'reading' };
  if (result.state === 'unavailable') return { state: 'unavailable', reason: result.reason };
  if (result.status !== 200) {
    return { state: 'unavailable', reason: `The app answered with status ${result.status}.` };
  }

  const body = result.body as ReleaseView;
  if (body?.state !== 'imported' && body?.state !== 'failed') {
    return { state: 'unavailable', reason: 'The app answered in a shape this page cannot read.' };
  }
  return body;
}

export function ReleasePage() {
  const view = toReleaseView(useApi('/api/release'));

  return (
    <>
      <h1>The lessons in this release</h1>

      {view.state === 'reading' && <p role="status">Reading the release…</p>}

      {view.state === 'unavailable' && (
        <p role="alert" className="notice notice-bad">
          The local app did not answer: {view.reason}
        </p>
      )}

      {view.state === 'failed' && (
        <>
          <p role="alert" className="notice notice-bad">
            {view.failure.message}
          </p>
          <p>
            No lesson has been imported. Nothing here is filled in with substitute content — the
            release is refused whole until the file above matches what the release says it is.
          </p>
        </>
      )}

      {view.state === 'imported' && (
        <>
          <p className="release-line">
            Release {view.release.releaseId}, version {view.release.version}
            {view.release.date ? `, dated ${view.release.date}` : ''}.
          </p>
          {view.release.status && <p className="release-status">{view.release.status}</p>}
          <h2>Lessons, in the order the release gives them</h2>
          <ol className="lesson-list">
            {view.lessons.map((lesson) => (
              <li key={lesson.candidateLessonId} className="lesson-item">
                <h3 className="lesson-title">
                  <RouteLink href={lessonHref(lesson.candidateLessonId)}>
                    {lesson.displayTitle}
                  </RouteLink>
                </h3>
                <p className="lesson-facts">
                  <span>Lesson {lesson.order}</span>
                  <span>{lesson.candidateLessonId}</span>
                  <span>version {lesson.contentVersion}</span>
                  <span>{lesson.labId ? `lab kit ${lesson.labId}` : 'no lab kit'}</span>
                </p>
              </li>
            ))}
          </ol>
          <p>
            These titles are the authored first headings of the lesson files, checked against the
            hashes the release publishes. Open one to read it.
          </p>
        </>
      )}

      <h2>Local storage</h2>
      <p>
        Your work will be stored in a database file on this computer. There is no account, no
        syncing and no copy anywhere else.
      </p>
    </>
  );
}
