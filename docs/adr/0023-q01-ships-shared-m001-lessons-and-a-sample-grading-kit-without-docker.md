# 0023. Q01 ships shared M001 lessons and a sample grading kit, without Docker

Date: 2026-11-19
Status: Accepted

## Context

The QA course's first module, Q01, was planned as "Bridged (M001)": the full-stack course's
orientation module plus a tester's bridge, ending with "a working workspace that has run one
grading pass" (`docs/courses/qa-automation/Module_Syllabus_v0_1.md`). When the owner asked for the
rest of Q01 to be drafted, three things that plan depends on did not exist:

- **M001 had no lessons** in either course. Its topic list exists
  (`Curriculum_Architecture_v1_1.md`), but no lesson-level plan.
- **The grading kit had nothing to grade against.** ADR 0016's kit runs a suite against container
  builds of BookingLab, and the BookingLab specification has not been written.
- **Docker had no use until Q20.** The syllabus installs it in Q01. The course's own teaching
  contract says "no tool before its problem".

The owner decided all three on 2026-11-19.

## Decision

1. **The M001 material is written once, as shared lessons, and ships first in the QA release
   only.** `LS-M001-01` ("Set up a safe workspace") and `LS-M001-02` ("When something goes wrong")
   are audience-neutral and refer to no earlier lesson of either course. ADR 0018 already treats
   one lesson ID in two releases as one shared lesson with one set of answers, so the full-stack
   release can add the same files later, unchanged. Their titles carry no lesson number, because
   their position differs per course.
2. **Q01's grading lesson uses a sample grading kit that needs only Node.js.** It serves one good
   build and six fault builds of a small booking site from one program, runs the learner's suite
   against each, repeats the good build three times, reports caught and missed faults by category,
   and writes a results file with a hash of each test file. It follows ADR 0016's reporting rules.
   It departs from ADR 0016 in one way: the faults are readable in the kit's source, not sealed in
   images. The lesson says so. ADR 0016's kit replaces it when BookingLab R0 exists.
3. **Docker is installed in the lesson that first uses it**, not in Q01. Q01's workspace check
   reports memory and free disk space, and the learner records them.
4. **Three Q01 topics are deferred, and one is narrowed.** Deferred: the Codespaces appendix (ADR
   0016 ties its one test to the real kit), what the entry diagnostic credits (the diagnostic does
   not exist yet), and the portfolio repository template (it needs Git, taught in Q03, and
   BookingLab). Narrowed: "minimum hardware" becomes the workspace check's memory and disk report
   plus Playwright's own system requirements. BookingLab's needs are stated when it exists.

Q01 in course order is therefore: `LS-Q01-01`, `LS-M001-01`, `LS-M001-02`, `LS-Q01-02` ("Run a test
someone else wrote"), `LS-Q01-03` ("How good are your tests?").

## Alternatives considered

- **Write the M001 topics as QA-only text.** Lost because Q01 would have to drop that text and be
  reissued when the full-stack M001 is written.
- **Add the M001 lessons to the full-stack release now.** Lost because it forces a full-stack
  reissue in the same slice for lessons that course does not need yet.
- **Defer the grading lesson until the real kit exists.** Lost because Lesson 1 promises grading
  by planted defects, and the idea can be taught honestly on a small real kit today.
- **Describe the planned kit as if it existed.** Lost because its commands and output would be
  invented.
- **Install Docker in Q01 as planned.** Lost because nothing would use it for nineteen modules.

## Consequences

Easier: Q01 is complete and runnable today, with no dependency on BookingLab. The full-stack
course gets two M001 lessons for no further authoring cost.

Harder: the shared lessons cannot open with a scene from testing life, which the QA teaching
contract asks of every lesson. The Q01 lessons around them carry that. The sample kit is a second
grading program to keep working until the real one replaces it. The module syllabus and ADR 0016
now describe a plan that Q01 departs from, so the syllabus needs a revision when the owner reviews
these lessons. Revisit if the full-stack course, when it reaches M001, needs wording the QA
learner should not see: that would mean the lessons are bridged, not shared.
