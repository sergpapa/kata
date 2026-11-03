import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './modules/lifecycle/database.js';
import { importCourses } from './modules/content/courses.js';

const config = loadConfig();
const db = openDatabase(config.databaseFile);

/**
 * Every course's release is read and re-verified on every start, not cached from last time:
 * verification is a claim about the bytes on disk now. A refusal does not stop the app — the server
 * serves the named reason so the owner can read it on the page instead of hunting through a
 * terminal — and it refuses that one course, never the others (ADR 0018).
 */
const courses = importCourses(db, config.courses);
const app = buildApp({ db, courses, webDistDir: config.webDistDir });

for (const course of courses) {
  if (course.release.state === 'failed') {
    console.error(
      `${course.courseId}: the learning release was refused: ${course.release.failure.message}`,
    );
    console.error(`${course.courseId}: release directory: ${course.releaseDir}`);
  } else {
    console.log(`${course.courseId}: learning release imported from ${course.releaseDir}`);
  }
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
