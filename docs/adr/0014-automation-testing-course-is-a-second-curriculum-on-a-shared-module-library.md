# 0014. The automation testing course is a second curriculum on a shared module library

Date: 2026-11-03
Status: Accepted

## Context

The owner wants a second course: experienced manual testers with no coding background, taken to
mid-level test automation and QA engineering. About a third of the full-stack course's 68 modules
teach material this learner also needs — terminal, Git, JavaScript and TypeScript, HTML and the
DOM, HTTP, containers, CI. The 15 finished HTTP lessons sit in that overlap. A Lesson 5–15
correction reissue is pending, so any copied lesson would immediately need the same corrections
twice.

## Decision

The QA Automation Engineering course (ID `QAAE`) is a separate course with its own curriculum,
projects and outcomes. Both courses draw on one library of modules.

- **Shared modules are single-sourced.** A module used as-is by both courses is authored once and
  listed by both curricula. Corrections land once.
- **Bridged modules** reuse the shared lessons and add a short course-specific bridge lesson that
  frames them for a tester. The shared lesson is not edited for one audience.
- **New modules** are written for this course only. Programming foundations are new rather than
  shared: this learner's first programs check behaviour they used to check by hand, which changes
  every example.
- **Mobile testing is an optional track** inside the course, for learners who want it. It is not
  required for completion.
- Planning documents live in `docs/courses/qa-automation/` until the course's first release
  package carries them under its own `specifications/`.

## Alternatives considered

- **A track inside the full-stack curriculum.** Lost because the audiences, outcomes and capstones
  differ enough that one curriculum would carry two sets of rules everywhere.
- **A fully separate course with copied lessons.** Lost because every correction to a shared lesson
  would have to be made twice, and the two copies would drift.

## Consequences

Easier: the HTTP lessons and every future shared module serve two courses for one authoring cost.
Harder: the app serves one release of one course today, so it needs multi-course support before
this course can be read in it. A shared lesson's wording must stay audience-neutral, and the owner
reviews it once on behalf of both courses. Revisit if bridge lessons start rewriting most of a
shared module's content — that would mean the module should be split.
