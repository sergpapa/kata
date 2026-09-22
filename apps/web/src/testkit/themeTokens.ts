import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The theme's declared colours and the WCAG arithmetic over them, for any test that needs to prove
 * a pairing rather than assume one.
 *
 * Extracted from `apps/web/src/theme.test.ts`, which still owns the palette's own checks. It moved
 * here when the activity panel needed the same arithmetic: proving the panel's tokens are
 * *declared* says nothing about the ratio of the pair it actually puts on screen, and a second copy
 * of the luminance formula would be a second chance to get it wrong.
 */

// Spelled out rather than `new URL('../theme.css', import.meta.url)`: Vite rewrites that exact
// pattern into a served asset URL, and the test then reads the bundler's path instead of the file.
export const themeCss = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../theme.css'),
  'utf8',
);

/** The custom properties of one block, as declared. */
export function tokensIn(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name as string] = (value as string).trim();
  }
  return tokens;
}

/** The declarations inside the first block whose opening line matches. */
export function blockAfter(marker: RegExp): string {
  const start = themeCss.search(marker);
  if (start === -1) throw new Error(`theme.css has no block matching ${marker}`);
  const open = themeCss.indexOf('{', start);
  return themeCss.slice(open + 1, themeCss.indexOf('}', open));
}

export const light = tokensIn(blockAfter(/^:root\s*\{/m));
const darkOverrides = tokensIn(blockAfter(/prefers-color-scheme:\s*dark[\s\S]{0,80}?:root/));
export const dark = { ...light, ...darkOverrides };

/** Every custom property the theme declares, in either scheme. */
export const declaredTokens = new Set(Object.keys(dark));

/** WCAG 2.1 relative luminance of an opaque hex colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return (
    0.2126 * (channels[0] as number) +
    0.7152 * (channels[1] as number) +
    0.0722 * (channels[2] as number)
  );
}

/** The contrast ratio of two declared tokens, in one scheme. */
export function contrast(
  scheme: Record<string, string>,
  foreground: string,
  background: string,
): number {
  const [lighter, darker] = [scheme[foreground], scheme[background]].map((value) => {
    if (value === undefined) throw new Error(`theme.css declares no ${foreground}/${background}`);
    if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${value} is not an opaque hex colour`);
    return luminance(value);
  });
  const [high, low] = [lighter as number, darker as number].sort((a, b) => b - a);
  return ((high as number) + 0.05) / ((low as number) + 0.05);
}
