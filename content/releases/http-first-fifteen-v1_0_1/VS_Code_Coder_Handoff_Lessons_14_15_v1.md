# Coder handoff: Lessons 14–15

Current release: 1.0.1-draft. Apply the accepted corrections described in `CONTENT_CORRECTIONS_1_0_1.md` when importing this cumulative package. This note supersedes the earlier requirement to keep Lesson 2 and Lesson 7 at version 1.0.0-draft.

## Import into the current app

Add the two new canonical Markdown lessons and their shared lab download. Retain the existing Engineering Practice design, reading layout, navigation, and saved learner state. Keep release administration out of the student-facing lesson opening.

`content/learning-release.json` is the complete first-fifteen registry. Its paths are relative to `content/`. Lesson order, stable IDs, titles, versions, lab relationships, and hashes are explicit. Stable IDs determine persistence; do not use course position or release ID as a replacement identity.

| Existing or new material | Required handling |
| --- | --- |
| Lessons 1–13 | Lessons 2 and 7 advance to 1.0.1-draft; the other sources remain unchanged; preserve all stable IDs and study records |
| Prior 39 activity records | Six lesson-version references advance for Lessons 2 and 7; preserve IDs, prompts, saved responses, and original attempt provenance |
| Four prior lab archives | Lesson 2 and Lessons 6–8 kits advance to 1.0.1-draft with corrected bundled lesson copies; the other two archives remain unchanged |
| Lesson 14 | Add LS-M021-06, order 14 |
| Lesson 15 | Add LS-M021-07, order 15 |
| Six new activities | Add ACT-M021-06-01 through ACT-M021-07-03 |
| New lab | Add FSSE-HTTP-LAB-14-15 for both lessons |

Use `content-corrections.json` to recognize the authorized old-to-new hashes for Lessons 2 and 7 and their kits. If locally edited content matches neither the approved earlier hash nor the supplied current hash, preserve that work and report the conflict rather than silently replacing it. Re-importing this release must not duplicate activities, reset progress, or discard drafts and observations. Do not rewrite the lesson version attached to a historical learner attempt.

## Preserve the exercise design

The new downloadable kit has two deliberate defects and a skipped learner regression worksheet. These are the required starting state. Do not repair, transpile, rewrite, or automatically execute them while importing the content. Keep its lab ZIP byte-for-byte as supplied.

Reference fixes and completed regression examples are intentionally available. Their relative imports are written for the destination files described by the README; they are not independent executable modules in the reference directory. Preserve that explanation.

The lesson sequence teaches what each failure means. Do not replace the starter with the passing reference in pursuit of an all-green import. Conversely, do not hide the full walkthrough or impose a waiting period before it may be read.

The local `public/lab.html` is an observation instrument within the kit. It is not a course UI replacement. The platform does not execute arbitrary learner code or install submitted dependencies.

## Rendering and activity records

Render the canonical Markdown once, in order. Preserve code, shell command boundaries, tables, quotations, and descriptive links. Parse YAML metadata separately. Student lesson content should not begin with hashes, document IDs, release versions, or verification administration.

`trial-activities.json` supplies optional recording entry points at exact `source_heading` values. Its `prompt_markdown` is a section excerpt for tools that need it; do not duplicate that prose when it is already rendered in the lesson. Keep predictions separate from later observations and explanations. Record help used without treating setup assistance as conceptual dependence.

The grading and formal-evidence-award fields are intentionally null. No automatic mastery or runtime verification should be inferred from studying a solution, marking a lesson studied, importing an author's capture, or downloading a kit. The supplied actual CLI captures are author evidence, not learner evidence or browser recordings.

## Acceptance

1. Show all 15 authored lessons in order, apply the two approved lesson patch versions, and preserve the other versions. Navigate correctly from 13 to 14 and from 14 to 15. Do not create empty lesson pages from planned entries.
2. Confirm an existing learner's progress, drafts, bookmarks, and activity responses survive an import and a second identical import.
3. Render code and tables at desktop and narrow widths; ensure copy actions preserve quotes, backticks, and actual newlines. Keyboard navigation and focus should remain usable.
4. Download the new archive and compare its SHA-256 with the registry. Confirm the starter still has its intended defects and the worksheet is skipped, while the worked repairs remain separate.
5. Record a prediction and later explanation in a new activity, reload, and confirm their identities and values remain intact. Earlier records must also remain attached to their original IDs.
6. Ensure authored scenario messages, actual author CLI captures, expected browser outcomes, and learner observations are not merged into one claimed evidence source.
7. Perform the browser steps in the lab's `Instructor_Notes.md` if browser rehearsal is part of your integration acceptance. Record actual version/settings/results; Node tests do not satisfy this check.
8. Parse all five current lesson Mermaid blocks with the app's pinned Mermaid version. Render Lesson 2 in the lesson component and confirm the corrected line appears in the diagram. Keep the readable fallback for unexpected future failures, but do not mark a fallback as a passed render check.

Report the changes actually made and any unverified step. This handoff authorizes content integration into the existing local app; it does not request publication or deployment.

## Sequence authority

M021-06 is diagnosis. M021-07 is repair, regression, and defence, with supported transfer practice. M021-08 and M021-09 remain later review and fresh independent transfer. The current status note resolves the looser “14–15 investigation and transfer” shorthand in the preceding release without renumbering any stable lesson ID.
