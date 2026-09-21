/**
 * The diagram half of the screenshot gate: whether Mermaid stayed out of the entry bundle, and
 * whether a lesson that should carry a drawing actually carries one.
 *
 * Split from tools/screenshots.mjs, which drives the browser and owns the layout checks. The
 * contract checked here is docs/specs/mermaid-diagrams.md; the reasoning is ADR 0008.
 */
import fs from 'node:fs';
import path from 'node:path';

/**
 * Criterion M5 in docs/specs/mermaid-diagrams.md: a lesson with no diagram must not pay for
 * Mermaid. No test in jsdom can prove this — `vi.mock('mermaid')` intercepts the module whether
 * the import is lazy or eager — so the built bundle is the only place the claim can be checked.
 * Mermaid must live in a chunk of its own that the entry does not pull in.
 */
export function checkMermaidIsLazy(repoRoot, webIndex, failures) {
  const assetsDir = path.join(repoRoot, 'apps', 'web', 'dist', 'assets');
  const html = fs.readFileSync(webIndex, 'utf8');
  const entryName = /<script[^>]+src="[^"]*\/assets\/([^"]+\.js)"/.exec(html)?.[1];
  if (!entryName) {
    failures.push('could not find the entry script in apps/web/dist/index.html');
    return;
  }

  // A string from Mermaid's own grammar, which none of this application's source contains.
  const marker = 'sequenceDiagram';
  const carrying = fs
    .readdirSync(assetsDir)
    .filter((name) => name.endsWith('.js'))
    .filter((name) => fs.readFileSync(path.join(assetsDir, name), 'utf8').includes(marker));

  if (carrying.includes(entryName)) {
    failures.push(
      `Mermaid is bundled into the entry chunk (${entryName}), so lessons 3 and 4 pay for a ` +
        `diagram library they do not use. It must be reached by a dynamic import().`,
    );
  } else if (carrying.length === 0) {
    failures.push(`no built chunk contains Mermaid — the diagram code did not reach the bundle`);
  } else {
    console.log(`  Mermaid is lazy: ${carrying.join(', ')}, not the entry ${entryName}`);
  }
}

/**
 * WCAG 2.1 relative luminance and contrast, for the one colour pair this repository can only read
 * at runtime. Every other pair is checked from the stylesheet in apps/web/src/theme.test.ts; a
 * diagram's colours come from Mermaid's own theme, inside a document that does not exist until it
 * has been drawn.
 */
function luminance([r, g, b]) {
  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** A computed colour as three channels, or null when it is not an opaque colour at all. */
function rgb(value) {
  const parts = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/.exec(value ?? '');
  if (!parts) return null;
  if (parts[4] !== undefined && Number(parts[4]) !== 1) return null;
  return [Number(parts[1]), Number(parts[2]), Number(parts[3])];
}

function contrast(a, b) {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

/**
 * The drawing itself, read from inside the frame that holds it.
 *
 * Everything the host page can say about a diagram — how many frames there are, what their sandbox
 * is, how big a box they were given — is set from React props before Mermaid has drawn anything.
 * Those checks all pass on an empty frame, and that is exactly what every `drawn` capture in
 * screenshots/ was until a design review looked at the pictures rather than at the report. The
 * drawing lives in a separate document, so the only honest way to know it is there is to open it.
 *
 * Scrolling first is for the picture, not for this check — see the line itself.
 */
async function readDrawing(page) {
  const handle = await page.$('.diagram-scroll iframe');
  if (!handle) return { drawing: null, why: 'there is no diagram frame on the page' };

  // The frame is `loading="lazy"` and sits thousands of pixels down a lesson, and a full-page
  // screenshot captures beyond the viewport without ever scrolling it there. Reading the document
  // below works either way; what needs this line is the capture — without it Chromium never paints
  // the frame and every `drawn` picture comes out an empty box. Measured rather than assumed:
  // delete this line and the checks stay green while the captures go blank again.
  await page.locator('.diagram-scroll').first().scrollIntoViewIfNeeded();
  const frame = await handle.contentFrame();
  if (!frame) return { drawing: null, why: 'the diagram frame has no document of its own' };

  try {
    await frame.waitForSelector('svg', { timeout: 10_000 });
  } catch {
    return { drawing: null, why: 'the diagram frame still held no <svg> after 10s' };
  }

  const drawing = await frame.evaluate(() => {
    const svg = document.querySelector('svg');
    const box = svg.getBoundingClientRect();
    // Two grammars, two label mechanisms: sequence diagrams write SVG `<text>`, flowcharts write
    // HTML inside `<foreignObject>` (Lesson 6 renders 0 texts and 11 foreignObjects). A reader
    // that only counts `<text>` reports a fully drawn flowchart as blank.
    const labels = [...document.querySelectorAll('svg text, svg foreignObject')]
      .map((node) => (node.textContent ?? '').trim())
      .filter((text) => text !== '');
    // `.messageText` is the one sequence-diagram class whose own `fill` is the colour its glyphs
    // are painted in. On `.actor` the fill belongs to the box behind the label rather than to the
    // label, so reading that one would report a colour nobody sees and fail for the wrong reason.
    // A flowchart's labels are HTML spans (`.nodeLabel`), painted by CSS `color`, not `fill`.
    const message = document.querySelector('svg text.messageText');
    const nodeLabel = document.querySelector('svg foreignObject .nodeLabel');
    return {
      width: Math.round(box.width),
      height: Math.round(box.height),
      labels,
      strokes: document.querySelectorAll('svg path, svg line, svg rect').length,
      ink: message
        ? getComputedStyle(message).fill
        : nodeLabel
          ? getComputedStyle(nodeLabel).color
          : null,
      paper: getComputedStyle(document.body).backgroundColor,
    };
  });
  return { drawing, why: null };
}

/** What the page itself can say about its diagrams, before the frames are opened. */
async function readDiagramMachinery(page, expected) {
  // Waited for only where a diagram is expected. A lesson with none would otherwise spend the
  // whole timeout on a selector that can never match — 12 route/width/scheme combinations, three
  // minutes of nothing, on every run.
  if (expected !== 'none') {
    await page
      .waitForSelector('.diagram iframe, .diagram .diagram-reason', { timeout: 15_000 })
      .catch(() => {});
  }
  return page.evaluate(() => {
    const frames = [...document.querySelectorAll('.diagram-scroll iframe')];
    const notice = document.querySelector('.diagram [role="status"]');
    const source = [...document.querySelectorAll('.diagram pre')].some((block) =>
      (block.textContent ?? '').includes('sequenceDiagram'),
    );
    return {
      frames: frames.length,
      sandbox: frames.map((frame) => frame.getAttribute('sandbox')),
      sizes: frames.map((frame) => {
        const box = frame.getBoundingClientRect();
        return { w: Math.round(box.width), h: Math.round(box.height) };
      }),
      notice: notice?.textContent ?? null,
      source,
    };
  });
}

/**
 * Every diagram claim one route makes, checked against the rendered page.
 *
 * Criteria R1, R2 and L4 in docs/specs/mermaid-diagrams.md. jsdom has no SVG layout, so a real
 * browser is the only place that can answer whether a diagram became a picture — or whether the
 * one Mermaid refuses fell back to its source with a reason.
 *
 * Pushes onto `failures` rather than throwing, so one run reports all of them. Returns whether
 * there is a drawing to photograph.
 */
export async function checkDiagram(page, route, size, scheme, failures) {
  if (!route.diagram) return false;

  const where = `${route.name} (${scheme}) at ${size.width}px`;
  const diagram = await readDiagramMachinery(page, route.diagram);

  if (route.diagram === 'none') {
    // Criterion R3: these two lessons have no diagram at all, and no slice must grow them one.
    // An unchecked route cannot report a regression.
    if (diagram.frames !== 0 || diagram.notice !== null) {
      failures.push(
        `${where} has diagram machinery on a lesson that has no diagram: ${diagram.frames} ` +
          `frame(s), notice ${JSON.stringify(diagram.notice)}`,
      );
    }
    return false;
  }

  if (route.diagram === 'fallback') {
    if (diagram.frames !== 0) {
      failures.push(
        `${where} drew ${diagram.frames} diagram(s); this lesson's diagram does not parse and must ` +
          `fall back to its source`,
      );
    }
    if (!/could not be drawn/i.test(diagram.notice ?? '')) {
      failures.push(
        `${where} does not say the diagram could not be drawn (found ${JSON.stringify(diagram.notice)})`,
      );
    }
    if (!diagram.source) {
      failures.push(`${where} lost the diagram source it was supposed to fall back to`);
    }
    return false;
  }

  // Loud rather than lenient: a typo in the routes table would otherwise take the strictest path
  // and report failures about a claim nobody made.
  if (route.diagram !== 'drawn') {
    failures.push(`${where} declares an unknown diagram kind ${JSON.stringify(route.diagram)}`);
    return false;
  }

  if (diagram.frames !== 1) {
    failures.push(
      `${where} drew ${diagram.frames} diagram(s), expected 1` +
        (diagram.notice ? ` — the page says: ${diagram.notice.trim()}` : ''),
    );
  }
  if (diagram.sandbox.some((value) => value !== '')) {
    failures.push(
      `${where} has a diagram frame whose sandbox is ${JSON.stringify(diagram.sandbox)}, ` +
        `expected "" (no allowance at all)`,
    );
  }
  for (const box of diagram.sizes) {
    if (box.w < 100 || box.h < 100) {
      failures.push(
        `${where} has a diagram frame of ${box.w}x${box.h}px, which is too small to be the drawing`,
      );
    }
  }

  // The checks above are about the frame. These are about the drawing.
  const { drawing, why } = await readDrawing(page);
  if (!drawing) {
    failures.push(`${where}: ${why}`);
    return false;
  }

  if (drawing.width < 100 || drawing.height < 100) {
    failures.push(
      `${where} drew an svg of ${drawing.width}x${drawing.height}px inside the frame, too small ` +
        `to be the diagram`,
    );
  }
  // Five labels and ten shapes: the authored sequence diagrams carry twelve to twenty labels and
  // thirty-odd shapes; the Lesson 6 flowchart carries eleven labels and twenty-seven shapes. The
  // floor is low enough to survive a Mermaid version that rearranges its output, high enough that
  // an empty or half-drawn frame cannot clear it.
  if (drawing.labels.length < 5 || drawing.strokes < 10) {
    failures.push(
      `${where} holds ${drawing.labels.length} label(s) and ${drawing.strokes} shape(s) — too ` +
        `little to be the authored diagram` +
        (drawing.labels[0] ? ` (first label: ${JSON.stringify(drawing.labels[0])})` : ''),
    );
  }

  // Criterion R4: the diagram follows the scheme the page is in. A drawing made for the other one
  // is ink the reader cannot see, and it would satisfy every other check here.
  const ink = rgb(drawing.ink);
  const paper = rgb(drawing.paper);
  if (!ink || !paper) {
    failures.push(
      `${where} cannot be checked for legibility: its diagram labels are ` +
        `${JSON.stringify(drawing.ink)} on ${JSON.stringify(drawing.paper)}`,
    );
  } else if (contrast(ink, paper) < 4.5) {
    failures.push(
      `${where} draws its diagram labels at ${contrast(ink, paper).toFixed(2)}:1 ` +
        `(${drawing.ink} on ${drawing.paper}), below the 4.5:1 WCAG 1.4.3 asks of body text`,
    );
  }

  return true;
}
