import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';

const config = loadConfig();
const db = openDatabase(config.databaseFile);

/**
 * The release is read and re-verified on every start, not cached from last time: verification is a
 * claim about the bytes on disk now. A refusal does not stop the app — the server serves the named
 * reason so the owner can read it on the page instead of hunting through a terminal.
 */
const release = importRelease(db, config.releaseDir);
const app = buildApp({ db, release, webDistDir: config.webDistDir });

if (release.state === 'failed') {
  console.error(`The learning release was refused: ${release.failure.message}`);
  console.error(`Release directory: ${config.releaseDir}`);
} else {
  console.log(`Learning release imported from ${config.releaseDir}`);
}

try {
  await app.listen({ host: config.host, port: config.port });
  console.log(`EduCode is running at http://${config.host}:${config.port}`);
  console.log(`Your work is stored on this computer only, in ${config.databaseFile}`);
} catch (error) {
  console.error('EduCode failed to start:', error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    // The database is closed whether or not the HTTP server shuts down cleanly: a rejected close
    // must not leave the learner's record store open behind a process that is going away anyway.
    void app
      .close()
      .catch((error: unknown) => console.error('EduCode did not shut down cleanly:', error))
      .finally(() => {
        db.close();
        process.exit(0);
      });
  });
}
