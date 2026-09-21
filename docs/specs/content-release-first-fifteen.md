# Content release update — the first fifteen lessons

Milestone 1, slice 6 (taken out of order, like slice 5, because the content arrived). One package
arrived on 2026-09-21: `HTTP_Investigation_Lessons_14_15_v1` (lessons 14–15, the deep-investigation
pair the curriculum promised, plus one new lab kit with deliberately faulty starter code).
`FSSE-HTTP-FIRST-FIFTEEN` extends the chain: `FSSE-HTTP-FIRST-FIVE` → `FSSE-HTTP-FIRST-EIGHT` →
`FSSE-HTTP-FIRST-THIRTEEN` → `FSSE-HTTP-FIRST-FIFTEEN`. The app imports the fifteen-release; the
thirteen-release joins the first-five as a committed, verified baseline that config no longer
points at.

The coder handoff (`VS_Code_Coder_Handoff_Lessons_14_15_v1.md`) asks the same as its predecessors:
import the release into the existing app, keep the Engineering Practice design, keep lessons 1–13
IDs, versions, bytes and learner state, keep the new kit's ZIP byte-for-byte (its faults are the
exercise), and add nothing that pretends the planned lessons 16+ exist.

## What was verified before this slice was scoped

Checked 2026-09-21 against the received bytes, before any code moved:

- Lessons 1–13: `lesson_id`, `document_id`, `version`, `module`, `title`, `path`, `sha256`,
  `order` and `lab_id` identical between the thirteen-release and fifteen-release manifests.
- The four prior lab kits identical on `version`, `path`, `sha256` and `lesson_ids`.
- Every `sha256` in the fifteen manifest matches the file on disk — 15 lessons, 5 kits, the
  activity file. Front matter `document_id` and `version` match the manifest on both new lessons.
- `trial-activities.json` grows 39 → 45 entries; all 39 prior entries survive byte-identical.
  `activity_set_id` is `FSSE-HTTP-FIRST-FIFTEEN-ACTIVITIES`.
- Manifest `schema_version` stays `1.0.0`; `supersedes_release` names
  `FSSE-HTTP-FIRST-THIRTEEN@1.0.0-draft`.
- **No port conflict this time.** The investigation kit binds 4321 (incident), 4322 (stated
  alternate) and 4323 (transfer) — the author's kits now span 4315–4323, all clear of the app's
  8317/8318. Nothing moves.
- Neither new lesson carries a Mermaid fence, so the five-diagram census (1, 2, 5, 6, 11) is
  unchanged. Neither new lesson names a stable lesson ID in prose — the CF-002 pattern does not
  recur; lesson 14's front-matter prerequisites cite lessons by number.

## Acceptance criteria

- [ ] C1. **Default import.** With no env overrides the app verifies and imports
      `FSSE-HTTP-FIRST-FIFTEEN@1.0.0-draft` from
      `content/releases/http-lessons-14-15-release-v1/content` (received as
      `docs/HTTP_Investigation_Lessons_14_15_v1`, rehomed byte-for-byte under `content/releases/`
      per ADR 0009): exactly fifteen lessons, `LS-M020-01` … `LS-M020-08` then `LS-M021-01` …
      `LS-M021-07`, in manifest order 1–15; Lesson 1 at `2.0.0-draft`, every other lesson at
      `1.0.0-draft`; the five lab kits (`FSSE-HTTP-LAB-02`, `-03-05`, `-06-08`, `-09-13`,
      `-14-15`) with their manifest hashes; the 45-entry activity set stored whole.
- [ ] C2. **Continuity of the keys learner state will hang off.** For lessons 1–13, the
      (`candidate_lesson_id`, `content_version`, `sha256`, `order`) tuple in the imported
      fifteen-release equals the thirteen-release's values, read from that package at test time.
      Both superseded releases (first-five, thirteen) still verify clean from their own
      directories — they remain valid input, and they are the baselines the comparison is made
      against.
- [ ] C3. **Three releases, one record store.** A database that already imported the first-five
      and thirteen-releases — the store an owner who followed the chain actually has — imports the
      fifteen-release beside them: the old rows remain untouched, and re-importing the
      fifteen-release adds no rows.
- [ ] C4. **All fifteen authored lessons pass the rendering contract.** The server-side
      real-lesson suite (`lessonView.test.ts`) and the client-side one (`realLessons.test.tsx`)
      run over the fifteen-release lessons directory, file list derived from the release manifest,
      so the suites cannot silently cover less than the release.
- [ ] C5. **Diagram truth, stated per lesson.** The census is unchanged: lessons 1, 5, 6, 11 draw
      in real Chromium, lesson 2 keeps its honest fallback (CF-001, bytes unchanged again — the
      fix still waits for a reissue), and the other ten lesson routes — now including 14 and
      15 — must load no Mermaid.
- [ ] C6. **The list surfaces scale.** Dashboard and sidebar list fifteen lessons in manifest
      order with correct hrefs — pinned at component level with a fifteen-lesson fixture.
- [ ] C7. **The screenshot gate covers the new surface.** All fifteen lesson routes visited at
      the three widths in both schemes, with the C5 expectations enforced from inside each frame's
      own document, plus the existing zoom, drawer and pinned-navigation checks.

## Assumptions (defaults chosen, recorded rather than asked)

- The package is committed byte-for-byte like the three before it, and rehomed under
  `content/releases/` by pure `git mv` in the same slice — ADR 0009 already names that home, so
  this drop lands there rather than repeating the wrapper-folder detour.
- README's "stays off ports 4315–4320" widens to 4315–4323; the app's own ports do not move.
- No learner-state tables exist yet (Milestone 2), so "preserve learner state" is again satisfied
  structurally: append-only content rows and unchanged (`candidate_lesson_id`, `content_version`)
  keys, which C2 and C3 pin.

## Scope fence — explicitly not in this slice

- **No lab-download UI.** Milestone 3, unchanged. The fifth kit imports and is stored by
  reference, faults and all.
- **No activity placement.** Milestone 2, unchanged. The 45-entry file imports whole.
- **No contents list, previous/next, resume, or heading `id`s.** Slice 4, still next.
- **No "planned curriculum" surfaces.** Lessons 16–20 exist only as plans in
  `Release_Status_and_Sequence.md`; the app must not render empty pages for them.
- **No content edits, no kit extraction.** The release is content-addressed input; the kit's
  deliberate defects ship as supplied. CF-001 stays open — lesson 2's bytes are unchanged in the
  fifteen-release too.

## Done means

The owner starts the app and sees all fifteen lessons listed in authored order, reads lessons 14
and 15 in full — tables, code fences, quoted incident report — while lessons 1–13 read exactly as
before, and can run the investigation kit's servers on 4321/4323 while the app is running.

## Slice log

- 2026-09-21. Scoped after verifying the package's compatibility claims against the received bytes
  (see "What was verified"). No conflict found — unlike slice 5, the new kit's ports (4321–4323)
  clear the app's 8317/8318, so nothing moves but the config's release directory. The package was
  rehomed under `content/releases/` first (pure `git mv`, its own commit), so the red state below
  fails for exactly one reason rather than also tripping over missing paths.

- 2026-09-21, red state. Ten tests fail before implementation, all because `config.ts` still
  points at the thirteen-release: `config.test.ts` (1), `verify.test.ts` (7 — the re-aimed
  identity, kit/activity and release-identity assertions; the two corrupted-hash boundary tests
  fail as TypeErrors because the thirteen manifest has no index 4 kit or index 14 lesson, the
  mechanical form the right reason takes until config moves; and both superseded-baseline
  comparisons stopped by their vacuous-pass guard), `service.test.ts` (2, the fifteen-lesson
  import and the three-release store). The extended content gates — `lessonView.test.ts` real
  section and `realLessons.test.tsx`, both now reading the fifteen-release directory — are green
  on arrival by design: they are regression gates over new release bytes flowing through rendering
  code built in slices 2–3, and they prove the renderer already covers lessons 14–15. The
  fifteen-lesson dashboard test is likewise green at component level: the list surface was built
  to follow the release it is handed.

  Existing tests changed, declared here: the real-release describes in `verify.test.ts` /
  `service.test.ts` now assert the fifteen-release identity. The thirteen-release's coverage moved
  to the superseded-releases describe, exactly as the first-five's did in slice 5 — and that
  describe now compares _both_ baselines directly against the fifteen, because dropping the
  first-five-versus-thirteen test would otherwise have left the oldest link proven only by a test
  that no longer exists. `apiFixture.ts`'s `thirteenLessons` stops being exported (it builds
  `fifteenLessons`); the dashboard scale test re-aims from thirteen to fifteen, its five-lesson
  base case untouched. No assertion was weakened.
