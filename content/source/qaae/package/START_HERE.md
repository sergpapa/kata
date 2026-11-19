# QA Automation Engineering — module Q01 release

Package `QAAE-Q01`, version `1.1.0-draft`, 2026-11-19. It supersedes `QAAE-LESSON-01@1.0.0-draft`
and completes module Q01 of the QA Automation Engineering course (ADR 0023). It was authored in this
repository (ADR 0013) and built with `npm run release:build` from `content/source/qaae/`.

## What it contains

| Order | Lesson | ID | Kit |
| --- | --- | --- | --- |
| 1 | Lesson 1: What changes when a machine runs your test? | `LS-Q01-01` | none |
| 2 | Set up a safe workspace | `LS-M001-01` | `Workspace_Check_Kit_v1.zip` |
| 3 | When something goes wrong | `LS-M001-02` | `Workspace_Check_Kit_v1.zip` |
| 4 | Lesson 4: Run a test someone else wrote | `LS-Q01-02` | `QAAE_First_Run_Kit_v1.zip` |
| 5 | Lesson 5: How good are your tests? | `LS-Q01-03` | `QAAE_Sample_Grading_Kit_v1.zip` |

- The two M001 lessons are shared with the full-stack course. They carry no lesson number, because
  their position differs per course, and they ship in this release only for now.
- Lesson 5's kit is a sample grading kit: one good build and six fault builds of a small booking
  site, graded with Node.js alone. The full kit arrives with the practice application.
- `content/trial-activities.json` holds 24 activities: Lesson 1's three and 21 for the new lessons.
- `release-changes.json` names every lesson, kit and file that changed or was added, with its
  version and hash.

## Status

An owner-review candidate. The owner has not read the four new lessons, and no learner has used
them. What was checked, and what was not, is in `Verification_and_Known_Limits.md`.
