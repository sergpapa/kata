# QA Automation Engineering — modules Q01 and Q02 release

Package `QAAE-Q02`, version `1.2.1-draft`, 2026-11-20. It supersedes `QAAE-Q02@1.2.0-draft`, whose
Lesson 1 diagram it redraws, and `QAAE-Q01@1.1.0-draft` before it. It adds module Q02, "Terminal
and local program operation", to the QA Automation Engineering course. It was authored in this
repository (ADR 0013) and built with `npm run release:build` from `content/source/qaae/`.

## What it contains

| Order | Lesson | ID | Kit |
| --- | --- | --- | --- |
| 1 | Lesson 1: What changes when a machine runs your test? | `LS-Q01-01` | none |
| 2 | Set up a safe workspace | `LS-M001-01` | `Workspace_Check_Kit_v1.zip` |
| 3 | When something goes wrong | `LS-M001-02` | `Workspace_Check_Kit_v1.zip` |
| 4 | Lesson 4: Run a test someone else wrote | `LS-Q01-02` | `QAAE_First_Run_Kit_v1.zip` |
| 5 | Lesson 5: How good are your tests? | `LS-Q01-03` | `QAAE_Sample_Grading_Kit_v1.zip` |
| 6 | Where the terminal is standing | `LS-M002-01` | `Terminal_Practice_Kit_v1.zip` |
| 7 | What a program receives | `LS-M002-02` | `Terminal_Practice_Kit_v1.zip` |
| 8 | Change files without regret | `LS-M002-03` | `Terminal_Practice_Kit_v1.zip` |
| 9 | Output, messages and the exit code | `LS-M002-04` | `Terminal_Practice_Kit_v1.zip` |
| 10 | The settings a program is handed | `LS-M002-05` | `Terminal_Practice_Kit_v1.zip` |
| 11 | Programs that keep running | `LS-M002-06` | `Terminal_Practice_Kit_v1.zip` |
| 12 | It worked on their computer | `LS-M002-07` | `Terminal_Practice_Kit_v1.zip` |

- Module Q02 is the full-stack course's module M002, shared unchanged, so its lessons carry M002
  IDs and no lesson number. Like the M001 lessons, they ship in this release only for now.
- The seven M002 lessons teach Windows PowerShell beside bash and zsh (ADR 0024). Where the typing
  differs, a lesson shows one block per shell family, with the shell's name on the line above.
- One kit serves all seven: `M002-LAB-01`, eight Node.js programs with no packages to install.
  `data/archive/orders 2025.csv` has a space in its name on purpose.
- `content/trial-activities.json` holds 59 activities: Q01's 24 and five for each M002 lesson.
- `release-changes.json` names every lesson, kit and file that changed or was added, with its
  version and hash.

## Status

An owner-review candidate. The owner has not read the seven M002 lessons, or Q01's four newer
ones, and no learner has used them. Six checks in the M002 lessons need a person at a keyboard.
What was checked, and what was not, is in `Verification_and_Known_Limits.md`.
