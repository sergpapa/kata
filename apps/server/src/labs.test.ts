import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { openDatabase, type Db } from './modules/lifecycle/database.js';
import { importRelease } from './modules/content/service.js';
import {
  makeFixture,
  makeTempDir,
  removeDir,
  writeFixture,
} from './modules/content/testkit/releaseFixture.js';

/**
 * Criteria K1, K2 and D1–D6, D8 in docs/specs/lab-downloads.md.
 *
 * The app has verified five lab kits on every start since slice 1 and never let anyone have one.
 * What matters here is not that bytes come back — it is that the bytes that come back are provably
 * the author's, that a file which has changed underneath the app is refused rather than handed
 * over, and that nothing in the request can reach a file the release does not name.
 */

const tempDirs: string[] = [];
let db: Db | undefined;

afterEach(() => {
  db?.close();
  db = undefined;
  while (tempDirs.length > 0) removeDir(tempDirs.pop() as string);
});

function releaseDir(mutate: (fixture: ReturnType<typeof makeFixture>) => void = () => {}): string {
  const dir = makeTempDir();
  tempDirs.push(dir);
  const fixture = makeFixture();
  mutate(fixture);
  return writeFixture(dir, fixture);
}

/** The fixture release, imported and served, with the directory the download reads from. */
function appOver(dir: string) {
  db = openDatabase(':memory:');
  return buildApp({ db, release: importRelease(db, dir), releaseDir: dir });
}

function sha256Of(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

describe('the kit a lesson declares, on the lesson', () => {
  it('names the kit, its version, its file, its size, its hash and who shares it', async () => {
    const dir = releaseDir();
    const app = appOver(dir);

    const response = await app.inject({ method: 'GET', url: '/api/lessons/FIX-LS-02' });

    const kitBytes = fs.readFileSync(path.join(dir, 'labs', 'kit-02.zip'));
    expect(response.json().labKit).toEqual({
      labId: 'FIX-LAB-02',
      version: '1.0.0-draft',
      fileName: 'kit-02.zip',
      byteSize: kitBytes.byteLength,
      sha256: sha256Of(kitBytes),
      lessonIds: ['FIX-LS-02'],
    });
  });

  it('answers null — not an empty object, not a missing key — when a lesson declares no kit', async () => {
    const app = appOver(releaseDir());

    const body = await app
      .inject({ method: 'GET', url: '/api/lessons/FIX-LS-01' })
      .then((r) => r.json());

    expect('labKit' in body).toBe(true);
    expect(body.labKit).toBeNull();
  });
});

describe('downloading a kit', () => {
  it('sends the stored bytes as an attachment under the author’s own filename', async () => {
    const dir = releaseDir();
    const app = appOver(dir);
    const onDisk = fs.readFileSync(path.join(dir, 'labs', 'kit-02.zip'));

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('application/zip');
    expect(response.headers['content-length']).toBe(String(onDisk.byteLength));
    expect(response.headers['content-disposition']).toBe('attachment; filename="kit-02.zip"');
    expect(response.rawPayload.equals(onDisk)).toBe(true);
  });

  it('sends bytes that hash to what the release says they hash to', async () => {
    const dir = releaseDir();
    const app = appOver(dir);
    const declared = sha256Of(fs.readFileSync(path.join(dir, 'labs', 'kit-02.zip')));

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' });

    // Asserted on the body received, never on a header: a header is the server's claim about the
    // bytes, and the claim is the thing under test.
    expect(sha256Of(response.rawPayload)).toBe(declared);
  });

  it('refuses a kit whose bytes changed under the running app, and sends no body', async () => {
    const dir = releaseDir();
    const app = appOver(dir);
    const kit = path.join(dir, 'labs', 'kit-02.zip');
    const declared = sha256Of(fs.readFileSync(kit));
    fs.writeFileSync(kit, Buffer.from('PK a different kit entirely', 'utf8'));
    const now = sha256Of(fs.readFileSync(kit));

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' });

    expect(response.statusCode).toBe(409);
    const body = response.json();
    expect(body.error).toBe('hash_mismatch');
    // Both hashes, because "the file changed" without them cannot be acted on.
    expect(body.message).toContain(declared);
    expect(body.message).toContain(now);
    expect(response.rawPayload.includes(Buffer.from('a different kit'))).toBe(false);
  });

  it('answers 404 naming the lab id it was asked for, and suggests no other', async () => {
    const app = appOver(releaseDir());

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-99/download' });

    expect(response.statusCode).toBe(404);
    const body = response.json();
    expect(body.error).toBe('lab_not_found');
    expect(body.message).toContain('FIX-LAB-99');
    expect(body.message).not.toContain('FIX-LAB-02');
  });

  it.each([
    ['..', '/api/labs/../download'],
    ['a parent traversal', '/api/labs/..%2F..%2Flearning-release.json/download'],
    ['a nested path', '/api/labs/labs%2Fkit-02.zip/download'],
    ['a backslash path', '/api/labs/..%5C..%5Clearning-release.json/download'],
    ['a drive letter', '/api/labs/C%3A%5CWindows%5Cwin.ini/download'],
  ])('reads no file for a lab id that is %s', async (_name, url) => {
    const dir = releaseDir();
    const app = appOver(dir);

    // The control, in the same test on purpose. Without it this case passes against an app that has
    // no download route at all and answers 404 to everything — which is the shape of test the
    // previous slice's PRE audit caught twice.
    expect(
      (await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' })).statusCode,
    ).toBe(200);

    const readFile = fs.readFileSync;
    const touched: string[] = [];
    // The route is meant to look the id up in the record store and never join it to a path, so the
    // strongest statement available is that no read happens at all.
    const spy = (file: Parameters<typeof readFile>[0], ...rest: unknown[]) => {
      touched.push(String(file));
      return (readFile as (...args: unknown[]) => Buffer)(file, ...rest);
    };
    (fs as unknown as { readFileSync: unknown }).readFileSync = spy;
    try {
      const response = await app.inject({ method: 'GET', url });
      expect(response.statusCode).toBe(404);
    } finally {
      (fs as unknown as { readFileSync: unknown }).readFileSync = readFile;
    }

    expect(
      touched.filter((file) => file.includes('learning-release') || file.includes('win.ini')),
    ).toEqual([]);
  });

  it('serves the release’s own refusal, and no bytes, while the release stands refused', async () => {
    const dir = releaseDir();
    fs.rmSync(path.join(dir, 'lessons', 'lesson-02.md'));
    const app = appOver(dir);

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' });

    expect(response.headers['content-type']).toContain('application/json');
    expect(response.json()).toMatchObject({ state: 'failed', failure: { code: 'file_missing' } });
  });

  it('leaves the kit on disk exactly as it was', async () => {
    const dir = releaseDir();
    const app = appOver(dir);
    const kit = path.join(dir, 'labs', 'kit-02.zip');
    const before = { bytes: fs.readFileSync(kit), mtime: fs.statSync(kit).mtimeMs };

    const response = await app.inject({ method: 'GET', url: '/api/labs/FIX-LAB-02/download' });

    // Asserted first, or "unchanged" is what you get from a download that never happened.
    expect(response.statusCode).toBe(200);
    expect(fs.readFileSync(kit).equals(before.bytes)).toBe(true);
    expect(fs.statSync(kit).mtimeMs).toBe(before.mtime);
  });
});
