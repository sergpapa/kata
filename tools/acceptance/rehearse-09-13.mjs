/**
 * The browser-cache rehearsal in the 9–13 kit's Instructor_Notes.md, steps 1–8, in Playwright's
 * Chromium on one fixed origin (4320, the kit's stated alternate port). Runs on the extraction
 * kits.mjs made from the download. Exits 1 if any step differs from the notes' expectation.
 *
 * Steps 2–4 expect the browser to keep a `max-age=300` response, so the whole sequence must run
 * well inside five minutes; it takes seconds.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { outDir } from './server.mjs';
import { KitServer, kitRoot, press } from './rehearsal.mjs';

const kit = kitRoot('HTTP_Lessons_09_13_Local_Kit_v1', 'http-lessons-09-13-lab');
const port = '4320';
const state = (cmd) =>
  execFileSync(process.execPath, ['state.mjs', cmd], { cwd: kit, encoding: 'utf8' });
const rows = [];
const server = new KitServer(kit, [port]);

state('baseline');
await server.start();
const browser = await chromium.launch();
console.log(`Chromium ${browser.version()}`);
try {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:${port}/lab`);
  const workers = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistrations()).length,
  );
  console.log(`service workers on the origin: ${workers}`);
  const go = (step, label, source, origin, shows) =>
    press(page, server, rows, { step, label, source, origin, shows });

  state('fresh');
  await go(2, 'Start with a current copy', 'fresh, 17:00', ['200'], '17:00');
  await go(2, 'Read normally', 'fresh, 17:00', [], '17:00');
  state('later');
  await go(3, 'Read normally', 'fresh, 18:00', [], '17:00');
  const curl = execFileSync('curl', ['-s', `http://127.0.0.1:${port}/api/notice`], {
    encoding: 'utf8',
  });
  const curlTime = (curl.match(/\d\d:\d\d/) ?? ['?'])[0];
  await new Promise((r) => setTimeout(r, 300));
  server.take();
  rows.push({ step: 3, label: 'direct curl', displayed: curlTime, ok: curlTime === '18:00' });
  console.log(
    `${curlTime === '18:00' ? 'PASS' : 'FAIL'} step 3 direct curl: ${curlTime} (expected 18:00)`,
  );
  await go(4, 'Bypass storage for this read', 'fresh, 18:00', ['200'], '18:00');
  await go(4, 'Read normally', 'fresh, 18:00', [], '17:00');
  await go(5, 'Validate the stored copy', 'fresh, 18:00', ['200c'], '18:00');
  await go(5, 'Validate the stored copy', 'fresh, 18:00', ['304c'], '18:00');
  state('baseline');
  state('validate');
  await go(6, 'Start with a current copy', 'no-cache, 17:00', ['200'], '17:00');
  await go(6, 'Validate the stored copy', 'no-cache, 17:00', ['304c'], '17:00');
  await go(7, 'Read normally', 'no-cache, 17:00', ['304c'], '17:00');
  state('note');
  await go(7, 'Read normally', 'no-cache, 17:00, note changed', ['304c'], '17:00');
  await server.stop();
  await go(8, 'Validate the stored copy', 'server stopped', [], 'The request failed');
  await server.start();
  await go(8, 'Read normally', 'no-cache, 17:00, restarted', ['304c'], '17:00');
} finally {
  await browser.close();
  await server.stop();
  state('baseline');
  fs.writeFileSync(path.join(outDir, 'rehearsal-09-13.json'), JSON.stringify(rows, null, 1));
}
if (rows.length === 0 || rows.some((r) => !r.ok)) process.exitCode = 1;
