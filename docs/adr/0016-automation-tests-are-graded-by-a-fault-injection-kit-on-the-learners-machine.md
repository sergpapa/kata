# 0016. Automation tests are graded by a fault-injection kit on the learner's machine

Date: 2026-11-03
Status: Accepted

## Context

A passing test suite proves nothing about whether it catches bugs. The objective measure is
mutation testing, also called fault injection: run the suite against a known-good build of the
application, where it should pass, and against builds with planted faults, where it should fail.
That means running the learner's code. The app has a hard rule against running learner or lesson
code (brief; ADR 0005). Playwright cannot run inside a web page, because it is a Node program that
launches real browsers from outside.

## Decision

Grading ships as a **grading kit inside the learner's portfolio repository**, downloaded once in
the setup module and updated with `git pull` when a new release of the practice application
arrives.

- One command (`npm run grade <lesson>`) starts the known-good build and each fault build, runs the
  learner's suite against each, repeats the known-good run to detect flakiness, and writes a
  results file.
- Fault builds ship as built container images, not source diffs, so the planted fault is not
  readable at a glance.
- The results file records the kit version, fault-set ID, a hash of each test file and every
  outcome. The learner imports it into the app, which displays it and runs nothing.
- Reporting is "caught 7 of 10; missed: double booking, two permission faults" — the fault
  category, never its location, unless the learner asks for a stronger hint (H-levels apply).
- **Fallback for locked-down laptops:** a `.devcontainer/devcontainer.json` lets the same kit run
  unchanged in GitHub Codespaces on the learner's own account. It is documented on one appendix page
  and tested once, when the kit is first built.

## Alternatives considered

- **Hosted grading servers.** Lost because every grading run by every learner would be a recurring
  container-minute charge to the owner, and the app is not hosted.
- **Let the app run the tests.** Lost because it reverses a hard constraint and turns a reader into
  a code runner.

## Consequences

Easier: grading is objective, free to operate, and measures the skill employers hire for. Running a
suite locally is itself course material. Harder: the practice application and its fault builds are
a software product the course must build, version and maintain. A determined learner can inspect
images or edit a results file. That is acceptable for self-study, so results are never presented
as an assessment. Revisit if the course is offered for certification.
