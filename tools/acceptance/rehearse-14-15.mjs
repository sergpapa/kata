/**
 * The browser rehearsal in the 14–15 kit's Instructor_Notes.md, steps 1–6, in Playwright's
 * Chromium. Runs on a copy of the extraction kits.mjs made, because steps 5 and 6 apply the
 * reference repairs and the extraction must stay as supplied. Exits 1 if any step differs from the
 * notes' expectation.
 *
 * The original incident must give a false 304 after a time-only change, and the original transfer
 * must serve whichever edition was asked for first. Those are the kit's deliberate defects: a
 * rehearsal that does not show them is a failed rehearsal.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { outDir } from './server.mjs';
import { KitServer, kitRoot, press } from './rehearsal.mjs';

const original = kitRoot('HTTP_Lessons_14_15_Investigation_Kit_v1', 'http-lessons-14-15-lab');
const kit = path.join(outDir, 'rehearsal-14-15-copy');
fs.rmSync(kit, { recursive: true, force: true });
fs.cpSync(original, kit, { recursive: true });
const state = (cmd) =>
  execFileSync(process.execPath, ['state.mjs', cmd], { cwd: kit, encoding: 'utf8' });
const repair = (name, scenario) =>
  fs.copyFileSync(
    path.join(kit, 'reference', name),
    path.join(kit, 'cases', scenario, 'representation.mjs'),
  );
const rows = [];

const browser = await chromium.launch();
console.log(`Chromium ${browser.version()}`);
let server;
/** A fresh process and a fresh browser context (an empty HTTP cache) on the given scenario. */
async function open(scenario, port) {
  server = new KitServer(kit, [scenario, port]);
  await server.start();
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/lab`);
  const go = (step, label, source, origin, shows, target) =>
    press(page, server, rows, { step, label, source, origin, shows, target });
  return { context, go };
}
async function close(opened) {
  await server.stop();
  await opened.context.close();
}

try {
  state('baseline');
  let o = await open('incident', '4322');
  await o.go(2, 'Start with a current copy', 'original, 17:00', ['200'], '17:00');
  state('later');
  await o.go(3, 'Read normally', 'original, time only → 18:00', ['304c'], '17:00');
  await o.go(4, 'Bypass storage for this read', 'original, 18:00', ['200'], '18:00');
  await o.go(4, 'Read normally', 'original, 18:00', ['304c'], '17:00');
  await close(o);

  repair('incident-representation.mjs', 'incident');
  state('baseline');
  o = await open('incident', '4322');
  await o.go(5, 'Start with a current copy', 'repaired, 17:00', ['200'], '17:00');
  state('later');
  await o.go(5, 'Read normally', 'repaired, time only → 18:00', ['200c'], '18:00');
  await o.go(5, 'Read normally', 'repaired, 18:00', ['304c'], '18:00');
  await close(o);

  // Morning is "until 11:00", evening "until 21:00". The original collapses the two selections.
  const runs = [
    { repaired: false, order: ['morning', 'evening'], shows: ['11:00', '11:00'] },
    { repaired: false, order: ['evening', 'morning'], shows: ['21:00', '21:00'] },
    { repaired: true, order: ['morning', 'evening'], shows: ['11:00', '21:00'] },
    { repaired: true, order: ['evening', 'morning'], shows: ['21:00', '11:00'] },
  ];
  for (const run of runs) {
    if (run.repaired) repair('transfer-representation.mjs', 'transfer');
    o = await open('transfer', '4324');
    const source = `transfer ${run.repaired ? 'repaired' : 'original'}, ${run.order.join(' then ')}`;
    for (const [i, edition] of run.order.entries()) {
      await o.go(
        6,
        'Bypass storage for this read',
        source,
        ['200'],
        run.shows[i],
        `/api/notice?edition=${edition}`,
      );
    }
    await close(o);
  }
} finally {
  await browser.close();
  if (server) await server.stop();
  fs.writeFileSync(path.join(outDir, 'rehearsal-14-15.json'), JSON.stringify(rows, null, 1));
}
if (rows.length === 0 || rows.some((r) => !r.ok)) process.exitCode = 1;
