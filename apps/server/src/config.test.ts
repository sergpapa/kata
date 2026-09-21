import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

/**
 * Criterion C1 in docs/specs/content-release-first-fifteen.md and C4 in
 * docs/specs/content-release-first-thirteen.md — the defaults the app runs with when the owner
 * starts it plain, with no environment set.
 */
describe('the default configuration', () => {
  it('serves on 8317, leaving 4317 to the lessons 6–8 lab kit', () => {
    const config = loadConfig({});

    // Lessons 6–8 tell the learner to run their kit's server on 127.0.0.1:4317 and curl it there.
    // An app squatting on that port makes the kit fail to start — or worse, answers the curl
    // itself and teaches the wrong bytes. The author's kits so far climb 4315, 4317, 4319–4320.
    expect(config.port).toBe(8317);
    expect(config.host).toBe('127.0.0.1');
  });

  it('still lets EDUCODE_PORT choose the port', () => {
    expect(loadConfig({ EDUCODE_PORT: '5000' }).port).toBe(5000);
  });

  it('points at the fifteen-lesson release, and that directory really holds a manifest', () => {
    const releaseDir = loadConfig({}).releaseDir;

    expect(releaseDir.split(path.sep).join('/')).toContain(
      'content/releases/http-lessons-14-15-release-v1/content',
    );
    expect(fs.existsSync(path.join(releaseDir, 'learning-release.json'))).toBe(true);
  });

  it('still lets EDUCODE_RELEASE_DIR choose the release directory', () => {
    const elsewhere = path.join('somewhere', 'else');

    expect(loadConfig({ EDUCODE_RELEASE_DIR: elsewhere }).releaseDir).toBe(elsewhere);
  });
});
