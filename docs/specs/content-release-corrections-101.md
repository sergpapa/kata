# Content correction release — 1.0.1, CF-001 and CF-002 accepted

Milestone 1, slice 7 — a correction import, not a content expansion. The package
`HTTP_Lessons_01_15_v1_0_1` arrived 2026-09-21: `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft`, superseding
`1.0.0-draft`, reissued to accept the two open register entries. Lesson 2's Mermaid message drops
its semicolon (`Stopped, the file remains`), so the one diagram that could not draw now can;
lesson 7's prerequisite reads "Lesson 6" instead of `LS-M020-06`. This is the first release update
that legitimately changes shipped lesson bytes, which is exactly the scenario the append-only
record store and `(candidate_lesson_id, content_version)` keys were built for.

`CONTENT_CORRECTIONS_1_0_1.md` governs the import: use the whole release directory, treat
`content-corrections.json` as the authorization for the two hash transitions, preserve stable IDs
and historical attempt versions, and render Lesson 2 with the app's pinned Mermaid as the
acceptance step, recording the renderer version and actual result.

## What was verified before this slice was scoped

Checked 2026-09-21 against the received bytes, before any code moved:

- Every `sha256` in the 1.0.1 manifest matches disk — 15 lessons, 5 kits, the activity file.
- Exactly two lessons changed against the 1.0.0 release: `LS-M020-02` and `LS-M020-07`, both
  `1.0.0-draft` → `1.0.1-draft`, every identity field (`order`, `document_id`, `module`, `title`,
  `path`, `lab_id`) unmoved. The other thirteen are byte-identical.
- Exactly two kits changed: `FSSE-HTTP-LAB-02` and `FSSE-HTTP-LAB-06-08` (they nest copies of the
  corrected lessons), both to `1.0.1-draft`. The other three are byte-identical.
- `content-corrections.json`'s previous/current hash pairs match the 1.0.0 and 1.0.1 manifests
  exactly, for both lessons and both kits — the transition is authorized end to end.
- Lesson 2's fence now reads `Stopped, the file remains`; no raw semicolon remains in any message
  line of the five current Mermaid fences (still lessons 1, 2, 5, 6, 11 — census unchanged).
- Lesson 7's front matter no longer contains `LS-M020-06`.
- `trial-activities.json`: same 45 activity IDs; exactly 6 entries advance only their referenced
  lesson version, nothing else changed. Historical attempts keep their recorded versions by design.
- Manifest status: "owner-review candidate; CF-001 and CF-002 corrected; app renderer/import
  acceptance pending" — the "newly authored" wording is gone, so the status assertion changes.

## Acceptance criteria

- [x] C1. **Default import.** With no env overrides the app verifies and imports
      `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` from
      `content/releases/http-first-fifteen-v1_0_1/content`: fifteen lessons, same IDs and order as
      1.0.0; content versions `2.0.0-draft` (lesson 1), `1.0.1-draft` (lessons 2 and 7),
      `1.0.0-draft` (the rest); kit versions `1.0.1-draft` for `FSSE-HTTP-LAB-02` and
      `-06-08`, `1.0.0-draft` for the other three; the same 45-entry activity set.
- [x] C2. **The corrected lessons changed exactly as authorized.** Against the 1.0.0 fifteen
      release read at test time: thirteen lessons tuple-identical; lessons 2 and 7 keep their ID
      and order, advance to the version and `sha256` that `content-corrections.json` declares,
      from the previous values it declares. All superseded baselines (first-five, thirteen,
      fifteen-1.0.0) still verify clean from their own directories.
- [x] C3. **Four releases, one record store.** A store holding first-five, thirteen and
      fifteen-1.0.0 imports the 1.0.1 beside them — 48 lesson rows, nothing merged or replaced —
      and re-importing 1.0.1 adds no rows. Old rows keep old versions: that is how historical
      attempts retain their provenance.
- [x] C4. **Lesson 2 draws.** The acceptance step the package asks for: in real Chromium, lesson
      2's sequence diagram renders and is read inside its frame, joining lessons 1, 5, 6, 11 —
      five drawn, zero fallbacks. The renderer version and result are recorded in this log.
- [x] C5. **The rendering contract holds over the corrected bytes.** The manifest-driven suites
      run over the 1.0.1 lessons directory; lesson 7's facts panel shows the corrected
      prerequisite wording.
- [x] C6. **The register closes the loop.** CF-001 and CF-002 move to accepted-in-1.0.1-draft in
      `docs/content-feedback.md`, keeping the entries as history.

## Scope fence

Everything the fifteen-release spec fenced off stays fenced (no lab UI, no activity placement, no
navigation, no planned-lesson surfaces). No content edits: the corrected bytes are the author's,
verified, not ours. The 1.0.0 fifteen package stays committed as a baseline, like its
predecessors.

## Done means

The owner opens lesson 2 and sees the sequence diagram drawn where the fallback banner used to
be, lesson 7's facts panel says "Lesson 6", and lessons they studied under 1.0.0 keep their
recorded identity.

## Slice log

- 2026-09-21. Scoped after verifying the package's claims against bytes (see above). The
  correction is exactly what the register proposed: CF-001's comma (verified by the author's
  reviewer to render; our gate is the actual render check) and CF-002's wording.

- 2026-09-21, red state. Eight tests fail before implementation, all because `config.ts` still
  points at the 1.0.0 release: `config.test.ts` (1, the path), `verify.test.ts` (6 — release
  version, the contentVersions census with lessons 2/7 at `1.0.1-draft`, kit versions, the status
  string, and the three baseline agrees-with tests stopped by their vacuous-pass guard),
  `service.test.ts` (1, the four-release store, 48 rows). Green on arrival by design: the
  corrections-file authorization test (reads `content-corrections.json` directly), lesson 7's
  corrected-prerequisite facts test, and the manifest-driven rendering suites over the 1.0.1
  bytes. The screenshot gate's red lives at gate time: `lesson-02` now expects `drawn`, which the
  un-flipped app cannot satisfy.

  Existing tests changed, declared here: the real-release assertions advance to the 1.0.1
  identity (version, contentVersions, kit versions, status wording — the author dropped "newly
  authored" for "CF-001 and CF-002 corrected"). The superseded-baselines comparison changes shape
  deliberately: strict tuple equality for every lesson becomes "identical, or exactly the
  transition `content-corrections.json` authorizes", with a companion test pinning that the
  corrections file authorizes exactly CF-001 and CF-002 and nothing else. This is the first
  legitimate content change in the release chain, and the exception is bounded by the author's
  own signed-off previous/current hash pairs, which were verified against both manifests before
  scoping. The identity-leak comment in `lessonView.test.ts` updates from "lesson 7 does this" to
  "lesson 7 did this until 1.0.1"; no assertion weakened.

- 2026-09-21, green and verified. All eight red tests pass with the one-line config flip. Full
  local gate: 458 tests across 18 files, lint, typecheck, build, format, and the screenshot gate
  over nineteen routes × three widths × both schemes. **C4, the package's own acceptance step:
  lesson 2's sequence diagram drawn and read inside its frame by the gate — Mermaid 11.17.2, real
  Chromium, five diagrams total, zero fallbacks** — and confirmed by direct inspection of the
  regenerated capture: the picture where the fallback banner used to be, "+ Show diagram source"
  beneath it, the authored "In words:" account directly after.

- 2026-09-21, reviews.

  - **test-guardian PRE: pass.** It independently re-derived the red state, verified every
    asserted value against the 1.0.1 manifest, hashed lessons 2 and 7 across all four release
    directories to prove the authorized-exception branch engages on real data rather than falling
    through vacuously, and confirmed the exception shape admits neither silent drift on
    uncorrected lessons, nor a third version of a corrected one, nor an over-broad corrections
    file. Its one low finding — CF-001's literal corrected text was pinned only by the manual
    screenshot gate — was taken before the red commit: `lessonView.test.ts` now asserts the
    register's exact substring, mirroring CF-002's test.
  - **test-guardian POST: skipped by rule.** `git diff` from the pinned red commit over every test
    path is empty; only `config.ts` and docs changed after red.
  - **Design review: no agent this slice, declared.** The diff contains no UI code; the one
    visual change — lesson 2's diagram type, reviewed in slice 3 — is exactly what the gate
    measures in-frame, and the capture was inspected directly (see the green entry).
  - **`/code-review`: not run this slice, declared.** The owner stopped the run. The
    implementation diff is one config path line; every test change was audited by PRE, and no
    other production code moved.
