# Product brief — EduCode learning application (first-five checkpoint)

**Status:** approved 2026-09-11. Derived from the supplied handoff package rather than a discovery
interview — the requirements already exist in writing, and this brief selects the subset that the
first checkpoint delivers.

**Source package:** `content/releases/vs-code-first-five-v1/`
(entry document `VS_Code_Coder_Handoff_v1.md`, package `FSSE-VSCODE-FIRST-FIVE-HANDOFF` v1.0.0-draft).
That directory is an input, not our source code. It is left byte-for-byte intact; its hashes are how
we prove an import was faithful.

## What we are building

An application that presents independently authored Markdown lessons, records the learner's real
work against them, saves that work honestly, and exports it for review.

The first checkpoint serves one learner — the owner — working through HTTP Lessons 1 to 5 on their
own machine. It is a learning rehearsal, not a public course launch and not an assessment service.

## Who it is for

| User                         | In this checkpoint                                                                                       | Later                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Owner as learner             | Reads the five lessons, records predictions/observations/reflections, downloads labs, exports their work | Same, across the wider curriculum                   |
| Content author (external)    | Receives the exported work and the owner review; supplies the next release                               | Authoring and release-review screens (UX-14, UX-15) |
| Reviewer, assessor, operator | Not present. No review is simulated.                                                                     | The P1 evidence loop (specs W-05 onward)            |

## v1 scope — what the checkpoint must do

1. **Import a learning release.** Read `content/learning-release.json`, verify every SHA-256 against
   the received bytes, reject a path that escapes the release directory, and fail with a specific
   reason on a missing file, duplicate lesson ID, hash mismatch, or missing referenced lab. Never
   fill a gap with generated content.
2. **Read and navigate.** Five lessons in manifest order, readable central column, contents list,
   real tables, usable code blocks, rendered Mermaid with the authored prose kept beside it.
   Full authored wording and authored order preserved; no AI summary substituted for lesson prose.
3. **Resume.** Return the learner to where they stopped, and let them read ahead or back.
4. **Work locally.** Correct lab download per lesson (Lesson 1 none, Lesson 2 its own kit, Lessons
   3–5 the shared kit), copy-exact command buttons, and plain statements that commands run in the
   learner's own terminal.
5. **Record actual work.** The 15 activities from `trial-activities.json`, placed beside their
   `source_heading`, with notes, prediction, observation, reflection. A submitted prediction is
   stored separately from any later correction.
6. **Save honestly.** Every field shows unsaved / saving / saved / failed to save. "Saved" appears
   only after the server acknowledges. A refresh and an app restart preserve acknowledged work.
7. **Export.** The owner's actual work with lesson, activity, content-version and release context,
   in a form they can send to the content author alongside `Owner_Review_After_Lesson_05.md`.
8. **Be usable.** Keyboard-operable navigation, notes, downloads, help and export. Works at 375px,
   768px and 1440px. Diagram meaning available as text.

## Explicit non-goals for this checkpoint

Submissions and attempt snapshots, reviewer queue, findings and responses, appeals, evidence schema
2.0, competency decisions, authentication and multi-user access, hosting, payments, editor
extensions, MCP integrations, model-generated review or tutoring. These stay on the roadmap behind
the checkpoint; the specifications remain the target, and nothing here may make them harder to add.

## Hard constraints — violating any of these is a defect, not a tradeoff

- **No execution of learner or lesson code.** Buttons download or copy; they never run anything.
  Code examples stay inert data, including HTML inside fences.
- **No false save.** Unacknowledged text is never labelled saved.
- **No rewritten history.** Importing a new content version must not overwrite an earlier recorded
  prediction or change the question it answered. Work is stored against lesson ID, content version,
  release ID and activity ID.
- **No fabricated feedback.** No scripted review presented as a real one, no hint ladders, rubrics,
  grades or competency awards that nobody authored.
- **No overstated claims.** "Studied", "practice recorded" and "feedback received" are the available
  states. None of them means HTTP mastery or engineering competence.
- **No cross-device promise.** Storage is on one machine and is documented as such.
- **Content is data.** Imported Markdown is sanitized on render; no raw HTML execution, no remote
  embeds, Mermaid in its safe configuration.

## Success criteria

The checkpoint is done when the owner can work through Lesson 5 end to end in the app, and the
twelve acceptance checks in `VS_Code_Coder_Handoff_v1.md` §6 each have an honest recorded result —
including the ones that fail or were not exercised.

## Known uncertainties to carry, not resolve

- Whether the five lessons teach well is a question for the owner review, not for this software.
- Native macOS/Windows lab execution and browser rendering of the lessons were never rehearsed by
  the author; our own verification must say what we actually ran.
- `specifications/Representative_Learning_Package_v1.zip` and the older `LS-HTTP-*` lesson IDs are
  historical context. They are not a second content release and must not be imported.
