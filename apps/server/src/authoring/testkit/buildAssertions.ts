/**
 * Small build helpers shared by the additions test files (docs/specs/release-additions.md).
 * Excluded from the server build.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect } from 'vitest';
import { buildRelease } from '../build.js';
import { NEW_KIT, outputPath } from './sourceFixture.js';

/** Builds, or fails the test with the refusal's reason. Returns the package directory. */
export function built(source: string, out = outputPath()): string {
  const outcome = buildRelease(source, out);
  if (outcome.state !== 'built') throw new Error(`build refused: ${outcome.reason}`);
  return out;
}

/** Builds, expects a refusal whose reason matches every pattern, and expects no output at all. */
export function expectRefusal(source: string, ...patterns: RegExp[]): void {
  const out = outputPath();
  const outcome = buildRelease(source, out);
  expect(outcome.state).toBe('refused');
  if (outcome.state === 'refused') {
    for (const pattern of patterns) expect(outcome.reason).toMatch(pattern);
  }
  expect(fs.readdirSync(path.dirname(out))).toEqual([]);
}

/** The bytes of the added kit's zip in a built package. */
export const kitZip = (packageDir: string) =>
  fs.readFileSync(path.join(packageDir, 'content/labs', `${NEW_KIT}.zip`));
