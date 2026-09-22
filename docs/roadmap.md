# Roadmap

## Current state

Last updated 2026-09-22. **Milestone 1 is complete.** The app imports
`FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` — fifteen lessons across modules M020 and M021, five lab
kits, 45 activity entries — from `content/releases/http-first-fifteen-v1_0_1/content`, serves all
of it inside the Engineering Practice shell (Swiss-revival direction, spec and dial sheet in
`docs/specs/edge-visual-refinement.md`), and since slice 4 the reader can navigate and resume:
every lesson page carries an **IN THIS LESSON** contents list in the sidebar (heading anchors via
`rehype-slug`, namespaced `user-content-` by the sanitizer's clobber prefix, collected off the
very tree that renders so list and page cannot drift), **previous/next** links at the lesson's
foot answered by the server from `display_order`, and a **resume point** — the lesson last opened,
one silently written SQLite row (schema version 3, ADR 0010) behind its own repository module.
The dashboard's card reads Continue lesson naming the last-opened lesson, or Start lesson when
nothing is recorded; it renders only once the resume answer settles, because a transient Start,
followed fast, would have recorded lesson 1 over the reader's real place (/code-review's one
finding, fixed test-first). The records card states both truths: the last-opened lesson is kept;
notes and predictions are not, and arrive with Milestone 2's acknowledged saving. Nothing anywhere
claims read, studied or completed — "last opened" is the whole recorded fact.

CF-001 and CF-002 remain closed by the 1.0.1 reissue; the correction transition stays pinned to
the author's own `content-corrections.json` in `verify.test.ts`. All five received packages live
byte-for-byte under `content/releases/` (ADR 0009). The 14–15 kit still binds 4321/4323, clear of
the app's 8317 and the gate's 8318. The diagram census stays five of five in real Chromium
(Mermaid 11.17.2); Markdown still parses straight to React elements, raw HTML still becomes
visible text, and the sandboxed-iframe exception still grants nothing.

`npm test` (542 passing across 21 files), `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run format:check` and `npm run screenshots` all pass locally. The gate now also proves, per
run: contents anchors resolving exactly once on all fifteen lessons at three widths in both
schemes, a followed anchor landing clear of the top bar (`scroll-margin-top`), the drawer carrying
the contents at 375px, the first contents entry on screen at 768/1440 three thousand pixels down a
lesson, and a real resume round trip (open lesson 7, return home, Continue lesson 07) — and it
wipes its own data directory per run, since an app that records state would otherwise hand the
second run different captures. A cold restart over the same database file answers the recorded
lesson. The server has its first write endpoint (`PUT /api/resume-point`), which refuses an
unknown lesson by name, a nameless body with `resume_point_invalid`, and stores nothing on any
refusal; a stale pointer to a lesson the release no longer carries answers `none` without the row
being deleted or rewritten.

Known and not fixed: the design package's published `--input` border measures 1.53:1 on white
where WCAG 1.4.11 asks 3:1, so it is not ported rather than ported broken; Milestone 2 adds the
first textarea and `docs/specs/visual-design-integration.md` C2 names darker values that pass.
Deferred with reasons in `docs/specs/content-release-first-thirteen.md`: content-shaped tall
tables at 375px (lesson 13), and open-disclosure captures missing from the screenshot gate.
Declined with reason in `docs/specs/reader-navigation-and-resume.md`: chevrons on the neighbour
links (the restraint dial; the design review itself called them optional).

Next action: Milestone 2, activity placement — the 45 activities from `trial-activities.json`
beside their `source_heading`, which is also where the C2 input-border values come due.

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

- [ ] **Activity placement.** The 45 activities from `trial-activities.json` (15 original, 24
      added with lessons 6–13, 6 with lessons 14–15) beside their `source_heading`, without
      re-rendering the excerpt that is already on the page.
- [ ] **Acknowledged saves.** Compare-and-set writes with the four states — unsaved, saving, saved,
      failed to save — and a visible conflict path rather than a silent overwrite.
- [ ] **Prediction history.** An acknowledged prediction is its own revision; a later correction
      appends and never replaces it.
- [ ] **Save failure recovery.** A failed save keeps the text present and recoverable, and the
      learner can copy or download it.

## Milestone 3 — Local labs and the handoff back (goal: the owner can do the terminal work and send their notes to the content author)

- [ ] **Lab downloads.** Correct kit per lesson (none for 1, its own for 2, shared kits for 3–5,
      6–8, 9–13 and 14–15), served with its version identity, plus copy-exact command buttons that
      copy and never execute. The 14–15 kit ships deliberately faulty starter code; byte-for-byte
      is the contract, not a defect.
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

## Beyond the checkpoint — not started, not scheduled

The P1 specification's submission and review loop (W-04 to W-06): attempts and immutable snapshots,
file preview and bounded ingestion, reviewer queue, findings and responses, appeals, evidence schema
2.0, competency decisions, authentication, hosting. Each needs the owner review first, and several
need an approved data policy and a named reviewer before they mean anything.

## Session notes

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
