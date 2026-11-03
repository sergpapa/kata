# Roadmap

## Current state

Last updated 2026-11-03. **The app serves two courses, and the QA course has its first lesson.**
ADR 0018: a fixed course list in `config.ts` (`FSSE` Full-Stack Software Engineering, then `QAAE`
QA Automation Engineering), each course imported from its own release and refused on its own. The
API is under `/api/courses/:courseId/`, pages under `/courses/:courseId/`, `/` is the course list,
and old `/lessons/:id` links forward to the full-stack course. One resume point per course
(migration 6). Work on a lesson two courses share keeps one set of answers. Criteria and slice
record: `docs/specs/multi-course.md`.

**QA Lesson 1 is an owner-review candidate**: `content/releases/qaae-lesson-01-v1/`
(`QAAE-LESSON-01@1.0.0-draft`, "What changes when a machine runs your test?", 3 activities, no
lab). It was reviewed in a separate session and revised against all 17 findings. The owner has not
read it. Its course plans are in `docs/courses/qa-automation/` (ADRs 0014–0017), still v0.1 drafts
awaiting the owner's review.

**The owner's real store is already migrated.** The owner's own `npm run dev` server restarts on file
changes, and it applied migration 6 to `data/educode.sqlite` at 15:41 on 2026-11-03. Checked
read-only afterwards: 0 saved answers and 0 revisions, both before and after (nothing had been
saved), and the one resume point (Lesson 5) moved to `FSSE` intact.

`npm test` (1193 tests), `npm run lint`, `npm run typecheck`, `npm run build`, `npm run
format:check` and `npm run screenshots` (22 routes, 3 widths, 2 schemes) pass under nvm's Node 24.12.

**Known and not fixed.** The dashboard's "Your records" card still says work is not recorded "until
Milestone 2", which has shipped. `release:build` cannot build a course's first release, so the QA
package was assembled once by script. `LessonPage.tsx` is 359 lines. Everything listed under the
previous state that this slice did not touch still stands (see "Superseded state notes").

Next action: the owner reads QA Lesson 1 and Lessons 5–8 of the full-stack course in the app, and
reviews the QA course plans in `docs/courses/qa-automation/`. The next QA content is the BookingLab
practice-application spec, which the course's Playwright stage depends on. The app's next slice
is still Milestone 3's Export.

## Milestone 1 — Read the authored lessons faithfully (goal: the owner can read every released lesson — 1–15 since the FIRST-FIFTEEN release — in the app, in the authored wording and order)

- [x] **Release import.** Done 2026-09-11. All eight hashes verified against received bytes on every
      start, paths refused by either OS convention and by real path, identity conflicts between the
      manifest and the lesson front matter refused by name, lessons stored append-only against
      `candidate_lesson_id`, content version and release ID. Criteria and slice log in
      `docs/specs/release-import.md`; decisions in ADR 0006.
- [x] **Markdown rendering contract.** Done 2026-09-11. CommonMark plus GFM tables and fenced code;
      raw HTML, unsafe link targets and images rendered as visible text rather than deleted or
      executed; output sanitized; code blocks and tables scroll inside themselves at 375px;
      whitespace preserved character for character. First H1 is the display title, and the page's
      only `h1`. Criteria and slice log in `docs/specs/markdown-rendering.md`; decisions in ADR 0007.
- [x] **Mermaid diagrams.** Done 2026-09-11. A diagram that parses is drawn inside an iframe whose
      `sandbox` is empty, so the SVG never enters this document; the authored source stays reachable
      below it. One that does not parse keeps the labelled source block it already had and says, in
      the parser's own words, which line was refused. Lessons with no diagram never load Mermaid.
      test-guardian PRE and POST, `/code-review` and a design review; the defect that mattered was
      two draws sharing one Mermaid id, which made a light-to-dark switch report that a valid
      diagram could not be drawn. Criteria and slice log in `docs/specs/mermaid-diagrams.md`;
      decisions in ADR 0008.
- [x] **Engineering Practice visual design.** Done 2026-09-15, taken out of order because slice 4
      adds surfaces to the lesson page and adding them to the plain layout means designing them
      twice. The package's light palette is ported value for value; the dark variant is derived
      here and every pair in both schemes is checked numerically in `apps/web/src/theme.test.ts`
      rather than by eye. No Tailwind, Radix, shadcn or Lucide was added — the reference is 90%
      plain CSS and its own integration guide says the manifests are not a requirement. Reviewed by
      test-guardian PRE and POST, `/code-review` (three confirmed defects, all in drawer focus
      handling) and a design review, whose finding that mattered was a screenshot check passing on
      blank diagram frames. Criteria, the two knowing deviations and the slice log are in
      `docs/specs/visual-design-integration.md`.
- [x] **Thirteen-lesson release import.** Done 2026-09-21, out of order because the content
      arrived: two cumulative packages (lessons 6–8 with revised curriculum specifications, and
      lessons 9–13). The app imports `FSSE-HTTP-FIRST-THIRTEEN`; lessons 1–5 keep their keys and
      bytes, proven against the first-five manifest at test time; the app leaves port 4317 to the
      6–8 lab kit and serves on 8317. The defect that mattered was the screenshot gate's diagram
      reader being flowchart-blind — a fully drawn Lesson 6 reported zero labels, the inverse of
      slice 3's blank frames passing. test-guardian PRE (one gap closed: the dev proxy's port was
      untested), POST skipped on diff evidence, `/code-review` (two low, both closed), design
      review (one fix: tables at 375px now carry the same scroll cue as code blocks). Criteria and
      slice log in `docs/specs/content-release-first-thirteen.md`; content findings CF-002 and the
      CF-001 carry-over in `docs/content-feedback.md`.
- [x] **Fifteen-lesson release import.** Done 2026-09-21, again out of order because the content
      arrived: the lessons 14–15 investigation package. The app imports `FSSE-HTTP-FIRST-FIFTEEN`;
      lessons 1–13 keep their keys and bytes, proven against both superseded baselines at test
      time; no port conflict (the new kit binds 4321/4323, verified running beside the app). The
      findings that mattered came from `/code-review`, both latent: a circular YAML alias crashed
      the importer instead of the promised named refusal, and StrictMode's doubled dev effects made
      the shell steal focus on first paint. test-guardian PRE (no gaps), POST skipped on diff
      evidence, design review ship-with-nits (one applied: the code-block scroll cue was
      near-invisible on the dark surface; it now carries its own shadow ink and width, verified by
      pixel-sampling the regenerated capture). Criteria and slice log in
      `docs/specs/content-release-first-fifteen.md`.
- [x] **1.0.1 correction import.** Done 2026-09-21. The author's reissue accepting CF-001 and
      CF-002 — the register's loop closed end to end: proposed in `docs/content-feedback.md`,
      accepted by the author, verified against `content-corrections.json`'s authorized hash
      transitions, and lesson 2's diagram proven drawn in real Chromium (Mermaid 11.17.2), five of
      five. The continuity tests learned to tell an authorized correction from silent drift.
      Criteria and slice log in `docs/specs/content-release-corrections-101.md`.
- [x] **Reader navigation and resume.** Done 2026-09-22. Contents list of the open lesson's
      sections in the sidebar with namespaced heading anchors (the slice-2 deferral closed),
      previous/next in manifest order named by the server beside the lesson, and the resume point
      as a silent server-side pointer (schema 3, ADR 0010) offered back as the dashboard's
      Continue card. test-guardian PRE (four findings taken) and POST, `/code-review` (one
      confirmed finding: the transient Start card could record over the reader's place; fixed
      test-first), design review ship-with-nits (two taken, one declined with reason). Criteria
      and slice record in `docs/specs/reader-navigation-and-resume.md`.

## Milestone 2 — Keep the owner's work honestly (goal: work survives a refresh and a restart, and is never falsely labelled saved)

- [x] **Activity placement.** Done 2026-09-22. The 45 activities from `trial-activities.json` (15
      original, 24 added with lessons 6–13, 6 with lessons 14–15) at the end of the section each
      one's `source_heading` names, without re-rendering the excerpt that is already on the page,
      and with no writing surface at all. test-guardian PRE (FAIL on two critical findings, both
      taken) and POST (pass), `/code-review` (five confirmed findings taken, two declined with
      reasons, one plausible taken), design review (ship-with-nits, all four taken). Criteria and
      slice record in `docs/specs/activity-placement.md`.
- [x] **Acknowledged saves.** Done 2026-09-22. One box per field the author declared, one stored
      record per (activity, field), and a compare-and-set whose own change count decides the
      outcome. Five visible states — unsaved, saving, saved, failed to save, and a conflict showing
      both texts where the reader chooses. Leaving a lesson with unsaved text stops and names it,
      for a link, for back and forward, and for a refresh. test-guardian PRE (FAIL on seven
      findings, all taken before any implementation) and POST (pass), `/code-review` at high (15
      findings, 13 taken, two declined with reasons), design review (ship-with-nits, five of seven
      taken). The defect that mattered was found by the review and POST independently: a 409
      carrying `stored: null` was filled in with a client-invented timestamp, so Use stored read
      "Saved" for a record that did not exist. Criteria and slice record in
      `docs/specs/acknowledged-saves.md`; the key decision in ADR 0011.
- [x] **Prediction history.** Done 2026-09-23. Schema 5, one append-only revision table, and the
      live record untouched: every accepted write that changes a field's text is its own revision,
      stamped with the version it answered, and the earlier ones sit under the box that superseded
      them. All four declared fields, not `prediction` alone. test-guardian PRE (FAIL on two
      findings, both taken before anything was built) and POST skipped on diff evidence — no vitest
      test moved during implementation. `/code-review` at medium (four findings, all taken), design
      review ship-with-nits (three findings, two taken, one declined with a reason). The finding
      that mattered was invisible to every test because every test started from an empty store: the
      migration recorded nothing that was already there, so the owner's existing answers would have
      vanished from history the first time they corrected one. Criteria and slice record in
      `docs/specs/prediction-history.md`; the decision in ADR 0012.
- [x] **Save failure recovery.** Done 2026-09-23 (ticked 2026-11-03). A refused save offers Copy and
      Download of the exact text, the conflict panel and earlier versions offer Copy, and nothing
      is sent or stored by either. Criteria and slice record in `docs/specs/save-failure-recovery.md`.

## Milestone 3 — Local labs and the handoff back (goal: the owner can do the terminal work and send their notes to the content author)

- [x] **Lab downloads.** Done 2026-09-23, opening Milestone 3 out of order at the owner's
      instruction. The correct kit per lesson, re-hashed against the release on every request and
      served byte-for-byte under the author's own filename; a Copy button on all 155 non-diagram
      fenced blocks. test-guardian PRE (FAIL on three findings, all taken before any implementation)
      and POST (pass, two coverage gaps closed), `/code-review` at medium (12 findings, all taken),
      design review (ship-with-nits, five findings, all taken). The finding that mattered would have
      broken every download on a machine whose release sits behind a symlink or a junction, and on
      none of mine. Criteria and slice record in `docs/specs/lab-downloads.md`.
- [ ] **Export.** The owner's actual work with lesson, activity, content-version and release context,
      in a form that travels with the owner review forms (`Owner_Review_After_Lesson_05.md`, `_08`,
      `_13`).
- [ ] **Accessibility and responsiveness pass.** Keyboard operation of navigation, notes, downloads,
      help and export; 375 / 768 / 1440 with no horizontal page scroll; diagram meaning as text.
- [ ] **Acceptance run.** Work the twelve checks in `VS_Code_Coder_Handoff_v1.md` §6, the eight in
      the 6–8 handoff's "App acceptance checks", the seven in the 9–13 handoff's "Acceptance in
      your app" and the seven in the 14–15 handoff's "Acceptance" (several depend on Milestone 2/3
      surfaces that do not exist yet), and write an honest verification report naming what was
      exercised and what was not.

## Authoring in-house (ADR 0013; goal: lessons keep coming at the standard of Lessons 1–4)

- [x] **Release packaging.** Done 2026-11-03. Seed an editable source tree from a release; build the
      next cumulative release from it with every hash computed, kit manifests kept honest, unchanged
      kits reused byte for byte and the importer's own verification required. test-guardian PRE
      (FAIL on four findings, all taken; then PASS), POST skipped on diff evidence, `/code-review`
      at medium (ten findings, seven taken, three declined with reasons). Criteria and slice record
      in `docs/specs/release-packaging.md`.
- [x] **Multi-course support and QA Lesson 1.** Done 2026-11-03 (ADR 0018). The app serves `FSSE`
      and `QAAE` from their own releases; QA Lesson 1 ships as `QAAE-LESSON-01`. test-guardian PRE
      (migration approved, eight findings on the new tests, all taken) and POST (pass), separate
      lesson review (17 findings, all taken), `/code-review` at medium (ten findings: eight taken,
      one declined, one a process finding reported to the owner), design review (needs work; the
      in-course findings taken). Record in `docs/specs/multi-course.md`.
- [ ] **Owner reading of QA Lesson 1** and review of the QA course plans (`docs/courses/qa-automation/`).
- [ ] **BookingLab practice-application spec**, the QA course's critical path.
- [ ] **Owner reading of Lessons 5–15**, then a correction reissue built with the tool.
- [ ] **Lesson 16 (M021-08)**, written and reviewed in separate sessions; adding a lesson and kit to
      a release is that slice's packaging work.

## Beyond the checkpoint — not started, not scheduled

The P1 specification's submission and review loop (W-04 to W-06): attempts and immutable snapshots,
file preview and bounded ingestion, reviewer queue, findings and responses, appeals, evidence schema
2.0, competency decisions, authentication, hosting. Each needs the owner review first, and several
need an approved data policy and a named reviewer before they mean anything.

## Session notes

- **2026-09-23, slice 12 — prediction history (Milestone 2 slice 3).** Built to
  `docs/specs/prediction-history.md`: 979 tests, test-guardian PRE, `/code-review`, design review,
  `/hygiene`. Closes Export's dependency.

  Four forks were asked in one Stage-0 batch and all four defaults taken: all four declared fields
  keep a history rather than `prediction` alone, the earlier versions reach the reader as a closed
  per-box disclosure, a save that repeats the stored text appends nothing, and there is no Restore
  control this slice.

  **The finding that mattered was invisible to every test, because every test started from an empty
  store.** Migration 5 created the revision table and recorded nothing already in it. On a fresh
  store — which is what the whole suite, the screenshot gate and the manual verification all use -
  that is indistinguishable from correct. On the owner's store, which has held work since slice 10,
  the first save after the upgrade would have appended only the new text, and the answer they wrote
  before today would have been unrecoverable: the exact loss this slice exists to prevent, on the
  one store that matters. `/code-review` found it by reading the migration against a store that
  already had rows. The lesson is narrower than "test the upgrade path": **a fixture that is always
  empty cannot see a migration that only forgets what was already there.**

  **PRE failed on two findings, both about tests that could not fail.** V26's asked whether `--card`
  was painted anywhere in `activities.css` — and it already is, four times, by rules with nothing to
  do with the disclosure — so an empty `.response-history {}` would have passed it, and `npm test`
  would have gone green on a disclosure with no styling at all. P17's date assertions were satisfied
  by the raw ISO string: `2020-01-02T14:02:00.000Z` contains both "2020" and "14:02". Both are the
  same mistake in different clothes — **an assertion aimed at a whole file, or at a substring, is
  aimed at nothing in particular.** The same weak shape sits in `ResponseConflict.test.tsx:359` from
  slice 10, named rather than changed, because it is not this slice's test.

  **The gate's guard against its own narrowing could not detect what it claimed to.** Aiming the
  whitespace check at `.code-block pre` needed a guard that the selector still matched something,
  and the guard was derived from the same selector — so renaming the class emptied both and the run
  went green having measured nothing. Replaced with a classification: every `pre` on the page is a
  sample, the owner's own prose, or a failure. Renaming `.code-block` now produces 90 named
  failures where the previous version produced none.

  **The design review found a 25px touch target one component over from the fix.** `diagram.css`
  carries a 44px rule with a comment explaining why, written when the same defect was found there.
  A pattern fixed in one file is not fixed in the codebase, and the only thing that catches this at
  build time is the assertion the gate now carries.

- **2026-09-23, slice 11 — lab downloads (Milestone 3 slice 1).** Built to
  `docs/specs/lab-downloads.md`: 919 tests, test-guardian PRE and POST, `/code-review`, design
  review, `/hygiene`. Opens Milestone 3, out of order and with Milestone 2's last two slices still
  open, at the owner's instruction.

  Four forks were asked in one Stage-0 batch and all four defaults taken: the kit sits in a fixed
  place rather than at its first prose mention (nine of the fourteen kit-bearing lessons never name
  it in their body, so matching would place five and fall back for nine), every fenced block gets a
  Copy button rather than only `sh` and `powershell`, kits are reachable through their lessons only,
  and the suite's parked concurrency question was answered first.

  **Answering that question first was worth more than the slice.** "Flaky" turned out to be two
  faults: jsdom saturation, which `pool: 'vmThreads'` fixed, and which had been hiding a real
  one-task lag in the unsaved registry that three synchronous handlers read. 1-in-3 to 0-in-25, and
  64.4s to 9.8s. Doing it before Stage 2 is what made every red run in this slice mean something.

  **PRE failed on three findings, all taken with nothing built.** The one that mattered was
  invisible from the test's own red run: `contrast()` was being called with two hex strings and no
  scheme — six TS2554 errors hidden behind the file's `ENOENT` on a stylesheet that did not exist
  yet. All nine contrast checks would have thrown rather than measured, the moment the implementer
  created that file. The second was a test that could never pass: a 3:1 floor over `--border` and
  `--quote-rule`, which measure 1.20:1 and 1.58:1 and which the spec forbids replacing. A test
  satisfiable only by a wrong implementation is worse than no test.

  **Two of my own tests turned out to contradict each other**, and the fork went to the owner rather
  than being resolved quietly: the payload pinned `lessonIds` while the panel test demanded "lessons
  6, 7 and 8", and a lesson's number cannot be got from its key — `LS-M021-01` is lesson 9. An
  implementation that split the key on its suffix would have been wrong for lessons 9–15 and green,
  because every panel fixture was M020.

  **The review finding that mattered would have broken every download on somebody else's machine.**
  `readVerifiedBytes` compares its base against the real path of what it read, and the importer
  canonicalises first; the download route did not. Behind a symlink, a Windows junction or an 8.3
  short name — `os.tmpdir()` on macOS is one — all five kits resolve outside their own base. Every
  test passed, and all five kits downloaded live.

  **The spec's own "no existing test moves" claim was wrong, and is corrected in place rather than
  removed.** Two tests read the code block _wrapper's_ text, and the grep behind the claim asked
  which tests read the `pre`. The previous slice made the identical mistake one level down. The
  lesson it wrote — which tests pin a constant is a grep, not a memory — is only as good as what the
  grep is aimed at.

  The design review's sharpest finding was that this panel recreated the problem the facts list above
  it was collapsed to solve: ~605px on a 375px phone, first sentence ~1133px down. Identity and
  checksum went behind a disclosure; re-measured at 436px and 1028px.

- **2026-09-22, slice 10 — acknowledged saves (Milestone 2 slice 2).** Built to
  `docs/specs/acknowledged-saves.md`: 810 tests, test-guardian PRE and POST, `/code-review` at high,
  design review, `/hygiene`. The first writing surface in the app, and the first thing it keeps.

  Four forks were asked in one Stage-0 batch and all four defaults taken: a save covers one field
  rather than an activity, the live record keys on `(activity_id, field_name)` with the content
  version stamped per write (ADR 0011), a conflict shows both texts and the reader chooses, and
  leaving a lesson with unsaved text stops and asks.

  **PRE failed the tests on seven findings, all taken before any implementation existed** — and the
  process failure of the previous slice was not repeated: nothing was built until the pass came
  back. The finding that most justified the pass was one this spec's own re-aim list had missed:
  `/api/health` pinned `schemaVersion: '3'`, which migration 4 moves. Two more were tests that
  passed against an app with nothing built at all, each asserting "no boxes when no fields are
  declared" — equally true of a page with no boxes anywhere. **A second instance of that same missed
  pin surfaced during implementation, in the same file**, and was declared before the line was
  touched. The lesson, written into the spec: which tests pin a constant is a grep, not a memory.

  **The defect that mattered was found twice, independently.** `/code-review` and test-guardian POST
  both reached it: a 409 carrying `stored: null` — the server saying honestly that it holds nothing
  — was filled in by the client with an empty string, revision 0 and **a timestamp of its own**, so
  Use stored made the field read "Saved at 14:07" for a record that did not exist. The exact false
  save ADR 0004 exists to forbid, in code no test touched. Two reviewers arriving by different
  routes is the strongest signal either produced.

  `/code-review` returned 15 findings in all, 13 taken. The one worth naming beside the false save
  is that **a test had been weakened and the spec claimed otherwise**: re-aim 4 kept the font-size
  half of a retired assertion and dropped its `--muted-foreground` half, and the implementation then
  set the line in exactly the ink the dropped half forbade. A re-aim that keeps a test's name and
  drops one of its two assertions reads, in a diff, like the same test — which is why the list
  exists, and why a list alone is not enough. The spec's "None of them is weakened" sentence is
  corrected in place rather than removed.

  The design review returned ship-with-nits, five of seven taken. Its sharpest was that the Save
  button was the only place in the whole app filling a button with `--primary`, twelve times per
  lesson, louder than the lesson's own navigation; it is now outlined and fills only while a write
  is actually waiting. Its density finding is declined in the spec with reasons: the suggested fix —
  one save per activity — is the fork the owner was asked about and did not take.

  Two implementation choices a test drove, both recorded rather than worked around: the textarea id
  is built from the activity and field instead of `useId`, whose colons are legal in an `id` but
  break any selector built from one; and the failed and conflict lines state what happened rather
  than negating what did not, because a reader skimming twelve states reads the word before the
  "not".

  **An environment fact, not a code change:** `better-sqlite3`'s binding on disk was built for
  NODE_MODULE_VERSION 127 while the only installed Node is now 24.12.0 (137). 97 server tests failed
  on it mid-slice until `npm rebuild better-sqlite3`. Worth knowing on the next machine or the next
  Node bump.

- **2026-09-22, slice 9 — activity placement (Milestone 2 slice 1).** Built to
  `docs/specs/activity-placement.md`: 651 tests, test-guardian PRE and POST, `/code-review`, design
  review, `/hygiene`. Opens Milestone 2.

  Four forks were asked in one Stage-0 batch and all four defaults taken: no writing surface at all
  (rather than disabled fields, or folding the saving slice in), the panel at the end of its section
  (rather than under the heading), an unplaceable activity shown at the lesson's foot (rather than
  refusing the release), and the sidebar contents list left alone. No ADR: the storage question the
  slice might have raised was already answered — `content_activity_set` has held the file since
  schema 2, so there is no migration and nothing new to decide.

  **The process failure worth not repeating: implementation was started while the PRE pass was still
  running.** PRE then failed the tests on two critical findings, so nothing was built on approved
  tests, and the red commit became a presentational split rather than a chronological one -
  `git diff <red> <green> -- <tests>` proves nothing for this slice. POST was run with the specific
  post-implementation test edits named instead, and verified each one. The cost was real: it removed
  the cheapest evidence the pipeline has.

  PRE's finding that mattered most was that the real-release placement test could not tell "at the
  end of the section" from "directly under the heading" — it checked only that no shallower heading
  sat between them, which an under-the-heading panel satisfies vacuously, and 16 of the 45
  activities sit in multi-block sections where those are different pages. Its second was that V1–V3
  had no test at all.

  `/code-review`'s finding that mattered was the same shape one level up: the screenshot gate itself
  was blind to total placement failure, because it counted placed and foot panels together. It is
  now proven by sabotage. The other four: the foot panels were component state on a page that is not
  remounted between lessons, so lesson 2's first commit drew lesson 1's activity under lesson 2's
  title (the test for it has to watch every mutation — the settled DOM is correct, and React reuses
  the element rather than re-adding it); `heading_ambiguous` rendered a prompt although the section
  was on the page twice, which U2 and U3 had contradicted each other about; a heading matched by its
  authored Markdown spelling made the panel reprint the section's name with backticks showing; and a
  rendered prompt's heading ids could collide with the body's.

  The design review's sharpest finding was that the one sentence that must not be missable -
  "The app cannot store any of it yet" — was set smaller and dimmer than the line above it, which is
  the visual grammar for small print. It also caught the panel's lime left rule as a fifth use of a
  spot colour the edge spec reserves to four echoes all meaning "you are here"; the lime was removed
  rather than a fifth echo declared.

- **2026-09-22, slice 8 — reader navigation and resume (Milestone 1 slice 4).** Built to
  `docs/specs/reader-navigation-and-resume.md`: 542 tests, test-guardian PRE and POST,
  `/code-review`, design review. Closes Milestone 1.

  Three forks were asked in one Stage-0 batch and all three defaults taken: the resume point lives
  in SQLite rather than browser storage (the handoff's own acceptance check demands the reading
  position survive restart in a provable way, and ADR 0004 already distrusts browser storage);
  granularity is the lesson, not a scroll offset (a scroll claim is a reading claim the app cannot
  verify, and the new contents list makes within-lesson return one click); and resume is a card,
  never a redirect (the release's own status caveat stays visible). ADR 0010 records why the
  pointer sits outside the acknowledged-save contract: no text anyone wrote is at risk, so four
  save states would put a meaningless "saved" on screen, and last-write-wins loses nothing
  recoverable.

  PRE's finding that mattered most moved P4 — the real fifteen-lesson previous/next chain — off
  the screenshot gate into a vitest integration test over the real release directory, where an
  off-by-one fails an assertion instead of hoping a reviewer reads a PNG. POST verified the one
  post-red test change (App.test's fetch-order pin re-aimed to a URL-containment claim, declared
  in the spec) preserved its claim. `/code-review`'s confirmed finding was a race worth having a
  name: the dashboard drew Start-lesson-1 while the resume answer was in flight, and following
  that transient link recorded lesson 1 over the reader's real place; the card now waits for both
  answers, pinned by a never-resolving-fetch test. The design review's two nits (the contents
  label's casing and its double-inset misalignment) are fixed; its optional chevron suggestion is
  declined in the spec with the reviewer's own restraint reasoning. The slice's styles pushed two
  files past the ~350-line split point and moved whole into `apps/web/src/navigation.css`.

- **2026-09-21, slice 7 — the 1.0.1 correction import.** Built to
  `docs/specs/content-release-corrections-101.md`: 458 tests, test-guardian PRE (pass; its one
  recommendation — pin CF-001's literal corrected substring, mirroring CF-002's test — taken
  before the red commit), `/code-review`, POST skipped on diff evidence.

  The first release update that legitimately changes shipped lesson bytes, which is what the
  append-only store and `(candidate_lesson_id, content_version)` keys were built for. The
  superseded-baselines test changed shape deliberately: strict tuple equality became "identical,
  or exactly the transition `content-corrections.json` authorizes", with a companion test pinning
  that file to CF-001 and CF-002 alone — so silent drift on any uncorrected lesson, a third
  version of a corrected one, or an over-broad corrections file all still fail. PRE independently
  hashed lessons 2 and 7 across all four release directories to confirm the authorized branch
  actually engages on real data rather than falling through vacuously.

  Eight red for the one right reason (config), green on the one-line flip. Acceptance was the
  package's own step 6: lesson 2's sequence diagram drawn and read inside its frame by the
  screenshot gate — Mermaid 11.17.2, three widths, both schemes, five diagrams total — and
  confirmed by direct capture inspection: picture where the fallback banner was, "+ Show diagram
  source" beneath it, the authored "In words:" account beside it. No design review agent this
  slice: the diff contains no UI code, and the one visual change (a diagram type reviewed in
  slice 3) is exactly what the gate measures; declared here rather than silently skipped.

- **2026-09-21, slice 6 — fifteen-lesson release import.** Built to
  `docs/specs/content-release-first-fifteen.md`: 453 tests, test-guardian PRE, `/code-review`,
  design review, POST skipped on diff evidence (two prettier line-rewraps after the pinned red
  commit; the review fixes' tests were each watched red before their fix).

  The smoothest drop yet, by design: ADR 0009's layout meant the package landed under
  `content/releases/` by pure `git mv` before any test was written, and the manifest-driven
  suites from slices 2–5 extended themselves — the red state was ten tests, all failing for the
  single reason that config still pointed at the thirteen-release. No port conflict this time
  (kit on 4321/4323, app on 8317; all three servers verified answering at once). The superseded
  describe now compares both baselines directly against the fifteen, keeping the oldest link
  proven when the first-five-versus-thirteen test retired.

  The defects that mattered came from `/code-review` and were latent, not this slice's: (1) a
  YAML alias cycle in front matter parsed into a circular object and crashed `JSON.stringify` at
  store time — an uncaught startup crash where the app promises a named refusal; now refused as
  `front_matter_invalid` inside `splitFrontMatter`, covering importer and lesson view alike.
  (2) the shell's first-paint focus guard was a "have I run" boolean, so StrictMode's doubled dev
  effects made the initial load steal focus to `<main>`; the guard now remembers the last route
  key. (3) the real-release tests read ambient `process.env`, so an exported
  `EDUCODE_RELEASE_DIR` would silently re-aim them; they now pass `{}`. No new content findings:
  lessons 14–15 cite prerequisites by number, so CF-002's pattern did not recur, and CF-001 waits
  on the next reissue (lesson 2's bytes unchanged again).

- **2026-09-21, slice 5 — thirteen-lesson release import.** Built to
  `docs/specs/content-release-first-thirteen.md`: 435 tests, test-guardian PRE, `/code-review`,
  design review, POST skipped on diff evidence (only a comment count and a prettier line-join moved
  after the pinned red commit).

  Scoping found the slice's one genuine conflict before any code moved: the 6–8 lab kit and the
  app both defaulted to port 4317, and the first-five package never chose a port for the app — the
  4317 was this repo's own. The app moved to 8317. Every compatibility claim in the two packages
  was verified against received bytes before being relied on: lessons 1–5 identical across all
  three manifests, all hashes matching disk, the 15 old activity IDs a subset of the new 39.

  PRE closed a real gap — the Vite dev proxy's port default was untested, so the server could move
  off 4317 while the client kept dialling it, failing every request in `npm run dev` with nothing
  red. The defect that mattered after green was in the gate, not the app: the diagram reader only
  understood sequence diagrams' SVG `text` labels, so Lesson 6's fully drawn flowchart (labels in
  HTML inside `foreignObject`) reported zero labels — the inverse of slice 3's blank frames
  passing. The design review's one fix: wide tables at 375px hard-cut with no scroll cue where
  code blocks and diagrams both fade; `.table-scroll` now shares their gradient stack, each box
  naming its surface. Content findings went to the register, not the code: CF-002 (lesson 7's
  prerequisite shows a stable ID) and CF-001's carry-over (lesson 2's bytes unchanged, so the fix
  needs the next reissue).

  One test re-aimed, declared in the spec: the facts-panel leak check asserted no `LS-M020` text
  anywhere, which lesson 7's authored prose legitimately trips; it now checks the app's own
  responsibility — no identity field surfaces, the lesson's own IDs never appear.

- **2026-09-11, slice 2 — Markdown rendering contract.** Built to
  `docs/specs/markdown-rendering.md`: 219 tests, test-guardian PRE and POST, `/code-review`, design
  review, `/hygiene`.

  PRE failed the first test draft on four findings, all fixed before any implementation existed —
  most importantly that the five real lesson files never passed through the server's own body
  extraction, and that `tools/screenshots.mjs` enforced nothing because it visited only the home
  page and downgraded overflow to a warning.

  POST found the defect that mattered. Reference-style links and images — `[text][ref]`,
  `![alt][ref]` — bypassed the guard entirely, because those are `linkReference` and
  `imageReference` nodes that are not resolved into anchors and images until mdast becomes hast,
  after every remark plugin has run. A lesson containing `![menu][c]` with
  `[c]: https://tracker.example/pixel.png` rendered a live `img` and loaded it. Every hostile target
  in the suite had been driven through the inline spelling only. Links and images are now guarded on
  the element tree, where both spellings have converged.

  `/code-review` found that `/lessons/%` crashed the whole app, that generated footnote anchors were
  being sent to a new tab, and that navigation reset neither scroll nor focus. The design review
  found that inline code in table cells was breaking mid-token — `127.0.0.1` rendering as `127.` /
  `0.0.` / `1` in 12 cells at 375px, which teaches the wrong string — and that the facts panel
  pushed the first sentence of Lesson 2 1,420px down a phone; it now starts at 518px, with the
  author's status caveat promoted out of the disclosure so it is never hidden.

  Two test assertions changed after PRE approval, both declared in `docs/specs/markdown-rendering.md`
  with reasons. Three findings declined, also recorded there with reasons: `mailto:` stays text, the
  front-matter fallback stays as it is because the importer already refuses by name, and heading
  `id`s wait for slice 4 where they have a consumer.

- **2026-09-11, slice 1 — release import.** Built to `docs/specs/release-import.md`: 75 tests,
  test-guardian PRE and POST, `/code-review`, design review. POST found two defects the first
  implementation had — a non-string YAML front-matter `version` or `document_id` slipping past the
  substituted-lesson check, and a release with no lessons importing as an empty success — both fixed
  with tests. The path-escape check now asks both `path.posix` and `path.win32`, because a suite that
  only ever runs on Windows cannot otherwise prove the cross-platform branch exists. ADR 0006 records
  verify-on-every-start and append-only content rows. Superseded state: before this slice the repo
  was a walking skeleton — client → Fastify → SQLite verified, 2 tests, nothing imported.

- **2026-09-11.** Read the handoff package. Confirmed local single-machine delivery, the
  Fastify/SQLite/React stack and the checkpoint-only scope with the owner. Wrote `docs/brief.md` and
  ADRs 0001–0005, scaffolded the workspace, verified the skeleton locally. The architect agent was
  deliberately skipped: `Technical_Architecture_and_Implementation_Plan_v1.md` already is that
  output, and the ADRs record where this build narrows it.

## Superseded state notes

Kept so a reader can see what the state said before it was replaced, never to be resumed from.

- **2026-11-03, before multi-course support.**

  Last updated 2026-11-03. **Content authoring has moved into this repo, and the tool that builds
  releases is done.** The external author (a ChatGPT project) stopped working; ADR 0013 records that
  lessons are now written here and still ship as cumulative, hash-addressed release packages.
  `docs/authoring/README.md` is the handbook — the governing specs in order, the owner's verbatim
  feedback to the old author, the review record and the model choice (Opus 5.5 writes; Fable 5.1
  only if the owner judges an Opus lesson below the standard of Lessons 1–4) — with the salvaged
  transcript kept byte for byte beside it.

  **Release packaging (authoring slice 1)** is built: `npm run release:seed` turns a release into an
  editable source tree, `npm run release:build` builds the next cumulative release from it, deriving
  every manifest entry, injecting canonical lesson copies into kits, reusing unchanged kit zips byte
  for byte, refusing versions that did not move with their bytes, and refusing to exist until the
  app's own `verifyRelease` accepts it. Verified end to end: a Lesson 5 correction built as 1.0.2,
  imported and served by the app. Criteria and slice record in `docs/specs/release-packaging.md`.
  `content/source/` does not exist yet — it is seeded when the first correction arrives.

  **The owner has reviewed only Lessons 1–4.** Lessons 5–15 have never been read by the owner, so no
  new lesson is written until they have been: the next content is most likely a correction reissue
  of 5–15, then Lesson 16 (M021-08). The app is unchanged and still serves
  `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft`. Milestone 2 is complete — save failure recovery was finished
  on 2026-09-23 (its roadmap box was not ticked then).

  `npm test` (1124 tests in three vitest projects; the new `authoring` project runs one file at a
  time — see the slice log), `npm run lint`, `npm run typecheck`, `npm run build` and
  `npm run format:check` pass **under nvm's Node 24.12**. Under Anaconda's Node 22.13, first on PATH
  in some shells, 156 tests fail because `better-sqlite3` is built for Node 24 — not a regression.

  **Known and not fixed.** Two unexplained full-suite runs now (slice 11's and this slice's first
  Node 24 run), each failing one test per file across files the change could not reach; neither
  signature was captured. The full suite now takes 44–51s instead of about 33s, the price of running
  the authoring tests serially. A built release carries `release.status` as authored, so a stale
  status is not flagged. `build.test.ts` is 385 lines. Everything listed under the previous state
  (superseded notes, "before authoring moved in-house") that this slice did not touch still stands.

  **A second course is being planned: QA Automation Engineering** (manual testers to mid-level
  automation). Decisions are in ADRs 0014–0017: a separate course on a shared module library,
  Playwright + TypeScript in depth, grading by a fault-injection kit run on the learner's machine, and
  AI review through the learner's own Claude Code over MCP. Draft plans are in
  `docs/courses/qa-automation/` (architecture and module syllabus, v0.1, awaiting owner review). No
  lessons are written for it. Its critical path is the BookingLab practice-application spec. The app
  needs multi-course support before it can serve this course.

  Next action: the owner reads Lessons 5–8 in the app, labs included, and returns notes in any form;
  answers typed into the app are readable from `data/educode.sqlite`. Meanwhile the app's next slice
  is Milestone 3's Export.

- **2026-11-03, before authoring moved in-house.**

  **2026-11-03: content authoring moves in-house.** The external authoring tool stopped working.
  Authoring continues in this repo, and its rules, the owner's verbatim feedback to the old author,
  and the agreed model choice are in `docs/authoring/README.md`, with the salvaged transcript beside
  it. Next: an ADR for the move, then Lesson 16 (M021-08) as a release package that the owner
  reviews. **This section was not updated after the save-failure-recovery commits (`1c3dc47`,
  `dfceddc`, `6c977e2`, 2026-09-23).** Its checkbox under Milestone 2 is still open, so the next
  session must confirm that slice's definition of done before taking it as complete.

  Last updated 2026-09-23. **Milestone 1 is complete, Milestone 2 has one slice left, and Milestone 3
  has its first.** The app imports `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` — fifteen lessons across
  modules M020 and M021, five lab kits, 45 activity entries — from
  `content/releases/http-first-fifteen-v1_0_1/content`, serves all of it inside the Engineering
  Practice shell (Swiss-revival direction, spec and dial sheet in
  `docs/specs/edge-visual-refinement.md`), lets the reader navigate and resume, places the author's
  activities beside the sections they were written for, keeps what the owner writes against them,
  hands over the lab kits, lets every code sample be copied, and **since slice 12 never replaces an
  answer: every save that changes a box's text is its own revision, and the earlier ones sit under
  the box that superseded them**.

  **Milestone 3 was begun out of order, at the owner's instruction**, and Milestone 2's last slice -
  save failure recovery — is still open. **Export's dependency is now satisfied**: it carries "the
  owner's actual work", and prediction history is what gives that work revisions to carry.

  **Prediction history (slice 12).** Schema 4 to 5, one new table `learner_response_revision`, and
  `learner_response` untouched — the compare-and-set of ADR 0004 and the key of ADR 0011 are exactly
  what they were. Every accepted write whose text differs from the field's newest revision appends one
  row carrying the revision number the live record took, the text character for character, and the
  lesson, version and release the server stamped; a write that repeats the stored text is still
  accepted, still moves the live record, and appends nothing, because nothing about the work changed.
  The append is inside the same transaction as the conditional write, so there is no state in which
  the live record moved and its history did not. **The migration seeds every answer already in the
  store as its own first revision** — without it, the owner's existing work would have vanished from
  history the first time they corrected it, which was `/code-review`'s finding and the loss the slice
  exists to prevent. Nothing edits or deletes a revision, including the app (ADR 0012). All four
  declared fields keep a history, not `prediction` alone.

  `GET /api/lessons/:id` carries `earlierVersions` on each stored response — every revision but the
  newest, newest first, with its number, text, time and content version — and both the 200 and the
  409 of a save carry the same, recomputed after the write, so the page never assembles a history
  from what it remembers sending. A field with earlier versions shows a closed **Earlier versions (N)**
  disclosure below its Save; a field with none shows nothing at all, so a first read-through adds no
  height to any of the twelve boxes a lesson carries. Earlier text renders as characters, never as
  Markdown or HTML. There is no Restore — copying work out is the next slice's subject.

  Every lesson page carries an **IN THIS LESSON** contents list in the sidebar, **previous/next**
  links at its foot answered by the server from `display_order`, and a **resume point** — one silently
  written SQLite row (ADR 0010). **Acknowledged saves** give each of the 45 panels one box per field
  its author declared, twelve on a lesson, each saving on an explicit press with no autosave; "Saved"
  appears only while the text is character for character what the server acknowledged, a refusal keeps
  the text and names the reason, a revision conflict shows both texts, and leaving a lesson with
  unsaved text stops and names what is unsaved. **Lab downloads** serve a kit's exact bytes under the
  author's own filename after re-hashing them against the release on every request, refusing a changed
  kit 409 with both hashes named; all 155 non-diagram fenced blocks carry a Copy button.

  CF-001 and CF-002 remain closed by the 1.0.1 reissue; the correction transition stays pinned to the
  author's own `content-corrections.json` in `verify.test.ts`. All five received packages live
  byte-for-byte under `content/releases/` (ADR 0009). The 14-15 kit still binds 4321/4323, clear of
  the app's 8317 and the gate's 8318. The diagram census stays five of five in real Chromium (Mermaid
  11.17.2); Markdown still parses straight to React elements, raw HTML still becomes visible text, and
  the sandboxed-iframe exception still grants nothing. The suite's reliability question stays answered

  - `pool: 'vmThreads'` and a layout-effect unsaved registry, 0 failures in 25 unloaded runs at commit
    `f4a0713`.

  `npm test` (979 passing across 43 files), `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run format:check` and `npm run screenshots` all pass locally. The gate now also seeds three
  saves on lesson 1's first activity through the app's own API — two of them different — and proves,
  at every width and scheme, that exactly that field shows `Earlier versions (1)`, that opening it
  makes no sideways scroll, that its text wraps rather than spilling, and that its summary is at least
  44px tall. It also classifies every `pre` on a page as a sample, the owner's own prose, or a
  failure. Each of those three was proven by sabotage.

  **Known and not fixed.** **One unexplained full-suite run** during slice 11's review reported 8
  failures, one per file, across both projects, including server files the change under test could not
  reach. Its signature was not captured, and every full-suite run since has been clean. Not
  reproduced, and not explained. Deferred with reasons in
  `docs/specs/content-release-first-thirteen.md`: content-shaped tall tables at 375px (lesson 13).
  **The open-disclosure gap is now half closed** — the gate opens and measures the earlier-versions
  disclosure, but still never opens the lab kit panel's identity and checksum. Declined with reasons
  in `docs/specs/reader-navigation-and-resume.md` (chevrons on the neighbour links),
  `docs/specs/activity-placement.md` (a malformed activity record still refuses the whole release),
  `docs/specs/acknowledged-saves.md` (the density of twelve boxes; a Leave-anyway that pushes rather
  than going back) and `docs/specs/prediction-history.md` (the history list's 1px rule against the
  panel's 3px and 2px ones). The kit panel still adds about 410px to every kit-bearing lesson at
  375px, which is the owner's to judge in the trial. The Copy button's touch target is 39px, not the
  44px guideline — a stated compromise against a control repeated 23 times a page; the earlier-versions
  summary clears 44px. **`apps/server/tsconfig.json` excludes `src/**/*.test.ts`, so server test files
  are never typechecked by `npm run typecheck`** — four of them carry pre-existing type errors, and
  this is the gap that hid six of them in slice 11. Five test files sit over the ~350-line guidance:
  `verify.test.ts` at 846, `app.test.ts` at 618, `responseRevisions.test.ts` at 497,
  `unsavedNavigation.test.tsx` at 487 and `responses.test.ts` at 450; `tools/screenshots.mjs` is at 571.

  Next action: Milestone 2, save failure recovery — a failed save keeps the text present and
  recoverable, and the learner can copy or download it. After that, Milestone 3's Export, whose
  dependency this slice closed.

- **2026-09-22, before slice 11.**

  Last updated 2026-09-22. **Milestone 1 is complete and Milestone 2 has its first two slices.** The
  app imports `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` — fifteen lessons across modules M020 and M021,
  five lab kits, 45 activity entries — from
  `content/releases/http-first-fifteen-v1_0_1/content`, serves all of it inside the Engineering
  Practice shell (Swiss-revival direction, spec and dial sheet in
  `docs/specs/edge-visual-refinement.md`), lets the reader navigate and resume, places the author's
  activities beside the sections they were written for, and **since slice 10 keeps what the owner
  writes against them**.

  Every lesson page carries an **IN THIS LESSON** contents list in the sidebar, **previous/next**
  links at its foot answered by the server from `display_order`, and a **resume point** — the lesson
  last opened, one silently written SQLite row (schema version 4, ADR 0010). The dashboard's card
  reads Continue lesson naming the last-opened lesson, or Start lesson when nothing is recorded.

  **Acknowledged saves (slice 10)** give each of the 45 panels one box per field its author declared —
  `prediction`, `observation`, `explanation`, `help_used`, so twelve on a lesson. Each saves on its
  own, on an explicit press, with no autosave anywhere. **"Saved" appears only while the text in the
  box is character for character what the server acknowledged**, so typing one more character returns
  the field to unsaved without a request. A save the server refuses leaves the text in the box, names
  the reason in the server's own words, and offers Save again. A save refused because the field moved
  elsewhere opens the conflict path instead: both texts on screen at once, Keep mine and Use stored,
  neither discarded without a click. Leaving a lesson with unsaved text stops and names what is
  unsaved — for a link, for back and forward, and for a refresh.

  Storage is `learner_response`, one row per `(activity_id, field_name)`, schema 4. The write decides
  its own outcome: the expected revision goes into the `WHERE` clause and the statement's own change
  count is the answer, so a refusal is a refusal rather than a read that lost a race. Every accepted
  write stamps the lesson, content version and release **the server reads off the imported release**,
  never anything the request claimed — ADR 0011 records why the version is stamped per write rather
  than keyed on, which is what keeps an authorized correction from presenting as an empty box where
  the owner's answer was. `--input` arrives with the first textarea at `#767f93` / `#5c6b94` rather
  than the published `#c8d1e4`, closing the C2 deviation in `docs/specs/visual-design-integration.md`;
  three save-state inks join it, light values from the design package's own destructive and note
  colours, dark derived, every pair measured in `theme.test.ts`.

  CF-001 and CF-002 remain closed by the 1.0.1 reissue; the correction transition stays pinned to the
  author's own `content-corrections.json` in `verify.test.ts`. All five received packages live
  byte-for-byte under `content/releases/` (ADR 0009). The 14–15 kit still binds 4321/4323, clear of
  the app's 8317 and the gate's 8318. The diagram census stays five of five in real Chromium (Mermaid
  11.17.2); Markdown still parses straight to React elements, raw HTML still becomes visible text, and
  the sandboxed-iframe exception still grants nothing.

  `npm test` (810 passing across 35 files), `npm run lint`, `npm run typecheck`, `npm run build`,
  `npm run format:check` and `npm run screenshots` all pass locally. The gate's activity check now
  also proves, per lesson per width per scheme, that the number of writing surfaces on the page equals
  the total of every activity's own `responseFields` as `GET /api/lessons/:id` reports them, that each
  carries a label of its own, and that each has a way to save what is typed in it — the expected count
  asked of the API rather than written down. Proven by sabotage: making `ResponseField` render nothing
  fails 90 checks by name.

  **Known and not fixed.** `realActivityPlacement.test.tsx`'s LS-M020-02 case fails about one
  full-suite run in three, always on a 5000 ms **timeout**, never on a wrong value; 10/10 in isolation
  at 852 ms, and 1261 ms on the commit before slice 10, so the slice made it faster. Two independent
  reviewers diagnosed harness saturation — 21 jsdom environments costing 50–90 s inside a ~15 s wall
  clock. Not widened and not skipped: the standing rule forbids widening a budget to fit a stress the
  harness inflicts on itself, and the real fix is a suite-wide concurrency decision nobody has made
  yet. That decision is the first thing worth taking to the next slice. Deferred with reasons in
  `docs/specs/content-release-first-thirteen.md`: content-shaped tall tables at 375px (lesson 13), and
  open-disclosure captures missing from the screenshot gate. Declined with reasons in
  `docs/specs/reader-navigation-and-resume.md` (chevrons on the neighbour links),
  `docs/specs/activity-placement.md` (a malformed activity record still refuses the whole release) and
  `docs/specs/acknowledged-saves.md` (the density of twelve boxes, which is decision 1's cost and the
  owner's to judge in the trial; a Leave-anyway that pushes rather than going back). Four test files
  sit over the ~350-line guidance: `verify.test.ts` at 846 and `app.test.ts` at 601, both
  pre-existing, and `unsavedNavigation.test.tsx` at 487 and `responses.test.ts` at 449 from slice 10.

  Next action: Milestone 2, prediction history — an acknowledged prediction becomes its own revision,
  and a later correction appends rather than replaces. The per-field records and the per-write version
  stamp this slice built are what that appends to.
