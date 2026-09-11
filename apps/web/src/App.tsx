import { useEffect, useState } from 'react';

type Health =
  | { state: 'checking' }
  | { state: 'connected'; schemaVersion: string }
  | { state: 'unavailable'; reason: string };

async function fetchHealth(signal: AbortSignal): Promise<Health> {
  try {
    const response = await fetch('/api/health', { signal });
    if (!response.ok) {
      return { state: 'unavailable', reason: `The app answered with status ${response.status}.` };
    }
    const body = (await response.json()) as { schemaVersion?: string };
    if (!body.schemaVersion) {
      return { state: 'unavailable', reason: 'The app answered without a schema version.' };
    }
    return { state: 'connected', schemaVersion: body.schemaVersion };
  } catch (error) {
    if (signal.aborted) return { state: 'checking' };
    return {
      state: 'unavailable',
      reason: error instanceof Error ? error.message : 'The app did not answer.',
    };
  }
}

export function App() {
  const [health, setHealth] = useState<Health>({ state: 'checking' });

  useEffect(() => {
    const controller = new AbortController();
    void fetchHealth(controller.signal).then(setHealth);
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
        <h1>The application is set up, and nothing is imported yet.</h1>
        <p>
          This page exists to prove the client, the server and the record store are connected. The
          lesson reader is the next slice of work.
        </p>
        <h2>Local storage</h2>
        <p>
          Your work will be stored in a database file on this computer. There is no account, no
          syncing and no copy anywhere else.
        </p>
        <h2>Connection</h2>
        <p role="status">
          {health.state === 'checking' && 'Checking the connection to the local app…'}
          {health.state === 'connected' &&
            `Connected. Record store schema version ${health.schemaVersion}.`}
          {health.state === 'unavailable' && `Not connected. ${health.reason}`}
        </p>
      </main>
    </>
  );
}
