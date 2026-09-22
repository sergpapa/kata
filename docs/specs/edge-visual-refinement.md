# Spec — Edge visual refinement (Swiss revival, within the pinned palette)

**Status:** agreed 2026-09-22. Direction set with `devteam:edge`; this document is the dial sheet
that skill requires, and the record that stops dial drift.

The app is visually correct but reads as a template: system font everywhere, no motif, unauthored
hover and load states. This slice gives it a designed voice without touching a single pinned colour.

## The governing constraint

The light palette is the owner's supplied design, value for value, enforced by the fidelity suite
in `apps/web/src/theme.test.ts` ("fidelity to the supplied design"). That contract stands. This
slice therefore changes **typography, ornament, motion and the seams** — the palette dial is
pinned, and every new surface token derives by lightness inside the existing hue families, exactly
decision 4's rule in `docs/specs/visual-design-integration.md`.

## Profile and dials

**Profile: Swiss revival** — "we are rigorous". The product's brand _is_ rigour: every count
derives from the release, every file is hash-checked, every claim is backed. Exposed structure is
not decoration here; it is the product telling the truth about itself. The existing navy + lime is
already the Swiss mono-plus-one-accent shape, so the profile costs nothing against the fidelity
contract.

| Dial               | Setting                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Palette policy     | **Pinned** — navy ground + one lime accent, per the fidelity suite. No new hues, ever.                                                                                |
| Type dominance     | Type-as-hero on page and lesson titles; body prose recedes and stays quiet.                                                                                           |
| Motion temperature | Precise-and-quick: 0.15–0.45 s, quart-out, no lerp, no smoothing. This is a product people _do_ things in.                                                            |
| Ornament           | Exposed structure: mono metadata (IDs, versions, provenance), two-digit index numerals, hairline rules. Full volume on the dashboard, restrained inside lesson prose. |
| Narrative shape    | Flat index. The dashboard is an index; that is the honest shape of the page.                                                                                          |
| Density            | Structured-editorial. Reference spacing values keep governing.                                                                                                        |

**Override recorded:** Swiss classically sits on paper-white with a red accent. Here the ground and
accent are pinned (navy/lime), so the profile is carried by type, structure and motion instead of
by palette. Deliberate, not drift.

## Type system

Two faces join the system stack, both OFL via Fontshare/Google, self-hosted as variable woff2
through `@fontsource-variable` packages (zero runtime, latin subset):

- `--font-display: 'Space Grotesk Variable'` + the existing sans stack as fallback. Carries: `h1`,
  `h2`, `h3`, the brand wordmark, the continue-card title. Nav labels, buttons and body prose stay
  on the workhorse stack — flair budget stays off the surfaces users operate.
- `--font-mono` gains `'JetBrains Mono Variable'` at the front of the existing stack. Carries what
  is already mono (code, `compact-dl`, disclosure markers) plus the metadata register: eyebrows,
  provenance lines, index numerals, breadcrumbs, the code-language label, pills.

Scale: the two hero titles (`h1`, the continue-card `h2`) each through one `clamp()` (no
per-breakpoint px); `h2`/`h3` keep the reference's static sizes, which need no fluidity at 1.35 rem
and below. Line-height 1.05–1.15 on heroes, tracking −0.02 to −0.03 em, `text-wrap: balance`.
Eyebrows/labels: mono, 0.72 rem, +0.12 em (0.14 read too loose against the mono's own width),
uppercase (already uppercase in markup). Body: untouched — 1 rem / 1.65 workspace, 1.85 reader.

## Signature motif

**The lime position marker on a navy ground.** It already exists once: the current-nav item's
3 px inset marker. This slice echoes it — same 3 px, same lime — everywhere "you are here" is the
message:

1. Nav current item (exists, unchanged).
2. Lesson-row hover/focus: the marker slides in at the row's left edge alongside the existing
   background shift.
3. The reading-progress hairline under the top bar on lesson pages: a navy track that fills lime
   as the reader scrolls (see hero moments).
4. Text selection: lime ground, lime-ink text — the measured pair the suite already checks.

Nothing else is lime. The accent stays a spot colour.

## Hero motion moments (Law 1: one per view)

- **Dashboard:** the continue-card's entrance — its children rise 14 px and fade in, 0.45 s
  quart-out, 60 ms stagger, once on load. Every other element on the page is static.
- **Lesson:** the reading-progress hairline, scrubbed 1:1 with scroll via CSS scroll-driven
  animation inside `@supports (animation-timeline: scroll())`. Scrubbed because position _is_ the
  coupling; browsers without support (Firefox) simply never show the bar. No JS.
- Both die under the existing global `prefers-reduced-motion` kill switch in theme.css, which this
  slice pins with a regression test.

## Motion vocabulary (one set, used everywhere)

- `--ease-out: cubic-bezier(0.25, 1, 0.5, 1)` (quart-out) — the only easing.
- `--dur-quick: 0.2s` (hovers, drawer), `--dur-reveal: 0.45s` (the dashboard entrance).
- Stagger window: 60 ms. No other timing values may appear; the drawer's existing 0.2 s `ease`
  moves onto these tokens.

## New tokens (theme.css, tested in theme.test.ts)

- `--font-display`; `--font-mono` re-fronted with JetBrains Mono.
- `--progress-track`: the navy the progress hairline draws on. Light: `#17233c` (the code surface —
  an existing dark value on the white top bar). Dark: `#35446e` (the existing panel edge, because
  `#17233c` on the dark top bar is 1.03:1 — the exact trap the surface suite exists for). Fill is
  `--lime`. New contrast assertions: lime ≥ 3:1 on the track in both schemes; track separates from
  `--card` at ≥ 1.15 in both schemes.
- `--ease-out`, `--dur-quick`, `--dur-reveal`.

## Functional improvements riding along

- Reading position is visible on 12,000 px lessons (the hairline).
- Lesson rows gain a real hover/focus affordance (marker + chevron ink-up + nudge) — the row was
  already the click target; now it says so.
- Section headings gain hairline rules; the release/lesson metadata register becomes visually
  scannable (mono) instead of dissolving into prose.

## Explicitly out of scope

Any pinned colour. Any markup that changes what pages claim (D1–D6, P1–P3 stand). The Markdown
renderer, diagrams, server, content. Back-to-top controls and lesson-heading anchors (candidates
for a later slice). Whole-page transitions — the motion temperature says quick, and route changes
already manage focus deliberately.

## Acceptance

- [x] E1. `theme.test.ts` fidelity and contrast suites pass **unchanged**; new assertions cover
      `--progress-track` (both schemes), the display/mono font tokens, and the reduced-motion kill
      switch.
- [x] E2. Full suite, lint, typecheck, build and the screenshot gate pass — no sideways scroll at
      375/768/1440 in either scheme, diagrams still draw, the zoom and drawer passes hold.
- [x] E3. design-reviewer reviews against **this profile and dial sheet** (not generic taste):
      Law 1 (one hero moment per view), motif consistency, no dial drift, floors intact.
- [x] E4. Reduced motion: with the OS toggle on, no entrance animation and no scrubbed bar — the
      global kill switch covers both, by test and by the reviewer's check.

## Slice log

- 2026-09-22. Spec agreed; direction set with `devteam:edge`.

- 2026-09-22. Built, reviewed and closed. 469 tests pass (18 files); lint, typecheck and
  `format:check` clean; build and the screenshot gate green (19 routes × 3 widths × 2 schemes,
  plus the zoom, open-drawer and pinned-navigation passes, five diagrams read inside their frames).

  **Tests first.** Seven of the eleven new `theme.test.ts` assertions were seen to fail for want
  of the tokens and committed before implementation. **test-guardian PRE — FAIL, three findings,
  all taken:** the duration checks were tautology-adjacent (`toBeDefined()` accepts `500s`) and now
  pin exact values; the font assertions anchored only prefix and suffix, so a stack that dropped
  every system fallback would have passed, and now compare the whole stack; the track token was
  checked for contrast but not hue family, so `#000000` would have passed a "no new hues" contract,
  and is now tied to the existing navy tokens it reuses. A fourth, lower finding renamed an
  over-promising test and added the one-cubic-bezier fence on the token file.

  **devteam:design-reviewer (briefed with this dial sheet) — NEEDS WORK, one defect, fixed.** The
  lesson provenance's `no-wrap` release segment: `white-space: nowrap` beats `overflow-wrap:
anywhere`, so at 375px the release ID ran flush against the reading card's border on all fifteen
  lessons — inside the viewport, which is why the sideways-scroll gate never saw it, and tipped
  over by the wider mono face. The span wraps now. The reviewer verified the rest by pixel: the
  hairline renders in `--lime` on `--progress-track` exactly, exactly two `@keyframes` exist in
  the codebase (Law 1), and lime appears nowhere beyond the declared echoes. Two nits were spec
  drift of this document's own wording (0.12 em tracking, static `h2`/`h3` sizes) and are corrected
  above rather than papered over. One pre-existing floor miss it surfaced was taken with the
  slice: the lime action was 42.4px tall and is now 44px, the same line the sidebar trigger was
  raised to in the previous design slice.

  **Known, unresolved:** one test failed once in the first full-suite run after the font install
  and never again in nine subsequent clean runs; its name was lost to a truncated output pipe. If
  it recurs, capture the full log before anything else — the failure signature decides whether it
  is a product race or harness saturation.
