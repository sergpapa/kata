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

/** Every colour the panel puts on its own fill, and the ratio WCAG asks of it. */
const textPairs: readonly (readonly [string, string, number])[] = [
  ['--eyebrow', PANEL_FILL, 4.5],
  ['--foreground', PANEL_FILL, 4.5],
  ['--muted-foreground', PANEL_FILL, 4.5],
];

/** The tokens the panel draws edges with. A border is not text; 3:1 is its floor (WCAG 1.4.11). */
const edgeTokens = ['--border', '--quote-rule'] as const;

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
      ...edgeTokens,
      PANEL_FILL,
    ]);
    const unmeasured = paintedWith()
      .filter((entry) => !named.has(entry.token))
      .map((entry) => `${entry.property}: var(${entry.token})`);

    expect(unmeasured, 'a new colour here needs a new measured pair below').toEqual([]);
  });

  it('does not reach for the input border the design package ships broken', () => {
    // docs/specs/visual-design-integration.md C2: the published `--input` measures 1.53:1 on white
    // and is deliberately not ported. This slice has nothing to type into, so nothing may use it.
    expect(activitiesCss).not.toContain('var(--input)');
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

  it('does not style the no-store sentence more quietly than the line above it', () => {
    // It was --muted-foreground at 0.925rem while "This activity asks for…" had --foreground at
    // 1rem: smaller and dimmer, which is the visual grammar a reader uses to mean "skip this".
    // It is the one claim on the panel that has to land.
    const noStore = declarationsOf('.activity-no-store');

    expect(noStore).not.toContain('--muted-foreground');
    expect(noStore).not.toMatch(/font-size:\s*0\.\d+rem/);
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
