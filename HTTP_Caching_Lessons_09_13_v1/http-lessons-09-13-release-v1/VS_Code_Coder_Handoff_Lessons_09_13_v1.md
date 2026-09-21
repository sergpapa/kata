# Coder handoff: add HTTP Lessons 9–13

## Requested change

Import five newly authored lessons into the existing course app, retaining its Engineering Practice visual design, navigation, reading experience, and learner state. Do not build a new app or replace the learning workspace with a release metadata index.

The course's canonical source is UTF-8 Markdown. Use `content/learning-release.json` for ordering, stable IDs, versions, source paths, source hashes, and lab associations. Paths in that manifest are relative to `content/`. It describes a complete first-thirteen content release, not an instruction to reset progress.

## Compatibility

| Content | Required behavior |
| --- | --- |
| Lessons 1–8 | Retain existing IDs, versions, source bytes, and associated state |
| Previous 24 activities | Retain IDs and saved responses; their supplied records are unchanged |
| Previous three lab downloads | Retain their exact supplied bytes and associations |
| Lessons 9–13 | Add LS-M021-01 through LS-M021-05 in course order 9–13 |
| New activities | Add ACT-M021-01-01 through ACT-M021-05-03, three per new lesson |
| New lab | Associate FSSE-HTTP-LAB-09-13 with all five new lessons |

Use the stable lesson ID for persistence, not list position or a release ID. M021 begins after M020: do not accidentally make “lesson 1” of M021 replace the first course lesson. Preserve any existing lesson drafts, observations, bookmarks, and progress while updating the content registry. If an app's existing source differs from a manifest hash, report the difference and preserve the local version until reconciled instead of silently replacing it.

No forced learning-state migration is required by this package. Authored availability, reading progress, reported practice, and independently demonstrated competency remain distinct concepts.

## Render the lessons

- Render the canonical body once, in its authored order. Preserve tables, fenced code, quotations, and the sequence diagram in Lesson 11.
- Parse YAML frontmatter as metadata. Do not show document IDs, draft versions, hashes, review status, lab IDs, or release administration as the student's opening content.
- Preserve descriptive source links and normal heading navigation. Code blocks must preserve quotes, backticks, indentation, and line breaks when copied.
- If your renderer supports Mermaid, render the supplied sequence diagram. Otherwise provide the adjacent explanation and a legible diagram fallback without a runtime error.
- Provide a clear lab download beside the relevant lesson. Keep the lab available locally; do not convert its Node server into arbitrary server-side execution on the course platform.
- Keep the current visual UI. The ZIP's `public/lab.html` is an exercise instrument inside the nested lab archive, not a new homepage template.

## Activity behavior

`content/trial-activities.json` contains the full 39-entry set. `source_heading` places an optional recording field beside an existing canonical section. `prompt_markdown` is an exact section excerpt for tools that need a standalone prompt; do not render it again when that section is already on screen.

Preserve the original prediction separately from a later explanation. Allow observations, explanations, and help-used notes without an answer embargo. Complete worked explanations remain visible through normal lesson navigation. Null grading and evidence-award fields are deliberate; importing these exercises must not manufacture scores or mastery claims.

Local runs are learner-reported unless another system actually verifies them. Label supplied examples as examples. Do not prefill the author's expected browser outcomes as if the learner observed them. The fixture's correct implementation and worked practice solution are intentionally available.

## Acceptance in your app

1. Import the registry and show all thirteen lessons in the specified order. Open 8 → 9 and 13 → the end of currently authored content; do not create empty lesson pages from planned curriculum entries.
2. Compare before/after state for an existing learner: same completed lessons, drafts, observations, and bookmarks. Re-importing the package must not duplicate records.
3. Inspect one table, the Lesson 11 diagram, and the Lesson 12 code block at desktop and narrow widths. Ensure code can scroll without truncation and keyboard focus remains visible.
4. Download the new lab and confirm its file hash matches the release manifest. A new extraction must contain baseline data and the intentionally incomplete practice file.
5. Enter a prediction and later observation, navigate away, reload the app, and confirm both remain attached to the correct stable activity ID. Existing records must remain intact.
6. Confirm the page does not expose author-only release metadata as the lesson's main content or award formal competency when a user selects “studied.”
7. Rehearse the browser-cache sequence in the lab's `Instructor_Notes.md` on an actual browser. Record version, settings, and observed behavior. Server test success alone is not this check.

Report actual integration changes and results, including any unverified step. There is no request to publish or deploy the app in this handoff.

## Read authority

`specifications/Release_Status_and_Sequence.md` supplies the current authored status. The earlier curriculum documents remain background specifications and are copied unchanged. Do not treat their older “planned” wording for M021-01 through M021-05 as overriding the new manifest. The authoring standard remains the quality contract; the graduate competency standard remains the outcome boundary.
