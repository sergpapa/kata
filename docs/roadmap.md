# Roadmap

## Current state

Last updated 2026-09-11. The five lessons import and each one can now be read at its own address,
`/lessons/<candidate_lesson_id>`. Markdown parses straight to React elements — no HTML string exists
anywhere in the app — and anything that must not render becomes visible text rather than being
deleted. Fence text is preserved character for character, which is what keeps Lesson 1's HTTP
request sample correct. Front matter shows as selected learner-facing facts with the author's own
status caveat always visible. Schema version 2, unchanged this slice.

`npm test` (219 passing across 11 files), `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run format:check` and `npm run screenshots` all pass locally. `npm run screenshots` is now a
real check rather than a capture: it visits all six routes at three widths in both colour schemes
and exits non-zero if a page scrolls sideways or a code block stops preserving whitespace, neither
of which the jsdom suite can see. Verified in a browser against the built app, 14 checks over three
consecutive runs.

Not yet readable as intended: the three Mermaid diagrams show as labelled source blocks — that is
slice 3's text fallback arriving early, not a placeholder. There is no contents list, no
previous/next and no resume point; slice 4 adds those, and will add heading `id`s with it.

Next action: Milestone 1, slice 3 — Mermaid diagrams.

## Milestone 1 — Read the five lessons faithfully (goal: the owner can read Lessons 1–5 in the app, in the authored wording and order)

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
- [ ] **Mermaid diagrams.** Safe configuration, authored prose kept adjacent, labelled text fallback
      when a diagram cannot render. The fallback already ships: a `mermaid` fence renders as a
      labelled block showing its source.
- [ ] **Reader navigation and resume.** Contents list, manifest order, read ahead and back, and a
      resume point the app returns the learner to.

## Milestone 2 — Keep the owner's work honestly (goal: work survives a refresh and a restart, and is never falsely labelled saved)

- [ ] **Activity placement.** The 15 activities from `trial-activities.json` beside their
      `source_heading`, without re-rendering the excerpt that is already on the page.
- [ ] **Acknowledged saves.** Compare-and-set writes with the four states — unsaved, saving, saved,
      failed to save — and a visible conflict path rather than a silent overwrite.
- [ ] **Prediction history.** An acknowledged prediction is its own revision; a later correction
      appends and never replaces it.
- [ ] **Save failure recovery.** A failed save keeps the text present and recoverable, and the
      learner can copy or download it.

## Milestone 3 — Local labs and the handoff back (goal: the owner can do the terminal work and send their notes to the content author)

- [ ] **Lab downloads.** Correct kit per lesson (none for 1, its own for 2, shared for 3–5), served
      with its version identity, plus copy-exact command buttons that copy and never execute.
- [ ] **Export.** The owner's actual work with lesson, activity, content-version and release context,
      in a form that travels with `Owner_Review_After_Lesson_05.md`.
- [ ] **Accessibility and responsiveness pass.** Keyboard operation of navigation, notes, downloads,
      help and export; 375 / 768 / 1440 with no horizontal page scroll; diagram meaning as text.
- [ ] **Acceptance run.** Work the twelve checks in `VS_Code_Coder_Handoff_v1.md` §6 and write an
      honest verification report naming what was exercised and what was not.

## Beyond the checkpoint — not started, not scheduled

The P1 specification's submission and review loop (W-04 to W-06): attempts and immutable snapshots,
file preview and bounded ingestion, reviewer queue, findings and responses, appeals, evidence schema
2.0, competency decisions, authentication, hosting. Each needs the owner review first, and several
need an approved data policy and a named reviewer before they mean anything.

## Session notes

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
