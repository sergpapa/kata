# Content release update — the first thirteen lessons

Milestone 1, slice 5. Two packages arrived on 2026-09-21: `HTTP_Curriculum_Depth_and_Lessons_06_08_v1`
(lessons 6–8 plus revised curriculum specifications) and `HTTP_Caching_Lessons_09_13_v1` (lessons
9–13). Each release is cumulative, and `FSSE-HTTP-FIRST-THIRTEEN` supersedes the chain:
`FSSE-HTTP-FIRST-FIVE` → `FSSE-HTTP-FIRST-EIGHT` → `FSSE-HTTP-FIRST-THIRTEEN`. The app imports the
thirteen-release; the 6–8 package stays in the repo for its specifications and the Lesson-08 owner
review form, byte-for-byte, never pointed at by config.

Both coder handoffs (`VS_Code_Coder_Handoff_Lessons_06_08_v1.md`,
`VS_Code_Coder_Handoff_Lessons_09_13_v1.md`) ask the same thing: import the release into the
existing app, keep the Engineering Practice design, keep lessons 1–5(–8) IDs, versions, bytes and
learner state, add nothing that pretends unwritten lessons exist.

## What was verified before this slice was scoped

Checked 2026-09-21 against the received bytes, before any code moved:

- Lessons 1–5: `lesson_id`, `version`, `sha256`, `path` and `order` identical across all three
  manifests. Lessons 6–8 identical between the two new packages.
- Every `sha256` in both new manifests matches the file on disk; front matter `document_id` and
  `version` match the manifest on all eight new lessons.
- `trial-activities.json` grows 15 → 39 entries and the old 15 IDs survive as a subset.
  `activity_set_id` is `FSSE-HTTP-FIRST-THIRTEEN-ACTIVITIES`.
- Manifest `schema_version` stays `1.0.0`; the two added fields (`supersedes_release`,
  `compatibility`) are fields `readManifest` never reads, so the importer ignores them by design.
- The 6–8 lab kit binds `127.0.0.1:4317` and lessons 6–8 tell the learner to curl it there —
  the port this app has been defaulting to. The first-five package never named a port for the app;
  4317 was this repo's own choice, so the app moves, not the content. The author's kits so far:
  4315 (3–5), 4317 (6–8), 4319 with 4320 as the stated alternate (9–13).

## Acceptance criteria

- [x] C1. **Default import.** With no env overrides the app verifies and imports
      `FSSE-HTTP-FIRST-THIRTEEN@1.0.0-draft` from
      `HTTP_Caching_Lessons_09_13_v1/http-lessons-09-13-release-v1/content`: exactly thirteen
      lessons, `LS-M020-01` … `LS-M020-08` then `LS-M021-01` … `LS-M021-05`, in manifest order
      1–13; Lesson 1 at `2.0.0-draft`, every other lesson at `1.0.0-draft`; the four lab kits
      (`FSSE-HTTP-LAB-02`, `-03-05`, `-06-08`, `-09-13`) with their manifest hashes; the 39-entry
      activity set stored whole.
- [x] C2. **Continuity of the keys learner state will hang off.** For lessons 1–5, the
      (`candidate_lesson_id`, `content_version`, `sha256`) triple in the imported thirteen-release
      equals the first-five release's manifest values, read from the old package at test time.
      The first-five release still verifies clean from its own directory — it remains valid input,
      not a superseded relic, and it is the baseline the comparison is made against.
- [x] C3. **Two releases, one record store.** A database that already imported the first-five
      release imports the thirteen-release beside it: the old rows remain untouched, the app serves
      the release it verified this start, and re-importing the thirteen-release adds no rows.
      (Fixture-level append-only behaviour is already pinned by `repository.test.ts`; this criterion
      drives the two real releases through `importRelease` into one database.)
- [x] C4. **The app leaves port 4317 to the lab.** Default port becomes **8317** — it echoes the
      old number but sits far outside the author's climbing 431x kit block. `EDUCODE_PORT` still
      wins. The Vite dev proxy follows the same default. README and docs stop claiming 4317.
- [x] C5. **All thirteen authored lessons pass the rendering contract.** The server-side
      real-lesson suite (`lessonView.test.ts`) and the client-side one (`realLessons.test.tsx`)
      run over the thirteen-release lessons directory, with the file list derived from the release
      manifest rather than hard-coded, so the suites cannot silently cover less than the release.
- [x] C6. **Diagram truth, stated per lesson.** Five lessons carry a Mermaid fence: 1, 2, 5, 6, 11.
      In real Chromium (`tools/screenshots.mjs`) lessons 1, 5, 6 and 11 must draw; lesson 2 keeps
      its honest fallback (CF-001, bytes unchanged in this release); the other eight lesson routes
      must load no Mermaid. Each diagram's equivalent textual account is asserted where the author
      put it: "In words:" after the fence in lessons 1, 2, 5, 6; the preceding "The diagram shows…"
      paragraph in lesson 11.
- [x] C7. **The list surfaces scale.** Dashboard and sidebar list thirteen lessons in manifest
      order with correct hrefs, driven by the release the API serves — pinned at component level
      with a thirteen-lesson fixture.
- [x] C8. **The screenshot gate covers the new surface.** All thirteen lesson routes visited at
      the three widths in both schemes, with the C6 diagram expectations enforced from inside each
      frame's own document, plus the existing zoom, drawer and pinned-navigation checks.

## Assumptions (defaults chosen, recorded rather than asked)

- Port 8317. Any free port outside 431x would do; 8317 is memorable next to the number it replaces.
- Both new packages are committed byte-for-byte, like the first-five package before them
  (772K + 928K). A clone must be able to verify the release the config points at.
- `docs/brief.md` keeps its "first-five checkpoint" framing — it records the project's founding
  scope, and rewriting history is not this slice's job. The roadmap carries the widened goal.
- No learner-state tables exist yet (Milestone 2 builds them), so "preserve learner state" is
  satisfied structurally: append-only content rows and unchanged (`candidate_lesson_id`,
  `content_version`) keys, which C2 and C3 pin.

## Scope fence — explicitly not in this slice

- **No lab-download UI.** Milestone 3, unchanged. The kits import and are stored by reference.
- **No activity placement.** Milestone 2, unchanged. The 39-entry file imports whole.
- **No contents list, previous/next, resume, or heading `id`s.** Slice 4, next.
- **No module grouping or "planned curriculum" surfaces.** The 6–8 handoff asks for planned-work
  visibility only "if the app has that feature"; it does not, and this slice does not add it.
- **No content edits.** The release is content-addressed input. CF-001 stays open — lesson 2's
  bytes are unchanged in the thirteen-release, so the proposed fix now needs the _next_ reissue.

## Done means

The owner starts the app and sees all thirteen lessons listed in authored order, reads lessons
6–13 in full — tables, code, diagrams drawn or honestly falling back — while lessons 1–5 read
exactly as before, and can start the 6–8 lab kit on 4317 while the app is running.

## Slice log

- 2026-09-21. Scoped after verifying both packages' compatibility claims against the received
  bytes (see "What was verified"). The one genuine conflict found — the 6–8 kit and the app both
  defaulting to 4317 — resolved app-side because the port was this repo's choice and the content
  is immutable input.

- 2026-09-21, red state. Eleven tests fail before implementation, all because `config.ts` and
  `vite.config.ts` still point at the first-five release on 4317: `config.test.ts` (2),
  `verify.test.ts` (6, including the vacuous-pass guard in the C2 continuity test; the two
  corrupted-hash boundary tests fail as TypeErrors because the old manifest has no index 3 kit or
  index 12 lesson — the mechanical form the right reason takes until config moves),
  `service.test.ts` (2), `viteProxy.test.ts` (1, added on the PRE finding that the dev proxy's
  default was untested — the server moving off 4317 with the client still dialling it would fail
  every request in `npm run dev` with nothing red). The extended content
  gates — `lessonView.test.ts` real section, `realLessons.test.tsx`, the 13-lesson dashboard
  test — are green on arrival by design: they are regression gates over new release bytes flowing
  through rendering code built in slices 2–3, and they proved the renderer already covers lessons
  6–13, including Lesson 6's flowchart and Lesson 11's preceding textual account.

  Two existing tests changed, declared here:

  1. The real-release describes in `verify.test.ts` / `service.test.ts` now assert the
     thirteen-release identity instead of the first-five. The old release's coverage is not lost —
     it moved to the new "superseded first-five release" describe, which also pins C2 continuity.
  2. `lessonView.test.ts`'s identifier-leak test was a blanket `not.toContain('LS-M020')` over the
     facts JSON. Lesson 7's authored `prerequisites` prose contains `LS-M020-06` (CF-002), which
     the app must show faithfully, so the blanket proxy can no longer tell an app leak from
     authored wording. Re-aimed at what the app controls: no identity/ingestion field surfaces as
     a fact key, and the lesson's own `candidate_lesson_id` / `document_id` never appear in the
     shown text. This is a strictly narrower claim about the app plus a register entry about the
     content, not a weakening: the old assertion was proving a property of the author's prose,
     which was never the app's to promise.

- 2026-09-21, green and verified. All eleven red tests pass with the config move (release
  directory, 8317, proxy, screenshot runner on 8318 — 4318 is the 6–8 kit's documented alternate).
  Full local gate: 435 tests across 18 files, lint, typecheck, build, format, and the screenshot
  gate over seventeen routes × three widths × both schemes. End-to-end, both halves of the port
  story proven at once: the built app answering thirteen lessons on 8317 while the 6–8 kit's
  server listened on 4317 and answered curl.

  The defect that mattered was in the gate, not the app. The diagram reader counted only SVG
  `text` labels and read ink from `text.messageText` — both sequence-diagram anatomy — so Lesson
  6's fully drawn flowchart (eleven labels, all HTML inside `foreignObject`) failed twelve checks
  as "0 labels, unreadable ink". The picture was perfect; the reader was grammar-blind, the exact
  inverse of the blank frames slice 3's review caught. `tools/diagram-checks.mjs` now counts both
  label mechanisms and reads legibility from `.messageText` fill or `.nodeLabel` colour, whichever
  the drawing has, probed against the real frame DOM (0 texts, 11 foreignObjects, ink
  `rgb(51,51,51)` on white) before it was written.

- 2026-09-21, reviews.

  - **test-guardian PRE: pass** with one real gap, closed before the tests were pinned — the Vite
    dev proxy's default port was untested (`viteProxy.test.ts` added). Its two smaller notes were
    also taken: the fixture hash collision at orders 1/11, 2/12, 3/13 fixed with
    `padStart(2, '0').repeat(32)`, and the red-count in this log corrected.
  - **test-guardian POST: skipped by rule.** `git diff` from the pinned red commit over every test
    path shows one comment count fix and one prettier line-join; no assertion moved.
  - **`/code-review` (medium): no correctness bugs.** Two low findings, both closed: the roadmap's
    Current state was stale (rewritten this slice), and two extracted kit directories sat
    untracked inside the byte-for-byte first-five package — verified byte-identical to their
    committed zips, then deleted as derived artifacts.
  - **Design review: ship with nits**, one should-fix applied — Lesson 11's wide tables at 375px
    hard-cut with no scroll affordance where code blocks and diagrams both signal more content;
    `.table-scroll` now shares their gradient stack, each box naming its own surface token
    (`--code-bg` / `--card`). Two nits deferred with reasons: (1) Lesson 13's plain-text tables go
    very tall at 375px from narrow-column wrapping — legible, not broken, content-shaped; worth a
    stacked variant only if more tables arrive shaped like this. (2) The screenshot gate never
    captures a `<details>` disclosure open, so an overflow inside the facts panel would be
    invisible to it; noted for the slice that next touches those panels rather than growing this
    one's scope.
