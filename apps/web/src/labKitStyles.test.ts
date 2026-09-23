import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrast, dark, declaredTokens, light } from './testkit/themeTokens.js';

/**
 * Criteria V1–V3 in docs/specs/lab-downloads.md.
 *
 * Read as text for the same reason `activityPanelStyles.test.ts` and `theme.test.ts` are: jsdom
 * applies no stylesheet, so every claim about colour made against a rendered DOM passes vacuously.
 *
 * Two things here are not colour and matter more than it. A SHA-256 is 64 unbroken characters with
 * no space to wrap at, and the panel prints one on a card that has to survive 375px — so the rule
 * that lets it break has to be asserted, not assumed. And the Copy button sits over a block whose
 * horizontal scrolling is load-bearing for HTTP samples, so it must not be what stops that block
 * scrolling.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const labCss = readFileSync(path.resolve(here, 'lab-kit.css'), 'utf8');
const lessonCss = readFileSync(path.resolve(here, 'lesson.css'), 'utf8');

/** The panel's own fill. Its text sits on this, and it sits on the lesson card. */
const PANEL_FILL = '--background';

/** Every colour the panel puts on its own fill, and the ratio WCAG asks of it. */
const textPairs: readonly (readonly [string, string, number])[] = [
  ['--eyebrow', PANEL_FILL, 4.5],
  ['--foreground', PANEL_FILL, 4.5],
  ['--muted-foreground', PANEL_FILL, 4.5],
];

/** Pairs on a surface that is not the panel's own fill. */
const controlPairs: readonly (readonly [string, string, number])[] = [
  ['--foreground', '--card', 4.5],
  ['--muted-foreground', '--card', 4.5],
  ['--foreground', '--row-hover', 4.5],
];

/** Tokens the panel draws edges with. A border is not text; 3:1 is its floor (WCAG 1.4.11). */
const edgeTokens = ['--border', '--quote-rule', '--input'] as const;

/** Fills the panel paints that are not its own. */
const surfaceTokens = ['--card', '--row-hover'] as const;

const colourProperties =
  /(?:^|[;{])\s*(color|background|background-color|border|border-color|border-left|border-left-color|border-top|outline|outline-color|box-shadow|fill|stroke)\s*:\s*([^;}]+)/g;

function paintedWith(css: string): { property: string; token: string }[] {
  const painted: { property: string; token: string }[] = [];
  for (const [, property, value] of css.matchAll(colourProperties)) {
    for (const [, token] of (value as string).matchAll(/var\((--[a-z0-9-]+)/g)) {
      painted.push({ property: property as string, token: token as string });
    }
  }
  return painted;
}

/** The declarations of one selector, as written. */
function rule(css: string, selector: string): string {
  const at = css.indexOf(selector);
  if (at === -1) throw new Error(`the stylesheet has no ${selector} rule`);
  const open = css.indexOf('{', at);
  return css.slice(open + 1, css.indexOf('}', open));
}

describe('the lab kit panel’s styles', () => {
  it('styles the panel at all', () => {
    expect(labCss).toContain('.lab-kit');
  });

  it('names no colour of its own — every one comes from a theme token', () => {
    const literals: string[] = [];
    for (const [, property, value] of labCss.matchAll(colourProperties)) {
      const text = value as string;
      if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(text)) {
        literals.push(`${property}: ${text.trim()}`);
      }
    }

    expect(literals, 'colours belong in theme.css, where they are measured').toEqual([]);
  });

  it('uses only tokens the theme already declares, introducing none', () => {
    const used = paintedWith(labCss).map((entry) => entry.token);

    expect(used.length, 'the panel must take its colours from the theme').toBeGreaterThan(0);
    expect(used.filter((token) => !declaredTokens.has(token))).toEqual([]);
  });

  it('paints nothing this file has not named as a measured pair or edge', () => {
    const named = new Set<string>([
      ...textPairs.map(([foreground]) => foreground),
      ...controlPairs.flatMap(([foreground, background]) => [foreground, background]),
      ...edgeTokens,
      ...surfaceTokens,
      PANEL_FILL,
    ]);
    const unmeasured = paintedWith(labCss)
      .filter((entry) => !named.has(entry.token))
      .map((entry) => `${entry.property}: var(${entry.token})`);

    expect(unmeasured, 'a new colour here needs a new measured pair below').toEqual([]);
  });

  it.each(textPairs)('reads %s on %s in both schemes', (foreground, background, floor) => {
    expect(
      contrast(light[foreground] as string, light[background] as string),
    ).toBeGreaterThanOrEqual(floor);
    expect(contrast(dark[foreground] as string, dark[background] as string)).toBeGreaterThanOrEqual(
      floor,
    );
  });

  it.each(controlPairs)('reads %s on %s in both schemes', (foreground, background, floor) => {
    expect(
      contrast(light[foreground] as string, light[background] as string),
    ).toBeGreaterThanOrEqual(floor);
    expect(contrast(dark[foreground] as string, dark[background] as string)).toBeGreaterThanOrEqual(
      floor,
    );
  });

  it.each(edgeTokens)('draws %s against both fills at 3:1', (token) => {
    expect(contrast(light[token] as string, light[PANEL_FILL] as string)).toBeGreaterThanOrEqual(3);
    expect(contrast(dark[token] as string, dark[PANEL_FILL] as string)).toBeGreaterThanOrEqual(3);
  });
});

describe('the panel at 375px', () => {
  it('lets the SHA-256 break, because 64 characters have nowhere to wrap', () => {
    // `overflow-wrap: anywhere` and `word-break: break-all` both do it; `break-word` alone does not
    // break an unbroken run, which is exactly what a hash is.
    expect(rule(labCss, '.lab-kit-hash')).toMatch(
      /overflow-wrap:\s*anywhere|word-break:\s*break-all/,
    );
  });

  it('never lets the panel set a width the card cannot give it', () => {
    expect(labCss).not.toMatch(/(?:^|[;{])\s*width:\s*\d/);
    expect(labCss).not.toMatch(/min-width:\s*(?!0)\d/);
  });
});

describe('the copy button over a code block', () => {
  it('leaves the block scrolling inside itself', () => {
    // W3 of docs/specs/markdown-rendering.md: a sample scrolls in its own box rather than pushing
    // the page sideways. A button positioned over it must not be what changes that.
    expect(rule(lessonCss, '.code-block-text')).toMatch(/overflow-x:\s*auto/);
  });

  it('keeps the block’s own scroll cue, which marks a sample wider than its box', () => {
    // The cue is how a reader at 375px learns an HTTP request continues past the right edge
    // (docs/specs/content-release-first-fifteen.md). A header row above the block must not be
    // where it goes missing.
    expect(lessonCss).toMatch(/\.code-block(-text)?[^{]*(::after|::before)/);
  });
});
