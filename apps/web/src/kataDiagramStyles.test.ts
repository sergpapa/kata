import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Criterion KD9 in docs/specs/kata-diagrams.md: a Kata diagram takes every colour from the theme.
 *
 * The point of drawing diagrams in the page rather than in a frame is that they follow the palette.
 * One literal colour in this stylesheet is a diagram that stays that colour in the other scheme and
 * after the next design change, and theme.test.ts, which measures only token pairs, would never see
 * it.
 */

const here = path.dirname(fileURLToPath(import.meta.url));
/** Every stylesheet a Kata diagram is drawn with: the shared and column rules, and the row layout. */
const sheets = fs.readdirSync(here).filter((name) => /^kata-diagram.*\.css$/.test(name));
const stylesheet = sheets.map((name) => fs.readFileSync(path.join(here, name), 'utf8')).join('\n');

/**
 * The declarations' values, with comments removed so prose about colour does not count. A value
 * ends at `;` or at the `}` that closes its block, so a last declaration written without its
 * semicolon is still read.
 */
function declarationValues(css: string): string[] {
  const code = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...code.matchAll(/[\w-]+\s*:\s*([^;{}]+?)\s*(?=[;}])/g)].map((match) => match[1]!.trim());
}

/** Every CSS named colour (CSS Color Module Level 4, section 6.1). */
const NAMED = (
  'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue ' +
  'blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk ' +
  'crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki ' +
  'darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen ' +
  'darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue ' +
  'dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite ' +
  'gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki ' +
  'lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan ' +
  'lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen ' +
  'lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen ' +
  'magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen ' +
  'mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream ' +
  'mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid ' +
  'palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum ' +
  'powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown ' +
  'seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen ' +
  'steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'
).split(' ');

/**
 * A value with the custom property names taken out and their fallbacks kept: `var(--x, red)` must
 * still fail, while `var(--lime)` names a token rather than writing a colour.
 */
function withoutPropertyNames(value: string): string {
  return value.replace(/var\(\s*--[\w-]+/g, 'var(');
}

describe('the Kata diagram stylesheet (KD9)', () => {
  it('has both of its stylesheets to check', () => {
    expect(sheets.sort()).toEqual(['kata-diagram-rows.css', 'kata-diagram.css']);
  });

  it('has declarations to check', () => {
    expect(declarationValues(stylesheet).length).toBeGreaterThan(10);
  });

  it('reads a last declaration that has no semicolon', () => {
    expect(declarationValues('a { color: red }')).toEqual(['red']);
  });

  it('uses theme custom properties for colour', () => {
    expect(stylesheet).toMatch(/var\(--/);
  });

  it.each(declarationValues(stylesheet))('writes no colour literal in “%s”', (value) => {
    expect(value).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(value).not.toMatch(/\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i);
    const checked = withoutPropertyNames(value);
    for (const name of NAMED) {
      expect(checked).not.toMatch(new RegExp(`(^|[^\\w-])${name}($|[^\\w-])`, 'i'));
    }
  });

  it.each(['kata-diagram.css', 'kata-diagram-rows.css'])(
    'has %s imported by the app, so the rules above are the ones a reader gets',
    (sheet) => {
      const main = fs.readFileSync(path.join(here, 'main.tsx'), 'utf8');

      expect(main).toContain(`import './${sheet}';`);
    },
  );
});
