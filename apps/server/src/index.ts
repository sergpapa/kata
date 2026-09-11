import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { openDatabase } from './modules/lifecycle/database.js';

const config = loadConfig();
const db = openDatabase(config.databaseFile);
const app = buildApp({ db, webDistDir: config.webDistDir });

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
    void app.close().then(() => {
      db.close();
      process.exit(0);
    });
  });
}
