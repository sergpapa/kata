import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Criterion B3 in docs/specs/kata-brand.md: the tab title and favicons.
 *
 * Read as text: the page head lives in index.html, which no rendered test loads, and a favicon
 * link that names a missing file fails silently in every browser — the tab just shows a blank.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const html = readFileSync(path.join(webRoot, 'index.html'), 'utf8');
const head = new DOMParser().parseFromString(html, 'text/html');

/** A PNG's width and height, from its IHDR chunk (bytes 16–23, big-endian). */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('the page head', () => {
  it('names the tab Kata', () => {
    expect(head.title).toBe('Kata');
  });

  it('declares 32 px and 16 px PNG favicons, each a real file of that size', () => {
    // `~=` also catches a stray `rel="shortcut icon"`, which would name a file of its own.
    const icons = Array.from(head.querySelectorAll('link[rel~="icon"]'));
    expect(icons.map((link) => link.getAttribute('sizes')).sort()).toEqual(['16x16', '32x32']);

    for (const link of icons) {
      expect(link.getAttribute('type')).toBe('image/png');
      const href = link.getAttribute('href') ?? '';
      // Vite serves apps/web/public at the site root, in development and in the build.
      expect(href.startsWith('/')).toBe(true);
      const file = path.join(webRoot, 'public', href.slice(1));
      expect(existsSync(file), `${href} is missing from apps/web/public`).toBe(true);
      const side = Number(link.getAttribute('sizes')?.split('x')[0]);
      expect(pngSize(file)).toEqual({ width: side, height: side });
    }
  });
});
