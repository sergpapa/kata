/**
 * Shared driver for the two browser-cache rehearsals (the 9–13 and 14–15 kits' Instructor_Notes.md):
 * starts a kit's own server, presses the kit's lab-page buttons in Chromium, and compares each step
 * with what the instructor notes expect.
 *
 * The browser's HTTP cache must stay on, so nothing here intercepts requests: Playwright switches
 * the cache off for a page with a route. What the origin did comes from the kit's own request log,
 * written as `${status}` for an unconditional request and `${status}c` for one carrying
 * If-None-Match.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { kitsDir } from './server.mjs';

export const kitRoot = (zipName, root) => path.join(kitsDir, zipName, root);

export class KitServer {
  constructor(cwd, args) {
    this.cwd = cwd;
    this.args = args;
    this.log = [];
  }

  async start() {
    this.child = spawn(process.execPath, ['server.mjs', ...this.args], {
      cwd: this.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    this.child.stdout.on('data', (d) => this.log.push(...String(d).split('\n').filter(Boolean)));
    this.child.stderr.on('data', (d) => this.log.push(...String(d).split('\n').filter(Boolean)));
    const port = this.args.at(-1);
    for (let i = 0; i < 50; i += 1) {
      try {
        await fetch(`http://127.0.0.1:${port}/lab`, { method: 'HEAD' });
        await new Promise((r) => setTimeout(r, 150));
        this.log = [];
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    throw new Error(`kit server did not start: ${this.log.join('\n')}`);
  }

  async stop() {
    if (!this.child || this.child.exitCode !== null || this.child.signalCode !== null) return;
    const done = new Promise((r) => this.child.once('exit', r));
    this.child.kill();
    await done;
  }

  /** The origin requests logged since the last call, as `200`, `304c` and so on. */
  take() {
    const seen = this.log
      .filter((l) => l.startsWith('{') && l.includes('"status"'))
      .map((l) => JSON.parse(l))
      .map((o) => `${o.status}${o.ifNoneMatch ? 'c' : ''}`);
    this.log = [];
    return seen;
  }
}

/**
 * Presses one lab-page button and checks it: `origin` the expected request log, `shows` the
 * expected closing time on the page (or text the page's message must contain).
 */
export async function press(page, server, rows, { step, label, target, source, origin, shows }) {
  if (target) await page.locator('#target').fill(target);
  await new Promise((r) => setTimeout(r, 150));
  server.take();
  const before = await page.locator('#message').textContent();
  await page.getByRole('button', { name: label, exact: true }).click();
  await page
    .waitForFunction((b) => document.querySelector('#message').textContent !== b, before, {
      timeout: 5000,
    })
    .catch(() => {});
  await page.waitForTimeout(400);
  const seen = server.take();
  const body = (await page.locator('#body').textContent()).replace(/\s+/g, ' ');
  const message = (await page.locator('#message').textContent()).trim();
  const displayed = (body.match(/\d\d:\d\d/) ?? ['(none)'])[0];
  const ok =
    JSON.stringify(seen) === JSON.stringify(origin) &&
    (/^\d\d:\d\d$/.test(shows) ? displayed === shows : message.includes(shows));
  const row = {
    step,
    label,
    target,
    source,
    origin: seen,
    expectedOrigin: origin,
    displayed,
    message,
    ok,
  };
  rows.push(row);
  console.log(
    `${ok ? 'PASS' : 'FAIL'} step ${step} ${label}${target ? ` ${target}` : ''} [${source}]: origin ${JSON.stringify(seen)} (expected ${JSON.stringify(origin)}), page ${displayed}${/^\d\d:\d\d$/.test(shows) ? '' : `, "${message}"`}`,
  );
}
