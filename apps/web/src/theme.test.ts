import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Criteria C1–C3 in docs/specs/visual-design-integration.md.
 *
 * Colour is the one part of this slice a jsdom render cannot see — no stylesheet is applied, so
 * every assertion about contrast would pass vacuously against the DOM. These read the token file
 * itself and do the WCAG arithmetic, which is also the only honest way to check the dark palette:
 * the design package supplies no dark values, so ours are derived, and a derived palette that
 * nobody measured is a guess with a hex code.
 */

// Spelled out rather than `new URL('./theme.css', import.meta.url)`: Vite rewrites that exact
// pattern into a served asset URL, and the test then reads the bundler's path instead of the file.
const css = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'theme.css'),
  'utf8',
);

/** The custom properties of one block, as declared. */
function tokensIn(block: string): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const [, name, value] of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens[name as string] = (value as string).trim();
  }
  return tokens;
}

function blockAfter(marker: RegExp): string {
  const start = css.search(marker);
  if (start === -1) throw new Error(`theme.css has no block matching ${marker}`);
  const open = css.indexOf('{', start);
  return css.slice(open + 1, css.indexOf('}', open));
}

const light = tokensIn(blockAfter(/^:root\s*\{/m));
const darkOverrides = tokensIn(blockAfter(/prefers-color-scheme:\s*dark[\s\S]{0,80}?:root/));
const dark = { ...light, ...darkOverrides };

/** WCAG 2.1 relative luminance, then the contrast ratio of two opaque colours. */
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

function contrast(scheme: Record<string, string>, foreground: string, background: string): number {
  const [lighter, darker] = [scheme[foreground], scheme[background]].map((value) => {
    if (value === undefined) throw new Error(`theme.css declares no ${foreground}/${background}`);
    if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${value} is not an opaque hex colour`);
    return luminance(value);
  });
  const [high, low] = [lighter as number, darker as number].sort((a, b) => b - a);
  return ((high as number) + 0.05) / ((low as number) + 0.05);
}

/**
 * Every pair the stylesheet actually puts on top of each other. Text needs 4.5:1; the focus ring
 * is a non-text indicator and needs 3:1 against each surface it can land on.
 */
const pairs: readonly (readonly [string, string, number])[] = [
  ['--foreground', '--background', 4.5],
  ['--foreground', '--card', 4.5],
  ['--muted-foreground', '--background', 4.5],
  ['--muted-foreground', '--card', 4.5],
  ['--eyebrow', '--background', 4.5],
  ['--primary', '--card', 4.5],
  ['--primary', '--background', 4.5],
  ['--primary-foreground', '--primary', 4.5],
  ['--sidebar-foreground', '--sidebar', 4.5],
  ['--sidebar-muted', '--sidebar', 4.5],
  ['--nav-ink', '--sidebar', 4.5],
  ['--sidebar-foreground', '--sidebar-accent', 4.5],
  ['--continue-foreground', '--continue-card', 4.5],
  ['--continue-muted', '--continue-card', 4.5],
  ['--lime-ink', '--lime', 4.5],
  ['--lime-ink', '--lime-hover', 4.5],
  ['--code-ink', '--code-bg', 4.5],
  ['--ring', '--background', 3],
  ['--ring', '--card', 3],
  ['--ring', '--sidebar', 3],
];

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('the %s scheme', (name, scheme) => {
  it.each(pairs)('puts %s on %s at %s:1 or better', (foreground, background, minimum) => {
    expect(contrast(scheme, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });
});

/**
 * Surfaces, not text.
 *
 * AA contrast says nothing about whether a panel inside a card still looks like a panel, and the
 * first dark palette written for this slice measured 1.03:1 between the code block and the card it
 * sits in — one flat navy field, with every text pair passing AA throughout. A panel is separated
 * either by its fill or by its edge, so this asserts that at least one of the two does the work.
 */
const surfaces = [
  ['the code panel inside a card', '--code-bg', '--panel-edge', '--card'],
  ['a blockquote inside a card', '--quote-bg', '--quote-rule', '--card'],
  ['a card on the workspace', '--card', '--border', '--background'],
  ['the sidebar beside the workspace', '--sidebar', '--sidebar', '--background'],
] as const;

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('surfaces in the %s scheme', (name, scheme) => {
  it.each(surfaces)('separates %s, by fill or by edge', (what, fill, edge, on) => {
    const separation = Math.max(contrast(scheme, fill, on), contrast(scheme, edge, on));
    expect(separation).toBeGreaterThanOrEqual(1.15);
  });
});

/** The package's DESIGN_SPECIFICATION §2 table, role by role. */
const published: Readonly<Record<string, string>> = {
  '--background': '#f5f7fc',
  '--foreground': '#19233e',
  '--card': '#ffffff',
  '--muted-foreground': '#57627c',
  '--primary': '#3349b3',
  '--primary-foreground': '#ffffff',
  '--sidebar': '#17233f',
  '--sidebar-foreground': '#f2f5ff',
  '--sidebar-accent': '#2a3a60',
  '--sidebar-marker': '#d7ef81',
  '--continue-card': '#23335a',
  '--lime': '#d7ef81',
  '--lime-ink': '#25370f',
  '--lime-hover': '#e3f8a1',
  '--border': '#dde3ef',
  '--ring': '#546acc',
  '--code-bg': '#17233c',
  '--code-ink': '#d7e4f7',
};

describe('fidelity to the supplied design', () => {
  it.each(Object.entries(published))('gives %s the published value %s in light', (token, value) => {
    expect(light[token]?.toLowerCase()).toBe(value);
  });

  /**
   * Decision 4 in the spec: the sidebar, the current-lesson card and the lime action are already
   * dark surfaces in the reference, so the dark scheme keeps them exactly. Re-tinting them would
   * be inventing colour the package did not supply.
   */
  it.each([
    '--sidebar',
    '--sidebar-foreground',
    '--sidebar-accent',
    '--sidebar-marker',
    '--sidebar-muted',
    '--nav-ink',
    '--continue-card',
    '--continue-foreground',
    '--continue-muted',
    '--lime',
    '--lime-ink',
    '--lime-hover',
  ])('keeps %s identical in both schemes', (token) => {
    // By value, not by absence: restating a token inside the dark block for clarity is correct.
    expect(dark[token]).toBe(light[token]);
  });
});
