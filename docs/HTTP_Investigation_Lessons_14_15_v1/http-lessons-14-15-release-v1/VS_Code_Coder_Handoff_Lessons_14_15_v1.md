# Coder handoff: Lessons 14–15

## Import into the current app

Add the two new canonical Markdown lessons and their shared lab download. Retain the existing Engineering Practice design, reading layout, navigation, and saved learner state. Keep release administration out of the student-facing lesson opening.

`content/learning-release.json` is the complete first-fifteen registry. Its paths are relative to `content/`. Lesson order, stable IDs, titles, versions, lab relationships, and hashes are explicit. Stable IDs determine persistence; do not use course position or release ID as a replacement identity.

| Existing or new material | Required handling |
| --- | --- |
| Lessons 1–13 | Same bytes, IDs, versions, and study records |
| Prior 39 activity records | Preserve stored responses and record identity |
| Four prior lab archives | Keep supplied bytes and associations |
| Lesson 14 | Add LS-M021-06, order 14 |
| Lesson 15 | Add LS-M021-07, order 15 |
| Six new activities | Add ACT-M021-06-01 through ACT-M021-07-03 |
| New lab | Add FSSE-HTTP-LAB-14-15 for both lessons |

If locally edited content differs from a supplied hash, preserve that work and report the conflict rather than silently replacing it. Re-importing this release must not duplicate activities, reset progress, or discard drafts and observations.

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

1. Show all 15 authored lessons in order and preserve the 13 earlier lesson versions. Navigate correctly from 13 to 14 and from 14 to 15. Do not create empty lesson pages from planned entries.
2. Confirm an existing learner's progress, drafts, bookmarks, and activity responses survive an import and a second identical import.
3. Render code and tables at desktop and narrow widths; ensure copy actions preserve quotes, backticks, and actual newlines. Keyboard navigation and focus should remain usable.
4. Download the new archive and compare its SHA-256 with the registry. Confirm the starter still has its intended defects and the worksheet is skipped, while the worked repairs remain separate.
5. Record a prediction and later explanation in a new activity, reload, and confirm their identities and values remain intact. Earlier records must also remain attached to their original IDs.
6. Ensure authored scenario messages, actual author CLI captures, expected browser outcomes, and learner observations are not merged into one claimed evidence source.
7. Perform the browser steps in the lab's `Instructor_Notes.md` if browser rehearsal is part of your integration acceptance. Record actual version/settings/results; Node tests do not satisfy this check.

Report the changes actually made and any unverified step. This handoff authorizes content integration into the existing local app; it does not request publication or deployment.

## Sequence authority

M021-06 is diagnosis. M021-07 is repair, regression, and defence, with supported transfer practice. M021-08 and M021-09 remain later review and fresh independent transfer. The current status note resolves the looser “14–15 investigation and transfer” shorthand in the preceding release without renumbering any stable lesson ID.
