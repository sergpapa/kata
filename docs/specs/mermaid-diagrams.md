# Spec — Mermaid diagrams (Milestone 1, slice 3)

**Status:** agreed 2026-09-11. Source: `docs/roadmap.md` Milestone 1 bullet 3, `docs/brief.md` §v1
scope 2, `VS_Code_Coder_Handoff_v1.md` §3 "Read and navigate" (line 46) and §4 "Rendering"
(lines 104–106), ADR 0005, ADR 0007.

The three authored sequence diagrams are drawn as pictures, in Mermaid's safe configuration, with
the author's prose still beside them — and a diagram that cannot be drawn says so and shows its
source rather than disappearing.

## What the release actually contains

Measured by rendering every `mermaid` fence in the five lesson files through Mermaid 11.17.2 in
real Chromium, because a contract about diagrams has to cover the diagrams that exist:

| Lesson | Type              | Natural size (viewBox) | Renders? |
| ------ | ----------------- | ---------------------- | -------- |
| 1      | `sequenceDiagram` | 755 × 495              | yes      |
| 2      | `sequenceDiagram` | 969.5 × 704            | **no**   |
| 5      | `sequenceDiagram` | 687 × 785              | yes      |

All three are `sequenceDiagram`. No other diagram type appears in the release. Every one is wider
than a 375px phone at natural size, so the phone treatment below is not a hypothetical.

### Lesson 2's diagram does not parse, and this is an authoring defect

`HTTP_Lesson_02_Student_Edition_v1.md` line 418, inside the fence that starts at line 410:

```
    Server-->>Terminal: Stopped; the file remains
```

Mermaid's sequence grammar treats `;` as a statement separator, exactly as a newline. The message
text therefore ends at `Stopped`, and `the file remains` is read as a new statement with no arrow
in it. Mermaid's own words:

```
Parse error on line 15:
...ed; the file remains    Learner->>Brows
-----------------------^
Expecting '()', 'SOLID_OPEN_ARROW', 'DOTTED_OPEN_ARROW', 'SOLID_ARROW', ... got 'NEWLINE'
```

Replacing `;` with `,` or with an em dash makes it render at 969.5 × 704. **That change is not
made in this slice.** The handoff requires returning a proposed teaching change to the owner with
the exact original and proposed text (§4 "Versioning and ownership"), and the lesson file's
SHA-256 is in `content/learning-release.json` — editing it in place would make the release refuse
to import. The exact original and proposed text is in the slice log below, for the owner to accept
or decline.

This is the one useful thing about the defect: the labelled text fallback this slice owes is not a
branch that only a test exercises. It is what the owner will see on Lesson 2 until the release is
reissued.

## Decisions taken at Stage 0

1. **Mermaid 11.17.2, not 12.0.0.** Mermaid 12 depends on `chevrotain@11.1.2`, which pins
   `lodash-es` to `4.17.23` exactly, and that version carries two high-severity advisories:
   GHSA-r5fr-rjxr-66jc (code injection via `_.template`) and GHSA-f23m-r3pf-42rh (prototype
   pollution via array paths in `_.unset` and `_.omit`). Mermaid 11 has no chevrotain, so
   `dagre-d3-es` resolves `lodash-es` to the patched 4.18.1 and `npm audit` reports zero
   vulnerabilities. Lesson content is untrusted input to this parser (ADR 0005), so the reachability
   of those two advisories is not worth reasoning about when avoiding them costs a major version of
   a library whose 11 line is the mature one.

2. **The rendered SVG reaches the page inside `<iframe srcDoc sandbox="">`, never by injection.**
   Mermaid's only output API is `mermaid.render()` returning an SVG **string**, which collides
   head-on with ADR 0007: "There is no `dangerouslySetInnerHTML` in the codebase, so there is no
   injection sink whose safety depends on a sanitizer allow-list being complete." `srcDoc` is a
   plain React attribute, and `sandbox=""` with no allowances denies scripts, forms, popups,
   top-level navigation, same-origin and plugins. The diagram is a separate, fully-restricted
   document that cannot reach this one whatever Mermaid emits, so ADR 0007 stands unamended rather
   than being carved out.

   Rejected: `dangerouslySetInnerHTML` with Mermaid's strict-mode output — ten lines and the
   diagram would inherit the page's CSS, but it creates precisely the sink ADR 0007 says does not
   exist, and the guarantee would then rest entirely on Mermaid's bundled DOMPurify staying
   correct. Also rejected: parsing the SVG string to hast, sanitizing and converting to React
   elements — no sink and page CSS still inherited, but `hast-util-sanitize` ships no SVG schema,
   so it would need a hand-maintained allow-list covering every tag and attribute Mermaid emits,
   where a gap silently blanks a diagram instead of failing loudly.

3. **A drawn diagram keeps its source behind a disclosure.** The handoff asks for a labelled text
   fallback only when a diagram cannot render, and that is the failure path. But the person reading
   these lessons right now is the owner reviewing the release, and hiding the author's own text
   from the reviewer is the same silent loss ADR 0007 refuses everywhere else. "Show diagram
   source", collapsed, costs one line of vertical space and is the same disclosure pattern the
   facts panel already uses.

4. **A diagram keeps its natural size and scrolls inside its own box.** Scaling Lesson 5's 687px
   diagram into a 343px column puts participant labels at roughly 5px — a shape, not words. Code
   blocks and tables on this page already scroll inside themselves for the same reason (criterion
   W3, slice 2), and the page itself still never scrolls sideways.

5. **`mermaid.parse()` runs before `mermaid.render()`, and without `suppressErrors`.** `render()`
   on source Mermaid cannot read throws **and leaves a `div#d<id>` in `document.body`** holding
   Mermaid's error-bomb graphic. Asking `parse()` first keeps the failure path off the page
   entirely: measured against Mermaid 11.17.2 in Chromium, it adds nothing to the document either
   way.

   `suppressErrors: true` is deliberately **not** passed. With it, `parse()` answers a bare `false`
   and the parser's message is gone — and that message is the whole of criterion F3 and the only
   thing that tells the owner which line of Lesson 2 was refused. Without it, `parse()` rejects
   with an `Error` carrying the message in full, which is what the fallback shows.

   The `render()` call is still wrapped and still removes that div if it appears, because a
   guarantee with one mechanism behind it is one bug from being no guarantee.

   _(Corrected 2026-09-11, during the PRE test audit. The Stage 0 wording specified
   `suppressErrors: true`, which would have thrown away the message F3 requires. The audit caught
   that the spec and the tests disagreed; measuring settled which one was wrong.)_

## Assumptions (not asked, recorded instead)

- **Mermaid is loaded with a dynamic `import()`, on a page that has a diagram.** The package is
  large. A lesson with no `mermaid` fence — Lessons 3 and 4 — must not pay for it.
- **`securityLevel: 'strict'`.** Mermaid's default and its documented safe setting: HTML in labels
  is encoded rather than honoured, and `click` interactions are disabled. The sandboxed iframe is
  the structural guarantee; this is the configuration the handoff names.
- **The diagram theme follows `prefers-color-scheme`,** re-rendering when it changes. The app has
  no manual theme control, and `tools/screenshots.mjs` checks both schemes on every route, so a
  diagram that ignored the scheme would be a black-on-black picture in half the captures.
- **No zoom, pan, export or click handlers.** Nothing in the release asks for them, and `click`
  is disabled by `securityLevel: 'strict'` anyway.
- **No restriction by diagram type.** All three in the release are sequence diagrams, but refusing
  the others would make a future lesson show its own source for no reason. Whatever Mermaid parses,
  renders.
- **The stored Markdown stays canonical.** Unchanged from slice 2: the fence source is read from
  the parsed tree, never rewritten, and `content_lesson.source_text` is untouched.
- **jsdom cannot draw a diagram.** It has no SVG layout, so Mermaid cannot run there at all. The
  component's three states are tested in jsdom with the module mocked; that a real diagram actually
  appears is checked by `tools/screenshots.mjs` in real Chromium — the same split slice 2 used for
  W2 and W3.

## Acceptance criteria

### M — A diagram is drawn

- [x] M1. A `mermaid` fence whose source parses renders as an `iframe`, not as a `pre`. The page
      holds no `pre` containing that diagram's source outside the disclosure of criterion M4.
- [x] M2. The `iframe` carries `sandbox=""` — the empty value, with no allowance of any kind — and
      an accessible name describing what it shows. Its content arrives through `srcDoc`.
- [x] M3. No `dangerouslySetInnerHTML` appears anywhere in `apps/web/src`. Checked by reading the
      source, so the guarantee cannot rot silently.
- [x] M4. The diagram's authored source is reachable from a collapsed disclosure below it, and its
      text is the fence content character for character — the same guarantee criterion W1 gives
      every other fence.
- [x] M5. A lesson with no `mermaid` fence never imports Mermaid. Two halves, because no single
      check covers it: the jsdom suite proves the library is never _used_ on such a lesson, and
      `tools/screenshots.mjs` reads the built bundle to prove Mermaid is in a chunk the entry does
      not pull in. A mocked module is intercepted whether the import is lazy or eager, so jsdom
      alone cannot answer this.

### F — A diagram that cannot be drawn

- [x] F1. Source Mermaid refuses renders as the labelled `mermaid` code block that shipped in
      slice 2 — same markup, same label, same character-for-character text. Nothing is deleted and
      nothing is invented.
- [x] F2. The page says, in its own words, that the diagram could not be drawn and that the source
      is shown instead. The statement is announced to assistive technology, not only coloured.
- [x] F3. The parser's own message is available in full, so a reviewer can see which line was
      refused. It is not paraphrased, truncated or summarized.
- [x] F4. A failed diagram leaves nothing behind in `document.body` — specifically no `div#d<id>`
      and no Mermaid error graphic anywhere on the page.
- [x] F5. Mermaid failing to load at all — a network or bundle failure, not a bad diagram — lands
      in the same fallback rather than an empty box or a crashed page.
- [x] F6. Before rendering finishes, the labelled source block is what is on the page. There is no
      moment at which the diagram's content is absent from the document.

### I — The diagram cannot reach the page

- [x] I1. Diagram source containing a `<script>` tag produces no `script` element in the host
      document, and no global it defines is reachable from the host.
- [x] I2. Diagram source containing an `onclick` or other `on*` attribute produces no event handler
      attribute in the host document.
- [x] I3. Mermaid initializes with `securityLevel: 'strict'`.
- [x] I4. The `srcDoc` document is built from the SVG string and a style block only. It contains no
      `script` element of ours.

### P — The prose stays beside the diagram

- [x] P1. The element immediately following the diagram in the document is the author's next
      paragraph. On all three lessons that is the paragraph beginning "In words:".
- [x] P2. Nothing is inserted between the diagram and the prose that follows it, and the diagram
      does not move from where the author placed it.
- [x] P3. The failure path keeps the same adjacency: the prose still follows the fallback block
      directly.

### L — Layout

- [x] L1. The diagram box scrolls horizontally within itself and is reachable by keyboard, the same
      treatment `pre` and `table` already get.
- [x] L2. On all five lessons at 375, 768 and 1440px, in both colour schemes,
      `document.documentElement.scrollWidth` does not exceed its `clientWidth`. Checked by
      `tools/screenshots.mjs`, which already fails the build on overflow.
- [x] L3. The diagram renders legibly in both colour schemes — the theme follows the page, and the
      diagram's background matches the page's paper rather than staying white in dark mode.
- [x] L4. The iframe's height fits the diagram, taken from the SVG's `viewBox`. The diagram is not
      cut off and does not sit in a box of empty space.

### R — The real release

- [x] R1. Lesson 1's diagram and Lesson 5's diagram are drawn — an `iframe`, not a `pre` — when the
      built app is loaded in a real browser.
- [x] R2. Lesson 2's diagram takes the fallback path, showing its source and naming the parse
      failure. It does not silently vanish and no substitute picture is invented for it.
- [x] R3. Lessons 3 and 4 are unchanged by this slice: no diagram frame, no fallback notice, no
      diagram machinery of any kind on a page whose author drew nothing. Checked in the browser,
      not assumed.
- [x] R4. Every criterion in `docs/specs/markdown-rendering.md` still holds. In particular W1: the
      `http` request block in Lesson 1 keeps its header/body blank line.

## Out of scope for this slice

Diagram zoom, pan and export. Restricting diagram types. Fixing Lesson 2's source — that is the
owner's decision on a proposed teaching change, and it needs a reissued release with a new hash.
Contents list, previous/next and the resume point (slice 4), and the heading `id`s that come with
them. Activity placement (Milestone 2). A full accessibility pass, including the text equivalent of
diagram meaning, which Milestone 3 owns — this slice keeps the author's own prose adjacent, which
is what the handoff asks of it here.

## Done means

`npm run build && npm run screenshots`, then open `/lessons/LS-M020-01` in a browser. The sequence
diagram in §7 is a picture, and the paragraph beginning "In words:" is directly beneath it. Open
`/lessons/LS-M020-02`: that diagram is the labelled source block, with a line saying it could not
be drawn and the parser's reason available. Narrow to 375px: the diagram scrolls inside its box and
the page does not scroll sideways. Switch the OS to dark: the diagram is legible on the page's own
background.

## Slice log

- 2026-09-11. Spec agreed. Stage 0 forks answered by the owner: sandboxed iframe rather than
  injection or a hand-written SVG allow-list; the source kept behind a disclosure after a
  successful render; natural size with the diagram scrolling inside its own box on a phone.

- 2026-09-11. **Proposed teaching change, for the owner to accept or decline.** Lesson 2's diagram
  cannot be drawn as authored. Not changed in this slice.

  File: `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md`, line 418.

  Exact original:

  ```
      Server-->>Terminal: Stopped; the file remains
  ```

  Proposed:

  ```
      Server-->>Terminal: Stopped, the file remains
  ```

  Reason: Mermaid's sequence-diagram grammar reads `;` as a statement separator, so the message
  text ends at `Stopped` and the rest of the line is parsed as a statement with no arrow. Verified:
  with the comma the diagram renders at 969.5 × 704. An em dash works equally well if the author
  prefers the stronger break. Accepting this needs a reissued release, because the lesson's SHA-256
  in `content/learning-release.json` would change.

- 2026-09-11. Built and verified. 249 tests across 12 files, 26 of them in
  `apps/web/src/markdown/MermaidDiagram.test.tsx`, plus `tools/screenshots.mjs` over 6 routes at 3
  widths in both colour schemes — which is where M5, R1, R2, R3, L2 and L4 are actually decided,
  since jsdom has no SVG layout and a mocked module cannot tell a lazy import from an eager one.
  `npm test`, `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run build` and
  `npm run screenshots` all pass.

  Two things this slice settled that the spec had left as reasoning rather than fact. `parse()` is
  called without `suppressErrors`, because the bare `false` it otherwise answers throws away the
  parser's message — and that message is the whole of F3. And the iframe's height comes from the
  SVG's `viewBox`, because an iframe has no intrinsic height and a document with no scripts cannot
  report its own; a drawing without a `viewBox` is treated as undrawable rather than shown in a box
  of guessed size.

- 2026-09-11. Reviewed. test-guardian PRE and POST, `/code-review` at medium effort, and a design
  review against rendered screenshots. 253 tests now: 128 web across the renderer and reader, 115
  server, plus the browser checks.

  **PRE failed the first test draft on four findings**, all fixed before any implementation
  existed. The one that mattered was a disagreement between the spec and the tests about how
  Mermaid reports a refusal. Measuring settled it, and the spec was the one that was wrong:
  `parse(text, { suppressErrors: true })` answers a bare `false`, so had the implementation
  followed the spec as written, Lesson 2 — the only lesson in the release that takes this path —
  would have had no parser message to show. The other three: the sweep-up of Mermaid's leftover
  `div#d<id>` was never exercised, because nothing ever made `render` throw; the theme assertion
  accepted either value, so a hardcoded theme passed it; and M5's "lessons 3 and 4 do not pay for
  Mermaid" was unfalsifiable, since `vi.mock` intercepts a module whether the import is lazy or
  eager. That last one is now checked against the built bundle, which is the only place it can be.

  **`/code-review` found the defect that mattered.** The Mermaid render id came from `useId()`,
  stable for the component's life, while the effect re-runs whenever the source or the colour
  scheme changes. Mermaid's `render` opens by deleting `#<id>`, `#d<id>` and `#i<id>`
  (`mermaid.core.mjs:1256`), so two draws sharing an id destroyed each other's working nodes and
  **both** failed — a flip from light to dark made a perfectly valid diagram report that it could
  not be drawn. `render` cannot be aborted, so every draw now takes its own id. The overlap test
  had staged exactly this scenario and passed, because the mock did not model that deletion; it
  now asserts the ids are distinct. Also found: lessons 3 and 4 each waited 15s for a selector that
  can never appear, three minutes per run; and the `role="status"` notice was inserted together
  with its text, which is generally not announced at all — so F2 was met by the eye and not by the
  ear. The live region is now mounted from the first paint and empty until there is something to
  say.

  **POST passed**, and found that this file's own `realLessons` block claimed more than it proved:
  its assertions ran before the real library had done anything, and because the source block
  renders in all three states, "the source is on the page" was true whether Mermaid succeeded,
  failed, or never ran. It now waits for a stated outcome, so a component stuck in `pending` fails
  it.

  **The design review said ship, with four nits, all fixed.** The scroll cue was the real one: a
  code block paints its shadow gradients as a background, which works because its content is text,
  but an iframe is opaque and covers anything behind it — so at 375px the diagram was cut off at a
  plain border with nothing to suggest it continued. The shadows now sit on a wrapper above the
  frame, and only on the side that still has content out of view, so a diagram that fits shows no
  cue at all. The frame was also a silent tab stop with no focus ring and a name duplicating its
  own region's, and is now out of the tab order; the two disclosure summaries were 27px tall
  against the 44px floor this page sets elsewhere; and the parser's message is now attributed, so
  it does not read as a second source block.
