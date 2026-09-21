# Verification and known limits

Date: 2026-09-21. Status: authored review candidate.

## Actual new-kit checks

| Check | Observed result |
| --- | --- |
| Environment | Linux; Node.js v24.19.0; curl 8.5.0 |
| Original incident suite | 17 passed, 5 expected failures |
| Worked incident repair | 22 passed, 0 failed |
| Original transfer suite | 3 passed, 5 expected failures |
| Worked transfer repair | 8 passed, 0 failed |
| Distributed regression worksheet | 1 skipped; no pass claimed |
| Completed regression before/after incident repair | 1 meaningful failure, then 1 pass |
| Always-200 alternative | Rejected by 9 incident checks |
| Hash-whole-source alternative | Rejected by 3 local stability/selection checks |
| CLI rehearsal | 20 exchanges, covering original/repaired incident and both transfer request orders |
| Reset and lifecycle | Baseline restored data while preserving edits/observations; show was read only; six owned server processes shut down cleanly |

The local HTTP suites exercise behavior rather than requiring the reference solution's hash algorithm. The transfer accepts removing the internal saved-result optimization if correct selection and stable conditional reuse remain. Hash-whole-source failures must not be misreported as identical to the original false-validation correctness defect.

The lab contains `author-verification.json` and actual author CLI response captures under `reference/author-captures.json`. The captures exclude the observation-page HTML/script and label their provenance. They are not learner observations or actual browser results.

## Package and extraction

`package-verification.json` records hash checks, stable IDs, lesson order, exact activity headings/excerpts, Markdown fences, archive integrity, and unchanged inherited content. It also records checking the starter and worked repairs from a fresh extraction of the new lab archive. Earlier kit runtimes were not re-run merely because their unchanged archives are included again.

## Explicit limits

- **Browser-cache rehearsal:** not performed. The installed browser automation package points to a missing Chromium binary. Expected browser behavior is explained and an actual rehearsal procedure is supplied.
- **Native Windows/macOS:** not performed. The PowerShell curl distinction is documented; portable-looking commands are not evidence of execution on those systems.
- **Course-app integration:** not performed here. The separate coder must check import, rendering, persistence, and downloads in the existing app.
- **Learner review and competence:** no new learner execution or mastery is asserted. The user's reported positive content review covers Lessons 1–4.
- **Future lessons:** review/revision and fresh independent transfer remain planned. Supported transfer within Lesson 15 does not complete those later lessons.

The live browser page has no custom response cache, service worker, or external network target. The course platform does not execute learner uploads. The deliberately faulty code remains limited to the local exercise starter and is identified in its instructions.
