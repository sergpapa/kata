import { useEffect, useState } from 'react';
import type { ReleaseView } from './releaseTypes.js';

async function fetchRelease(signal: AbortSignal): Promise<ReleaseView> {
  try {
    const response = await fetch('/api/release', { signal });
    if (!response.ok) {
      return { state: 'unavailable', reason: `The app answered with status ${response.status}.` };
    }
    const body = (await response.json()) as ReleaseView;
    if (body.state !== 'imported' && body.state !== 'failed') {
      return { state: 'unavailable', reason: 'The app answered in a shape this page cannot read.' };
    }
    return body;
  } catch (error) {
    if (signal.aborted) return { state: 'reading' };
    return {
      state: 'unavailable',
      reason: error instanceof Error ? error.message : 'The app did not answer.',
    };
  }
}

export function App() {
  const [view, setView] = useState<ReleaseView>({ state: 'reading' });

  useEffect(() => {
    const controller = new AbortController();
    // The result of an aborted request is discarded rather than rendered. React runs this effect
    // twice under StrictMode, and without the guard the first (aborted) request can resolve after
    // the second and leave the page stuck on "Reading the release…".
    void fetchRelease(controller.signal).then((next) => {
      if (!controller.signal.aborted) setView(next);
    });
    return () => controller.abort();
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <p className="site-name">EduCode</p>
        <p className="site-scope">HTTP Lessons 1–5 · owner rehearsal</p>
      </header>
      <main id="main" className="reading-column">
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
                  <h3 className="lesson-title">{lesson.displayTitle}</h3>
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
              Reading a lesson is the next slice of work. These titles are the authored first
              headings of the lesson files, checked against the hashes the release publishes.
            </p>
          </>
        )}

        <h2>Local storage</h2>
        <p>
          Your work will be stored in a database file on this computer. There is no account, no
          syncing and no copy anywhere else.
        </p>
      </main>
    </>
  );
}
