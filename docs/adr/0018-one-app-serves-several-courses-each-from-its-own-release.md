# 0018. One app serves several courses, each from its own release

Date: 2026-11-03
Status: Accepted

## Context

ADR 0014 adds a second course. The app was built for one: one configured release directory, a
single-row resume point, unscoped API and page addresses. The two courses will later share lessons,
and the owner decided that a shared lesson keeps one set of answers wherever it is read. Learner
work is keyed by activity ID (ADR 0011). So an activity ID reused by two courses for different
activities would silently merge two people's answers into one record.

## Decision

- **A fixed course list in `config.ts`**, in order, each with an ID, a title and its own release
  directory. Each release is verified on every start, independently. A refusal refuses one course,
  never the app.
- **A release must name its course.** Its `release_id` starts with `<courseId>-`.
- **Cross-course identity is checked before anything is stored.** A later course is refused if it
  reuses an earlier course's activity ID for another lesson, or its lesson ID for another document.
  Reuse with the same meaning is a shared lesson and is allowed.
- **Addresses are scoped.** The API sits under `/api/courses/:courseId/` and pages under
  `/courses/:courseId/`. The old `/lessons/:id` page address forwards to the full-stack course.
- **Learner work tables are unchanged.** Shared work falls out of keying by activity. Provenance is
  stamped from the course a save came through.
- **The resume point becomes one row per course.** The existing row moves to `FSSE`.

## Alternatives considered

- **Keep the unscoped API for the full-stack course and scope only the new one.** Lost because two
  address shapes for the same thing is a permanent special case, and every new endpoint would have
  to choose between them.
- **Add the course to every learner-work key.** Lost because the owner chose shared work, and it
  would migrate the tables holding the owner's answers for no benefit.
- **Discover courses by scanning `content/releases/`.** Lost because which release is current is a
  deliberate act (release-packaging spec C14), not whatever directory is newest.

## Consequences

Easier: a third course is a config entry and a release. Shared lessons need no further data-model
work. Harder: every endpoint and page carries a course, and about 127 test URLs move with it.
Revisit if the owner wants a shared lesson answered separately per course. That would mean adding
the course to the learner-work key, with a migration.
