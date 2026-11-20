/**
 * The acceptance run (docs/specs/acceptance-run.md, roadmap Milestone 3): the four HTTP handoffs'
 * checks, against the built app, over one throwaway store restarted on each release in the order
 * the owner's store grew — first five, 6–8, 9–13, first fifteen 1.0.1.
 *
 * Needs `npm run build` first. Prints one line per observation, writes
 * data/acceptance/results.json, and exits 1 if any observation failed. The kits it downloads are
 * left in data/acceptance/downloads for kits.mjs and the two rehearsals.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { outDir, startServer, stopServer } from './server.mjs';
import { lessonUrl, manifestOf, note, results, sha } from './helpers.mjs';
import { firstFive } from './phase-first-five.mjs';
import { sixToThirteen } from './phase-six-to-thirteen.mjs';
import { firstFifteen } from './phase-first-fifteen.mjs';

const dataDir = path.join(outDir, 'store');
const downloads = path.join(outDir, 'downloads');
for (const dir of [dataDir, downloads]) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

const browser = await chromium.launch();
let server;
async function boot(rel) {
  if (server) await stopServer(server);
  server = await startServer(dataDir, rel);
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();

/** Downloads a lesson's kit through its link on the page and checks it against the manifest. */
async function kitCheck(tag, rel, lessonId) {
  await page.goto(lessonUrl(lessonId), { waitUntil: 'networkidle' });
  const link = page.locator('.lab-kit-download');
  if ((await link.count()) === 0) return note(tag, false, `${lessonId} shows no kit download`);
  const [d] = await Promise.all([page.waitForEvent('download'), link.first().click()]);
  const file = path.join(downloads, d.suggestedFilename());
  await d.saveAs(file);
  const hash = sha(fs.readFileSync(file));
  const entry = (manifestOf(rel).lab_downloads ?? []).find((k) => k.lesson_ids?.includes(lessonId));
  note(
    tag,
    hash === entry?.sha256,
    `${lessonId}: ${d.suggestedFilename()} sha256 ${hash.slice(0, 16)}… manifest ${entry?.lab_id} ${entry?.sha256?.slice(0, 16)}…`,
  );
  return file;
}

const ctx = { page, boot, kitCheck, downloads };
try {
  await firstFive(ctx);
  await sixToThirteen(ctx);
  await firstFifteen(ctx);
} catch (error) {
  note('RUN', false, `stopped: ${error.stack}`);
  if (server) console.log(server.log().slice(-2000));
} finally {
  if (server) await stopServer(server);
  await browser.close();
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(results, null, 1));
}
const failed = results.filter((r) => r.ok === false).length;
console.log(`\n${results.length - failed} of ${results.length} observations passed.`);
if (failed > 0) process.exitCode = 1;
