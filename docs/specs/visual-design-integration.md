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

| What the reference carries              | What this app has         | Consequence for this slice                     |
| --------------------------------------- | ------------------------- | ---------------------------------------------- |
| Tailwind 4, shadcn/ui, Radix, Lucide     | Plain CSS, no UI library  | Port token values and selectors by hand        |
| `data-slot=` / `data-active=` selectors  | No such attributes        | Rewrite those selectors against our own markup |
| 8 lessons, `lib/lessons.json`            | 5 lessons from the release | Every count derives from the release           |
| `localStorage` demo state, `transition()` | No progress store yet     | No progress is displayed at all                |
| Persona switcher, scenario menu, prototype strip | —                 | Out of scope by the package's own instruction   |

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
- **`prefers-reduced-motion` keeps the existing hard stop** (`animation: none`) rather than the
  reference's `0.01ms`. Same intent, already in the file, and the stricter one is not worse.

## Acceptance criteria

### S — The shell

- [ ] S1. Every address renders inside one shell: a `nav` landmark for the sidebar, a top bar, and
      a `main` landmark. The skip link still moves focus to `main`.
- [ ] S2. The sidebar lists exactly four destinations in order — Learn, Practice, Reviews,
      Progress — each an anchor with a real `href`.
- [ ] S3. The destination matching the current address is marked `aria-current="page"`, and it is
      the only one. On a lesson address, Learn is the marked destination.
- [ ] S4. The top bar shows the trail for the current page, ending in the page's own name.
- [ ] S5. Below 768px the sidebar is a drawer: a trigger button in the top bar carries
      `aria-expanded`, opens and closes it, and `Escape` closes it. Opening moves focus into the
      drawer; closing returns focus to the trigger.
- [ ] S6. The brand is the word EduCode with the release scope beneath it, inside the shell's
      sidebar — not a separate page header.

### D — The dashboard

- [ ] D1. The current-lesson card names the first lesson in manifest order, by its authored title,
      and its action reads **Start lesson** and links to that lesson's address.
- [ ] D2. Every count on the page derives from the release. With a three-lesson release the page
      says three, everywhere it says anything.
- [ ] D3. No element claims a lesson has been read, studied or completed, and no progress bar or
      ratio appears. Asserted against the real five-lesson fixture by absence of the words.
- [ ] D4. The five lessons render as rows in one container, in manifest order, each row an anchor
      to its lesson carrying the authored title.
- [ ] D5. A lesson row carries no release ID, no lab kit ID and no SHA. Those facts remain
      available on the page inside a closed `details`.
- [ ] D6. The release's own `status` caveat stays visible on the dashboard, unhidden.

### P — The three honest pages

- [ ] P1. `/practice`, `/reviews` and `/progress` each render a page with an `h1`, a description of
      what the destination will hold, and a named milestone.
- [ ] P2. None of them shows a count, a record, a sample or a control that does nothing.
- [ ] P3. An unknown address still renders the not-found page, inside the shell.

### C — Colour

- [ ] C1. Every foreground/background pair the stylesheet actually uses meets WCAG AA — 4.5:1 for
      body text, 3:1 for large text and for the focus ring against both surfaces it can sit on —
      in **both** schemes. Checked by computing the ratios from the token values, not by eye.
- [ ] C2. The light scheme's tokens equal the package's published values exactly, for every role
      DESIGN_SPECIFICATION §2 names.
- [ ] C3. The sidebar, the current-lesson card, and the lime action carry the same values in both
      schemes, per decision 4.

### R — Nothing already built regresses

- [ ] R1. Every criterion in `docs/specs/markdown-rendering.md` still holds, in particular W1
      (fence text character for character) and the single-`h1` rule.
- [ ] R2. Every criterion in `docs/specs/mermaid-diagrams.md` still holds: diagrams still draw,
      the Lesson 2 fallback still names its reason, and Mermaid stays out of the entry chunk.
- [ ] R3. The release-refused and app-unavailable states still render, inside the shell, with the
      server's own wording.
- [ ] R4. No page scrolls sideways at 375, 768 or 1440px in either scheme — the existing check,
      now also covering the drawer and the three new addresses.
- [ ] R5. At 200% zoom on a 1440px viewport, lesson prose and the dashboard's primary action are
      still on screen and the page does not scroll sideways.

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
