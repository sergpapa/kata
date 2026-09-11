# Roadmap

## Current state

Last updated 2026-09-11. The walking skeleton runs: client → Fastify → SQLite, verified end to end
by a screenshot showing "Connected. Record store schema version 1." `npm test` (2 passing),
`npm run lint`, `npm run typecheck`, `npm run build` and `npm run screenshots` all pass locally.
Nothing is imported yet and no lesson is readable.

Next action: Milestone 1, slice 1 — the release importer.

## Milestone 1 — Read the five lessons faithfully (goal: the owner can read Lessons 1–5 in the app, in the authored wording and order)

- [ ] **Release import.** Read `content/learning-release.json`, verify every SHA-256 against received
      bytes, reject paths escaping the release directory, and fail with a named-file reason on a
      mismatch, missing file, duplicate lesson ID or missing referenced lab. Store lessons against
      `candidate_lesson_id`, content version and release ID.
- [ ] **Markdown rendering contract.** CommonMark plus tables and fenced code, raw HTML disabled,
      output sanitized, code blocks horizontally scrollable without the page scrolling sideways,
      whitespace preserved in HTTP messages and sample output. First H1 is the display title.
- [ ] **Mermaid diagrams.** Safe configuration, authored prose kept adjacent, labelled text fallback
      when a diagram cannot render.
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

- **2026-09-11.** Read the handoff package. Confirmed local single-machine delivery, the
  Fastify/SQLite/React stack and the checkpoint-only scope with the owner. Wrote `docs/brief.md` and
  ADRs 0001–0005, scaffolded the workspace, verified the skeleton locally. The architect agent was
  deliberately skipped: `Technical_Architecture_and_Implementation_Plan_v1.md` already is that
  output, and the ADRs record where this build narrows it.
