# QA Automation Engineering — Lesson 1 release

Package `QAAE-LESSON-01`, version `1.0.0-draft`, 2026-11-03. This is the first release of the QA
Automation Engineering course (ADR 0014), authored in this repository (ADR 0013).

## What it contains

- `content/lessons/QAAE_Lesson_01_Student_Edition_v1.md`: Lesson 1, "What changes when a machine
  runs your test?" (`LS-Q01-01`, module Q01). It is a reading lesson. There is no lab kit and
  nothing to install.
- `content/trial-activities.json`: three activities, one beside each practice section.
- `content/learning-release.json`: the manifest the app imports and verifies.

## Status

An owner-review candidate. It has not been read by the owner or tested by any learner. The checks
that were run, and the ones that were not, are listed in `Verification_and_Known_Limits.md`.

## How it was built

By hand, once, because the packaging tool (`npm run release:build`) builds a release only from a
previous one. Every hash was computed by a script, not typed. The app's importer proves the result
on every start. Later QA releases are seeded from this package with `npm run release:seed`.
