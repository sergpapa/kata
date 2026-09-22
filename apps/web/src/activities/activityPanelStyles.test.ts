import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contrast, dark, declaredTokens, light } from '../testkit/themeTokens.js';

/**
 * Criteria V1 and V2 in docs/specs/activity-placement.md.
 *
 * The panel is the app speaking inside a page of the author's words, so it has to look different
 * from the prose around it — and it has to do that with colours somebody measured. Proving each
 * token is merely *declared* would not be that: two individually-sound tokens can be paired into a
 * combination nobody ever checked. So this names the pairs the panel actually puts on screen,
 * measures each one in both schemes, and then proves the named list is the whole of what the
 * stylesheet uses, so the list cannot drift away from the CSS.
 *
 * Read as text for the same reason theme.test.ts is: jsdom applies no stylesheet, so every
 * assertion about colour made against a rendered DOM passes vacuously.
 */

const activitiesCss = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../activities.css'),
  'utf8',
);

/** The panel's own fill. Its text sits on this, and it sits on the lesson card. */
const PANEL_FILL = '--background';

/**
 * Every colour the panel puts on its own fill, and the ratio WCAG asks of it.
 *
 * The three save-state inks joined this list with the writing surfaces
 * (docs/specs/acknowledged-saves.md D2). They are read as words, so 4.5:1 — colour alone never
 * carries a state here, but a state line nobody can read is no better than one that lies.
 */
const textPairs: readonly (readonly [string, string, number])[] = [
  ['--eyebrow', PANEL_FILL, 4.5],
  ['--foreground', PANEL_FILL, 4.5],
  ['--muted-foreground', PANEL_FILL, 4.5],
  ['--state-saved', PANEL_FILL, 4.5],
  ['--state-failed', PANEL_FILL, 4.5],
  ['--state-conflict', PANEL_FILL, 4.5],
];

/**
 * Pairs the panel's controls put on a surface that is not the panel's own fill: the text inside a
 * box, and the label on the save action.
 */
const controlPairs: readonly (readonly [string, string, number])[] = [
  ['--foreground', '--card', 4.5],
  ['--primary-foreground', '--primary', 4.5],
];

/**
 * The tokens the panel draws edges with. A border is not text; 3:1 is its floor (WCAG 1.4.11).
 *
 * `--input` is here rather than forbidden, which is the change this slice makes: the panel now has
 * controls, so the boundary token is needed — at the darker value theme.test.ts pins, never the
 * published one.
 */
const edgeTokens = ['--border', '--quote-rule', '--input'] as const;

/** Fills the panel paints that are not its own. */
const surfaceTokens = ['--card', '--primary'] as const;

const colourProperties =
  /(?:^|[;{])\s*(color|background|background-color|border|border-color|border-left|border-left-color|border-top|outline|outline-color|box-shadow|fill|stroke)\s*:\s*([^;}]+)/g;

/** Every (property, token) the stylesheet actually paints with. */
function paintedWith(): { property: string; token: string }[] {
  const painted: { property: string; token: string }[] = [];
  for (const [, property, value] of activitiesCss.matchAll(colourProperties)) {
    for (const [, token] of (value as string).matchAll(/var\((--[a-z0-9-]+)/g)) {
      painted.push({ property: property as string, token: token as string });
    }
  }
  return painted;
}

describe('the activity panel’s styles', () => {
  it('styles the panel at all', () => {
    expect(activitiesCss).toContain('.activity-panel');
  });

  it('names no colour of its own — every one comes from a theme token', () => {
    const literals: string[] = [];
    for (const [, property, value] of activitiesCss.matchAll(colourProperties)) {
      const text = value as string;
      if (/#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(/i.test(text)) {
        literals.push(`${property}: ${text.trim()}`);
      }
    }

    expect(literals, 'colours belong in theme.css, where they are measured').toEqual([]);
  });

  it('uses only tokens the theme actually declares', () => {
    const used = paintedWith().map((entry) => entry.token);

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
    const unmeasured = paintedWith()
      .filter((entry) => !named.has(entry.token))
      .map((entry) => `${entry.property}: var(${entry.token})`);

    expect(unmeasured, 'a new colour here needs a new measured pair below').toEqual([]);
  });

  it('draws the boxes with the theme’s input border rather than a border of its own', () => {
    // The inverse of what this test asserted through slice 9, and deliberately so. Until this
    // slice there was nothing to type into, so `--input` was left undeclared rather than ported at
    // the published 1.53:1 (docs/specs/visual-design-integration.md C2). The first textarea arrives
    // here, and the token arrives with it at a value theme.test.ts measures.
    expect(activitiesCss).toContain('var(--input)');
  });
});

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('the panel in the %s scheme', (_name, scheme) => {
  it.each(textPairs)('reads %s on %s at %s:1 or better', (foreground, background, minimum) => {
    expect(contrast(scheme, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it('separates itself from the lesson card it sits on, by fill or by edge', () => {
    // The same rule theme.test.ts applies to the code panel and the blockquote: a panel a reader
    // cannot see the edges of is not a panel, however well its text contrasts.
    const separation = Math.max(
      contrast(scheme, PANEL_FILL, '--card'),
      contrast(scheme, '--border', '--card'),
    );
    expect(separation).toBeGreaterThanOrEqual(1.15);
  });

  it('draws the unplaced panel’s rule strongly enough to be seen against it', () => {
    expect(contrast(scheme, '--quote-rule', PANEL_FILL)).toBeGreaterThanOrEqual(1.15);
  });

  it.each(controlPairs)('reads %s on %s at %s:1 or better', (foreground, background, minimum) => {
    expect(contrast(scheme, foreground, background)).toBeGreaterThanOrEqual(minimum);
  });

  it('draws a box boundary at 3:1 against both the panel and the box', () => {
    // WCAG 1.4.11. The border is between the panel's fill outside it and the box's fill inside it,
    // so both sides count.
    expect(contrast(scheme, '--input', PANEL_FILL)).toBeGreaterThanOrEqual(3);
    expect(contrast(scheme, '--input', '--card')).toBeGreaterThanOrEqual(3);
  });
});

/**
 * The design review's findings, pinned so they cannot drift back.
 */
describe('what the panel emphasises', () => {
  function declarationsOf(selector: string): string {
    const at = activitiesCss.indexOf(`${selector} {`);
    if (at === -1) throw new Error(`activities.css has no ${selector} rule`);
    return activitiesCss.slice(at, activitiesCss.indexOf('}', at));
  }

  it('does not set the save state as small print', () => {
    // The design review's finding from slice 9, transferred with its subject. There it was
    // "the app cannot store any of it yet", set smaller and dimmer than the line above it, which is
    // the visual grammar a reader uses to mean "skip this". That sentence is gone; the save state
    // is now the panel's one load-bearing claim, and it inherits the rule.
    const state = declarationsOf('.response-state');

    expect(state).not.toMatch(/font-size:\s*0\.[0-8]\d*rem/);
  });

  it('keeps the activity id from breaking across lines', () => {
    // ACT-M020-01-01 wrapped after its last hyphen at 375px. It is an identifier the app is
    // presenting as an identifier.
    expect(declarationsOf('.activity-id')).toContain('white-space: nowrap');
  });

  it('leaves lime as the spot colour it was reserved to be', () => {
    // docs/specs/edge-visual-refinement.md: "Nothing else is lime." The panel had taken it as a
    // fifth use, which would have made lime mean both "you are here" and "this is an activity".
    expect(activitiesCss).not.toContain('var(--lime)');
  });
});
