# Spec — Engineering Practice visual design integration (Milestone 1, unscheduled slice)

**Status:** agreed 2026-09-11. Source: `engineering-practice-ui-design-v1/` — `DESIGN_SPECIFICATION.md`,
`INTEGRATION_GUIDE.md`, `COMPONENT_MAP.md`, and the implemented original in
`reference-source/app/globals.css` and `reference-source/components/workspace.tsx`.

The owner opens the app and sees the product they were shown: a navy course sidebar beside a pale
workspace, a white top bar, a prominent card saying where to begin, and the five real lessons in a
single bordered list. Nothing on that page claims progress the app does not record.

## Why this slice exists, out of roadmap order

The design package arrived mid-Milestone 1 and supersedes nothing in it. It is taken now rather
than after slice 4 because slice 4 (contents list, previous/next, resume) adds surfaces to the
lesson page, and adding them to the plain layout means designing them twice.

## What the package actually specifies

Read from the implemented source rather than from the screenshot, per the package's own
instruction. `reference-source/app/globals.css` is 335 lines of which roughly 300 are plain CSS —
the rest is three `@import`s, a Tailwind `@theme inline` block, and selectors keyed to `data-slot`
attributes emitted by shadcn primitives.

| What the reference carries                       | What this app has          | Consequence for this slice                     |
| ------------------------------------------------ | -------------------------- | ---------------------------------------------- |
| Tailwind 4, shadcn/ui, Radix, Lucide             | Plain CSS, no UI library   | Port token values and selectors by hand        |
| `data-slot=` / `data-active=` selectors          | No such attributes         | Rewrite those selectors against our own markup |
| 8 lessons, `lib/lessons.json`                    | 5 lessons from the release | Every count derives from the release           |
| `localStorage` demo state, `transition()`        | No progress store yet      | No progress is displayed at all                |
| Persona switcher, scenario menu, prototype strip | —                          | Out of scope by the package's own instruction  |

## Decisions taken at Stage 0

1. **Ported to plain CSS. No Tailwind, no Radix, no shadcn, no Lucide.** The package says in
   INTEGRATION_GUIDE §3 that its manifests describe the source environment and are "not a
   requirement to downgrade or replace the target app's stack". Adding three build-time
   dependencies and a component library to reproduce a stylesheet that is already 90% plain CSS
   buys nothing and contradicts the brief's preference for boring technology. The token values,
   selectors, and responsive rules are ported deliberately, which is the path INTEGRATION_GUIDE §3
   names for a target with a different styling setup.
2. **Icons are hand-drawn inline SVG in Lucide's visual idiom** — 24px box, 1.75 stroke, round
   caps — not copies of Lucide's paths and not the `lucide-react` package. Six icons are needed.
   A dependency for six icons is not worth its supply chain, and copying path data we cannot see
   (Lucide is not vendored in the package) would be guessing.
3. **The product name stays EduCode.** DESIGN_SPECIFICATION §1 leaves naming to the owner and
   forbids inventing a brand; EduCode is the app's existing name, set in the reference's two-line
   wordmark treatment with the lime icon tile. _Owner decision, asked and answered._
4. **Dark mode is kept, and its palette is derived here rather than supplied.** The package ships
   one light palette and `color-scheme: light`. The owner chose to keep the dark variant the app
   already had. The derivation rule is stated once and followed: hue families are held fixed
   (navy, indigo, lime), only lightness is re-mapped, and the sidebar, the current-lesson card and
   the lime action keep their exact reference values in both schemes — in dark they are already
   dark surfaces, so re-tinting them would be inventing colour rather than adapting it. Every
   derived pair is checked numerically; see criterion C1. _Owner decision, asked and answered._
   This is a documented deviation from DESIGN_SPECIFICATION §1 and §2, taken knowingly.
5. **Practice, Reviews and Progress become real addresses with honest pages.** Each states what it
   will hold and which milestone builds it. INTEGRATION_GUIDE §5 requires a destination to have
   "a working route or a clear, useful empty/unavailable state" and calls a recreated label over a
   dead control insufficient. _Owner decision, asked and answered._
6. **No progress is displayed, because none is recorded.** The app has no store for what has been
   read — that is Milestone 2. The reference's `2 / 8 lessons studied`, its progress bars and its
   evidence counters therefore have no truthful binding here, and INTEGRATION_GUIDE §4 forbids
   supplying one ("Display only supported real counts and meaningful empty states"). The
   current-lesson card offers **Start** on the first lesson in manifest order; the neighbouring
   card says plainly that nothing is recorded yet and what will record it.

## Assumptions (not asked, recorded instead)

- **The lesson page stays one column.** The reference's `.reader-grid` puts a prediction card and
  notes in an aside; both are Milestone 2. An aside with nothing in it is a worse layout than no
  aside, so the reading card is full width and the grid arrives with its contents.
- **No "Get help" action in the top bar.** The reference's opens a panel of authored hints. There
  are none, and a button that opens an empty panel is the dead control decision 5 refuses.
- **No progress bar in the sidebar's current-unit block.** It shows the unit name and the
  release's own lesson count. A bar at zero asserts nothing has been read, which the app cannot
  know.
- **`.prose p { white-space: pre-line }` is not ported.** It exists because the reference's
  prototype renderer does not parse soft line breaks; ours does. Porting it would turn every
  source-wrapped line in a lesson into a visible line break.
- **The concept strip (`01 Observe / 02 Explain / 03 Investigate`) is not ported.** Its wording
  describes the old prototype's three teaching tabs. DESIGN_SPECIFICATION §5 permits keeping the
  pattern only if the wording fits the current activity; nothing in this release names three such
  steps.
- **The sidebar's lower half stays bare at 768px and above.** Raised by the design review, and
  accepted rather than fixed: below the four destinations and the current-unit block the reference
  puts a resume card and a progress readout, and this app records neither. Everything truthful that
  could go there is already in the block above it. The space fills in Milestone 2, when there is a
  last-read lesson to resume, and Milestone 1 slice 4 puts the contents list in the same column.
- **`prefers-reduced-motion` keeps the existing hard stop** (`animation: none`) rather than the
  reference's `0.01ms`. Same intent, already in the file, and the stricter one is not worse.

## Acceptance criteria

### S — The shell

- [x] S1. Every address renders inside one shell: a `nav` landmark for the sidebar, a top bar, and
      a `main` landmark. The skip link still moves focus to `main`.
- [x] S2. The sidebar lists exactly four destinations in order — Learn, Practice, Reviews,
      Progress — each an anchor with a real `href`.
- [x] S3. The destination matching the current address is marked `aria-current="page"`, and it is
      the only one. On a lesson address, Learn is the marked destination.
- [x] S4. The top bar shows the trail for the current page, ending in the page's own name.
- [x] S5. Below 768px the sidebar is a drawer: a trigger button in the top bar carries
      `aria-expanded`, opens and closes it, and `Escape` closes it. Opening moves focus into the
      drawer; closing returns focus to the trigger.
- [x] S6. The brand is the word EduCode with the release scope beneath it, inside the shell's
      sidebar — not a separate page header.

### D — The dashboard

- [x] D1. The current-lesson card names the first lesson in manifest order, by its authored title,
      and its action reads **Start lesson** and links to that lesson's address.
- [x] D2. Every count on the page derives from the release. With a three-lesson release the page
      says three, everywhere it says anything.
- [x] D3. No element claims a lesson has been read, studied or completed, and no progress bar or
      ratio appears. Asserted against the real five-lesson fixture by absence of the words.
- [x] D4. The five lessons render as rows in one container, in manifest order, each row an anchor
      to its lesson carrying the authored title.
- [x] D5. A lesson row carries no release ID, no lab kit ID and no SHA. Those facts remain
      available on the page inside a closed `details`.
- [x] D6. The release's own `status` caveat stays visible on the dashboard, unhidden.

### P — The three honest pages

- [x] P1. `/practice`, `/reviews` and `/progress` each render a page with an `h1`, a description of
      what the destination will hold, and a named milestone.
- [x] P2. None of them shows a count, a record, a sample or a control that does nothing.
- [x] P3. An unknown address still renders the not-found page, inside the shell.

### C — Colour

- [x] C1. Every foreground/background pair the stylesheet actually uses meets WCAG AA — 4.5:1 for
      body text, 3:1 for large text and for the focus ring against both surfaces it can sit on —
      in **both** schemes. Checked by computing the ratios from the token values, not by eye.
- [x] C2. The light scheme's tokens equal the package's published values exactly, for all 18 of the
      19 roles DESIGN_SPECIFICATION §2 names. The exception is `--input`, and it is an exception for
      a reason worth recording: the published `#c8d1e4` on `#ffffff` measures **1.53:1**, where WCAG
      1.4.11 asks 3:1 of a control's visual boundary. This slice has no text input, so the token is
      not ported rather than being ported broken. Milestone 2 adds the first textarea and will need
      a darker border: `#767f93` measures 4.02:1 on white and 3.75:1 on the canvas, and `#5c6b94`
      measures 3.07:1 on the dark card.
- [x] C3. The sidebar, the current-lesson card, and the lime action carry the same values in both
      schemes, per decision 4.

### R — Nothing already built regresses

- [x] R1. Every criterion in `docs/specs/markdown-rendering.md` still holds, in particular W1
      (fence text character for character) and the single-`h1` rule.
- [x] R2. Every criterion in `docs/specs/mermaid-diagrams.md` still holds: diagrams still draw,
      the Lesson 2 fallback still names its reason, and Mermaid stays out of the entry chunk.
- [x] R3. The release-refused and app-unavailable states still render, inside the shell, with the
      server's own wording.
- [x] R4. No page scrolls sideways at 375, 768 or 1440px in either scheme — the existing check,
      now also covering the drawer and the three new addresses.
- [x] R5. At 200% zoom on a 1440px viewport, lesson prose and the dashboard's primary action are
      still on screen and the page does not scroll sideways. Checked as a 720 CSS-pixel viewport,
      which is what 1440 at 200% is: doubling the zoom halves the CSS pixels the layout sees.
- [x] R6. The drawer is checked open, not only closed. At 375px, with the sidebar opened from the
      top bar, the page still does not scroll sideways and the destinations are on screen.
- [x] R7. Navigation does not scroll away with the page. Three thousand pixels down a lesson, the
      sidebar's destinations and the top bar are still on screen at 1440px, and at 375px so is the
      trigger that opens the drawer — which is the only way to reach navigation at that width.

## Out of scope for this slice

Notes, predictions and any saving (Milestone 2). Lab downloads (Milestone 3). Contents list,
previous/next and resume (Milestone 1 slice 4 — the next slice, which lands inside this shell).
The reference's review, evidence, submission, account and staff surfaces. Search. Any change to the
server, the release contract, or the Markdown renderer's output.

## Done means

`npm run build && npm run screenshots`, then open `/` in a browser. The sidebar is navy, the
workspace is pale, the current-lesson card is indigo with a lime Start button naming Lesson 1, and
the five real titles are listed beneath it. Narrow to 375px: the sidebar becomes a drawer reachable
from the top bar, and nothing scrolls sideways. Open Lesson 1: the prose sits in a white reading
card, the diagram still draws, and the HTTP sample still preserves its spaces. Switch the OS to
dark: the same design, legible, with the sidebar and the lime button unchanged.

## Slice log

- 2026-09-11. Spec agreed. Stage 0 forks answered by the owner: EduCode keeps its name; dark mode
  is kept and its palette derived here; Practice, Reviews and Progress become real addresses with
  honest pages rather than being omitted.

- 2026-09-15. Built, reviewed and closed. 364 tests pass (16 files); lint, typecheck and
  `format:check` are clean; `npm run build` and `npm run screenshots` both pass.

  **`/code-review` — 3 confirmed defects, all fixed, each with a regression test seen to fail
  without its fix.** (1) The closed drawer was translated off-canvas but still in the tab order,
  giving a phone reader four invisible tab stops; `visibility: hidden` with a transition delay on
  the way out fixes it, and Tab is now trapped inside the open drawer. (2) Closing the drawer by
  following a link restored focus to the trigger on top of the new page's own `main.focus()`,
  dropping the reader back on the navigation they had just left; focus returns to the trigger only
  on a dismissal now. (3) The focus effect's dependencies could not tell `/practice` from
  `/reviews`, so moving between two standby sections swapped the whole page and left focus where it
  was; a single `routeKey` covering every address replaces them. Two nits also fixed.

  **test-guardian (POST) — PASS.** No test was weakened and no claim was lost. Three pre-existing
  App.test.tsx assertions and two new ones used an unscoped `getAllByRole('listitem')`, which the
  shell's own sidebar and breadcrumb lists now also match; the assertions were scoped to
  `within(screen.getByRole('main'))` rather than the semantic lists being removed from the markup.
  The auditor also corrected a comment of mine: `details` **does** map to `group` in aria-query —
  the reason `getByRole('group', { name })` cannot match it is that `group` takes its name from the
  author only, so a `summary` can never supply one.

  One test was found to be wrong and was **corrected rather than satisfied**: the `/reviews` page
  test asserted Milestone 2, and the roadmap puts Export in Milestone 3. The page was right, the
  test was wrong, and the fix went into the test with the reason stated in it.

  **devteam:design-reviewer — SHIP WITH NITS.** Finding 1, a real defect, fixed: in the dark scheme
  `--card` (#172038) against `--code-bg` (#17233c) measures 1.03:1 and against `--quote-bg` 1.04:1,
  so a code panel and a blockquote inside a reading card were the same surface. A new `--panel-edge`
  token (#35446e dark, 1.69:1), a border on `.code-block`, and a darker `--quote-bg` (#101a2e) with
  a brighter `--quote-rule` (#5568a0, 2.98:1) separate them; `theme.test.ts` now checks surface
  separation numerically so nothing checks it by eye again. Nits 4 and 5 fixed: the reference's
  `+`/`−` disclosure marker, and `.sidebar-trigger` raised to 44px. Finding 3 is recorded above as
  accepted, not fixed.

  Finding 2 was the important one, and it was worse than reported. The `diagram: 'drawn'` check in
  `tools/screenshots.mjs` read only what React had set — frame count, `sandbox`, bounding box — all
  true before Mermaid draws anything. It was not merely unfalsifiable: it was **passing on blank
  frames**. `lesson-05-desktop-1440-light.png` held an 875px white rectangle and
  `lesson-01-mobile-375-dark.png` a 546px `#172038` one, and the gate reported success on both. The
  frame is `loading="lazy"` and sits thousands of pixels down a lesson, and a full-page screenshot
  captures beyond the viewport without scrolling, so Chromium never painted it. The check now opens
  the frame's own document through `contentFrame()` and asserts the drawing is there — an `svg` of
  real size, at least 5 labels and 10 shapes, and message text at 4.5:1 or better against the
  frame's background — and an element-level capture of `.diagram-scroll` is written beside each page
  capture. Each of the four new checks was made to fail on purpose and its message read. Two things
  that probe found: the scroll is load-bearing for the picture but not for the check (delete it and
  the checks stay green while the captures go blank), and a `drawn` route that lost its diagram made
  the element capture throw after 30s and take every other failure in the run with it — now guarded.

  Owner change after the slice landed: the sidebar and the top bar are pinned to the viewport
  rather than to the top of the document. Both were ordinary flow elements, so on a lesson that is
  12,000px tall at 1440px and 24,000px at 375px, navigation was reachable only by scrolling back to
  the top — and at 375px the trigger that opens the drawer went with it, leaving no way to reach
  navigation at all. `position: sticky` rather than `fixed`, so the 15.5rem column still occupies
  its place in the flex row and the workspace needs no offset to match it. Criterion R7 was written
  first and seen to fail by 2,860px, 3,000px and 2,987px on the three pinned elements.

  `apps/web/src/lesson.css` reached 392 lines and was split: the diagram's frame, scroll box and
  refusal panel moved to `apps/web/src/diagram.css` (144 lines), leaving lesson.css at 252. One
  stray rule that styled the dashboard's lesson list moved to `dashboard.css` where the rest of that
  list lives.
