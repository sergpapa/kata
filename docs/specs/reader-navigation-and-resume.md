# Reader navigation and resume — Milestone 1, slice 4

**Status:** criteria approved 2026-09-22. Sources: `VS_Code_Coder_Handoff_v1.md` §"Read and
navigate" ("a contents list … resume their place, return to an earlier explanation, and read
ahead") and §6 ("Acknowledged work and reading position survive in the supported mode");
`Application_Requirements_and_UX_Specification_v1.md` UX learner home ("The resume card identifies
where the learner stopped"); `docs/brief.md` v1 scope items 2 and 3; the deferrals this slice
redeems — heading `id`s from `docs/specs/markdown-rendering.md` (declined finding: "Slice 4 needs
them for the contents list and will add `rehype-slug` there, where the ids have a consumer") and
the sidebar's bare lower half from `docs/specs/visual-design-integration.md`.

Three surfaces, one slice: a contents list of the open lesson's sections, previous/next between
lessons in manifest order, and a resume point the dashboard's primary card returns the learner to.

## Decisions (asked 2026-09-22, one batch)

1. **The resume point is a server-side record, not browser storage.** A `resume_point` row in
   SQLite behind the repository boundary (ADR 0002). The handoff's own acceptance check demands
   the reading position survive refresh **and restart** in the supported mode; a server row is
   provable in the acceptance run where `localStorage` is not, it survives cleared site data, and
   ADR 0004's context already records why browser storage is distrusted here. Recorded as ADR 0010.
2. **Lesson-level granularity.** The record is "the lesson last opened", nothing finer. A scroll
   offset would claim "read to here", which the app cannot know; the contents list makes returning
   to a section inside the lesson one click. Within-lesson position is out of scope.
3. **A resume card, not a redirect.** With a resume point set, the dashboard's primary card offers
   **Continue** naming the last-opened lesson. Opening `/` never redirects: the release's own
   status caveat and the lesson list stay visible, and the back button keeps meaning what it says.

## Decisions (not asked — recorded with reasons)

- **The contents list is the within-lesson section outline, in the sidebar.** The markdown spec
  already pinned heading anchors as the contents list's mechanism, and the visual-design spec
  reserved the sidebar's lower half for this column ("Milestone 1 slice 4 puts the contents list
  in the same column"). On a lesson page the sidebar gains an **IN THIS LESSON** block listing the
  lesson's section headings as anchors; on every other page the lower half stays as it is. At
  375px the sidebar is the drawer, so the contents travel with it.
- **Sections mean the headings the body renders at `h2`.** That is every tree-level-1 and
  tree-level-2 heading in the body Markdown — a body-carried H1 is demoted to `h2` at render
  (markdown-rendering R1), so it is a section too. `h3` and below stay out of the list; fifteen
  lessons of sub-subsections would make the sidebar a second document.
- **Heading `id`s are namespaced.** The sanitizer's clobber prefix (`user-content-`) stays on, so
  an authored heading named "main" can never collide with the app's own element ids or DOM
  globals. Contents anchors carry the same prefix; agreement is tested, not assumed.
- **The resume write is silent.** No unsaved/saving/saved state, no toast: nothing on screen
  claims the pointer was stored, so nothing can claim it falsely. A failed write leaves the
  previous record standing and the reading experience unchanged. ADR 0004's four-state contract
  is for learner work — authored text that could be lost — and a pointer is not that. Last write
  wins between two tabs for the same reason: recorded in ADR 0010 as a deliberate scope line, not
  an oversight.
- **A resume record naming a lesson the imported release does not carry answers as `none`.** The
  row itself is not deleted or rewritten — no rewritten history — but the card falls back to
  **Start lesson** rather than offering a link the release cannot honour. Releases so far only
  ever added lessons, so this is a guard, not an expected path.
- **Previous/next lives at the end of the reading card.** The reader who finishes a lesson is at
  the bottom; the way back up is the contents list and the existing "All lessons" link. An absent
  neighbour means an absent control (no disabled dead button — visual-design decision 5).
- **Neighbours ship in the lesson answer.** The server already derives the body on the way out and
  owns manifest order in `display_order`; it now also answers `previous` and `next` (key, two-digit
  order, authored title) beside the lesson. One source of order, no second request, and the lesson
  page's existing contract gains fields rather than changing shape.

## Assumptions

- The `resume_point` table is single-row (`id = 1` checked), holding `candidate_lesson_id` and
  `recorded_at`. Work keys `(candidate_lesson_id, content_version)` are for learner work; a
  pointer follows the lesson across an authorized correction, so it stores no content version.
- Schema version becomes `3`. Two existing tests change in the red commit, both declared here and
  nowhere else: the health check's pinned `'2'` in `apps/server/src/app.test.ts` becomes `'3'`
  (spec-driven, same as earlier config-flip slices), and the dashboard records-card test
  (`says plainly that nothing is recorded yet`) is re-aimed at the new truthful wording, because
  the sentence it pins — nothing is recorded — stops being true the moment this slice lands.
- One further re-aim surfaced at green, declared here: `apps/web/src/App.test.tsx`'s
  app-not-answering test asserted `/api/release` was the _first_ `fetch` call. The dashboard now
  also asks `/api/resume-point`, and React runs the child's effect first, so the assertion became
  "the release was asked for" by URL rather than by call position — the claim is unchanged, the
  incidental ordering pin is gone. Flagged for test-guardian POST, which runs because test files
  moved after PRE.
- A PUT that lands after the reader has already moved on may record the earlier lesson. Accepted:
  the pointer is a convenience, the window is milliseconds, and the next lesson open corrects it.
- Anchor jumps use the browser's own fragment navigation — no smooth scrolling, no scroll-spy.
  `scroll-margin-top` keeps a jumped-to heading clear of the sticky top bar.
- The dashboard's records card rewords to stay honest both ways: the lesson last opened **is**
  recorded now; notes, predictions and their acknowledged saving still arrive in Milestone 2.

## Acceptance criteria

### N — Contents list and heading anchors

- [x] N1. Every heading in a rendered lesson body carries an `id` derived from its text; two
      headings with the same text get distinct ids. The ids survive the full render pipeline
      (inert guards, then sanitizer).
- [x] N2. Every generated id starts with `user-content-`, and the contents anchors point at
      exactly that spelling.
- [x] N3. On a lesson page, the sidebar shows the lesson's sections — every heading the body
      renders as `h2`, in authored order, each entry an anchor `#user-content-<slug>` carrying the
      heading's own text.
- [x] N4. For all fifteen real lessons: every contents entry's target id exists exactly once in
      that lesson's rendered body, and every body `h2` has exactly one contents entry.
- [x] N5. On the dashboard, the standby pages and the not-found page, no contents block renders.
      Navigating from one lesson to another replaces the outline; navigating away removes it.
- [x] N6. A followed contents link leaves its heading visible below the sticky top bar, not
      underneath it (`scroll-margin-top` at least the top bar's height).
- [x] N7. At 375px the contents list is inside the drawer; following an entry closes the drawer,
      and the drawer's focus trap cycles through the new anchors — the trap half pinned in vitest
      (PRE finding: focus order is a DOM fact, not a layout fact), the in-drawer layout half in the
      screenshot gate.

### P — Previous and next

- [x] P1. A lesson page ends with a `nav` landmark offering the previous and next lessons in
      manifest order, each a real link carrying the neighbour's two-digit number and authored
      title.
- [x] P2. The first lesson has no previous control and the last has no next control — absent, not
      disabled.
- [x] P3. Following next or previous opens the neighbour at its top, with focus moved to the new
      page (the existing navigate/focus behavior, now exercised from a lesson).
- [x] P4. For the real fifteen-lesson release: lesson N's next names lesson N+1's authored title
      for every N in 1–14, and the same backwards — a data fact, so it is pinned in vitest against
      the real release directory (moved off the screenshot gate on test-guardian's PRE finding).
- [x] P5. Neighbours come from the stored `display_order`, not from array position or key shape:
      the server answers them ordered even when asked about the middle of the release, and the
      client renders exactly what the server names.

### R — Resume point

- [x] R1. Opening a lesson that answers `state: 'lesson'` records it as the resume point. A 404,
      a refused release, or an unavailable app records nothing.
- [x] R2. The record survives a client refresh and a server restart: a new app instance over the
      same database answers with the same resume point.
- [x] R3. With no resume point, the dashboard's primary card is byte-for-byte today's: **FIRST IN
      THE RELEASE**, the first lesson, **Start lesson** (visual-design D1 stands).
- [x] R4. With a resume point, the primary card names the last-opened lesson by two-digit number
      and authored title, its action reads **Continue lesson** and links there, and its kicker
      says the lesson was last _opened_ — no page element ever claims read, studied or completed,
      and no progress bar or ratio appears (D3 stands).
- [x] R5. A resume record naming a lesson absent from the imported release: the API answers
      `state: 'none'`, the card shows **Start lesson**, and the stored row is untouched.
- [x] R6. No element anywhere claims the resume point was saved, is saving, or failed to save; a
      rejected or failed PUT leaves the page as it was.
- [x] R7. The records card's wording matches what is now true: the last-opened lesson is kept;
      notes and predictions are not, and arrive in Milestone 2.

### A — API and schema

- [x] A1. `GET /api/resume-point` answers `{ state: 'none' }` or
      `{ state: 'set', candidateLessonId, recordedAt }`, and the failed-release state in the
      server's own words, like the other endpoints.
- [x] A2. `PUT /api/resume-point` with a lesson in the imported release stores the pointer and
      acknowledges. An ID not in the release refuses with 404 naming the ID and stores nothing; a
      body without a string `candidateLessonId` refuses with 400; a refused release answers its
      failed state.
- [x] A3. Migration 3 creates `resume_point` forward-only; `/api/health` answers schema version
      `'3'`; re-running migrations on an existing database is a no-op.
- [x] A4. Only the repository module speaks SQL about the resume point (ADR 0002 boundary).

### G — Nothing regresses

- [x] G1. Every markdown-rendering criterion still holds — single `h1`, W1's
      character-for-character fences — with ids now on headings.
- [x] G2. Every visual-design shell criterion still holds, S5's drawer focus behavior now with
      contents anchors present.
- [x] G3. The screenshot gate stays green: no sideways scroll at 375/768/1440 in either scheme on
      a lesson page with the contents list present, drawer open included; pinned navigation
      3,000px down still holds; the five diagrams still draw.
- [x] G4. The sidebar with a fifteen-entry outline does not push the release block or
      destinations off screen at 768px — the sidebar scrolls within itself if it must.

## Out of scope

Within-lesson scroll or heading-level resume. Any save-state UI for the pointer (ADR 0004's four
states belong to Milestone 2's learner work). Activity placement (Milestone 2). Lab downloads
(Milestone 3). Search, module grouping, planned-curriculum surfaces. `h3`+ entries in the contents
list. A sidebar resume card (the dashboard card is the resume surface; the sidebar's lower half on
non-lesson pages stays bare until Milestone 2 has something true to put there).

## Done means

`npm run build`, start the app, open `/`. The card says Start lesson. Open Lesson 7 — the sidebar
lists its sections; clicking one lands its heading clear of the top bar; the foot of the lesson
offers 06 back and 08 ahead by their authored titles. Go home: the card now says Continue lesson,
naming Lesson 07. Refresh — still there. Stop the server, start it again — still there. Narrow to
375px: the drawer carries the same contents, nothing scrolls sideways, and nothing anywhere claims
anything has been read.

## Slice record

Built 2026-09-22. Red commit `7838d0e` (68 tests red across 7 files, each for a missing route,
table, anchor or wording — plus the declared re-aims); green at 542 passing across 21 files.
`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format:check` and
`npm run screenshots` all pass locally.

**test-guardian PRE:** pass, four findings, all taken before the red commit was pinned — N5's
standby/not-found leak coverage, R1's unavailable-app negative, the drawer focus trap cycled over
the contents anchors in vitest (focus order is a DOM fact, not a layout fact), and P4 moved off
the screenshot gate into a vitest integration test over the real release, where an off-by-one or
title drift fails an assertion instead of hoping a screenshot reader notices.

**test-guardian POST:** pass. One substantive test change between red and green — the declared
App.test.tsx re-aim — verified as claim-preserving (`/api/release` still must be fetched; only
the incidental call-position pin went); everything else prettier rewraps or byte-identical, and
the resume endpoints' refusal paths checked against the database directly, not the HTTP echo.

**/code-review (medium):** one confirmed finding, fixed test-first — the dashboard drew a Start
card for lesson 1 while `/api/resume-point` was still in flight, and following that transient
link would record lesson 1 over the reader's real place. The page now holds its reading status
until both answers settle; `renders no card at all until the resume answer arrives` pins it.

**Design review:** ship with nits. Two taken: the contents label now matches the sidebar's
all-caps eyebrow convention, and `.sidebar-contents .sidebar-group-label` drops the stock side
margin that had stacked on the block's own padding and pushed the label right of its list. One
declined, with the reviewer's own reasoning: no chevrons on the neighbour links — the restraint
dial keeps ornament out of lesson-adjacent surfaces, the words Previous/Next plus the directional
lime hover marker already carry the wayfinding, and the reviewer measured every target, focus
ring and contrast pair sound without them.

**Hygiene note:** the new styles pushed lesson.css and shell.css past the ~350-line split point,
so the slice's blocks moved whole into `apps/web/src/navigation.css` — one responsibility, no
value changed, gate re-run green after the move.

**End to end:** the gate's new checks passed on real Chromium — contents anchors resolving
exactly once on all fifteen lessons at three widths in both schemes, a followed anchor landing
clear of the top bar, the drawer carrying the contents at 375px, the first contents entry on
screen at 768 and 1440 three thousand pixels down a lesson, and the resume round trip (open
lesson 7, return home, the card offers Continue lesson to `LS-M020-07`). A cold restart of the
built server over the same database file still answered the recorded lesson. The gate wipes its
own data directory per run now, because an app that records state would otherwise hand the second
run different captures than the first.
