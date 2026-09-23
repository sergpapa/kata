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
 * that lets it break has to be asserted, not assumed. And the Copy button sits above a block whose
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

/** Pairs the panel's own controls put on a surface that is not the panel's fill. */
const controlPairs: readonly (readonly [string, string, number])[] = [
  ['--foreground', '--card', 4.5],
  ['--muted-foreground', '--card', 4.5],
  ['--foreground', '--row-hover', 4.5],
];

/** Fills and edges the panel paints that are not its own text. */
const edgeAndSurfaceTokens = ['--border', '--quote-rule', '--input', '--card', '--row-hover'];

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
  const at = css.indexOf(`${selector} {`);
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
      ...edgeAndSurfaceTokens,
      PANEL_FILL,
    ]);
    const unmeasured = paintedWith(labCss)
      .filter((entry) => !named.has(entry.token))
      .map((entry) => `${entry.property}: var(${entry.token})`);

    expect(unmeasured, 'a new colour here needs a new measured pair below').toEqual([]);
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('the lab kit panel in the %s scheme', (_name, scheme) => {
  it.each(textPairs)('reads %s on %s at %s:1 or better', (foreground, background, minimum) => {
    expect(contrast(scheme, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it.each(controlPairs)('reads %s on %s at %s:1 or better', (foreground, background, minimum) => {
    expect(contrast(scheme, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it('separates itself from the lesson card it sits on, by fill or by edge', () => {
    // The floor the activity panel and the blockquote are already held to. A decorative panel edge
    // is not a WCAG 1.4.11 component boundary, and `--border` measures 1.20:1 against
    // `--background` in light — demanding 3:1 of it here would be demanding a colour this theme
    // does not have, which V1 forbids adding.
    const separation = Math.max(
      contrast(scheme, PANEL_FILL, '--card'),
      contrast(scheme, '--border', '--card'),
    );
    expect(separation).toBeGreaterThanOrEqual(1.15);
  });

  it('draws the download control’s own boundary at 3:1 against the panel', () => {
    // This one *is* WCAG 1.4.11: the download is the interactive component on this panel, and the
    // edge that tells a reader where it starts has to be visible. The token is read out of the
    // stylesheet rather than written here, so the rule cannot drift away from the measurement.
    const declared = rule(labCss, '.lab-kit-download');
    const token = /border[^:]*:\s*[^;]*var\((--[a-z0-9-]+)/.exec(declared)?.[1];

    expect(token, '.lab-kit-download must draw a boundary from a theme token').toBeDefined();
    expect(contrast(scheme, token as string, PANEL_FILL)).toBeGreaterThanOrEqual(3);
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
    // the page sideways. A button above it must not be what changes that.
    expect(rule(lessonCss, '.code-block-text')).toMatch(/overflow-x:\s*auto/);
  });

  it('draws its boundary and its label legibly on the code surface', () => {
    // `--code-bg` is the same dark navy in both schemes, so one measurement covers both. 3:1 for
    // the boundary (WCAG 1.4.11, the button is a component) and 4.5:1 for the word on it.
    const declared = rule(lessonCss, '.code-block-copy');
    const edge = /border:\s*[^;]*var\((--[a-z0-9-]+)/.exec(declared)?.[1];
    const ink = /(?:^|;)\s*color:\s*var\((--[a-z0-9-]+)/.exec(declared)?.[1];

    expect(edge, '.code-block-copy must draw its boundary from a theme token').toBeDefined();
    expect(ink, '.code-block-copy must take its ink from a theme token').toBeDefined();
    expect(contrast(light, edge as string, '--code-bg')).toBeGreaterThanOrEqual(3);
    expect(contrast(light, ink as string, '--code-bg')).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the block’s own scroll cue, which marks a sample wider than its box', () => {
    // The cue is how a reader at 375px learns an HTTP request continues past the right edge
    // (docs/specs/content-release-first-fifteen.md). It is a pair of `local`/`scroll` gradients on
    // the block itself, not a pseudo-element — asserted as the mechanism that is actually there,
    // because a header row above the block must not be where it goes missing.
    expect(lessonCss).toMatch(/\.code-block-text[^{]*\{[^}]*linear-gradient/);
  });
});
