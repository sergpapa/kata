# 0010. The resume point is a server-side pointer recorded silently, outside the acknowledged-save contract

Date: 2026-09-22
Status: Accepted

## Context

Milestone 1 slice 4 gives the app a resume point — the lesson last opened, which the dashboard's
card returns the learner to. The handoff's acceptance table requires the reading position to
survive refresh **and restart** in the supported mode. ADR 0004 governs recorded learner work with
four visible save states and compare-and-set writes, but that machinery is Milestone 2's and exists
to protect authored text from being lost or falsely labelled saved. A resume point carries no text
anyone wrote.

## Decision

The resume point is one row in SQLite (`resume_point`, single row, `candidate_lesson_id` plus
`recorded_at`), written silently when a lesson answers successfully, read by the dashboard, and
behind the repository boundary of ADR 0002. No UI state ever claims it was saved, so no claim can
be false; a failed write leaves the previous record standing. Writes are last-write-wins between
tabs. It stores no content version: work is pinned to the version it answered, but a pointer
follows the lesson across an authorized correction. A record naming a lesson the imported release
does not carry is answered as `none` and left in place, never deleted or rewritten.

## Alternatives considered

- **`localStorage`.** Rejected: per-browser, dies with cleared site data, invisible to the
  acceptance run that must prove restart survival, and ADR 0004 already records why browser
  storage is distrusted here.
- **Fold it into Milestone 2's acknowledged-save contract.** Rejected: four save states for a
  pointer nobody typed would put a "saved" claim on screen that means nothing, and it delays a
  Milestone 1 deliverable behind Milestone 2 machinery.
- **Compare-and-set writes.** Rejected: CAS exists so a second tab cannot erase work; overwriting
  a pointer loses nothing recoverable.

## Consequences

Easier: the restart acceptance check is provable server-side; Milestone 2's work tables arrive in
a database that already has a write path, a migration precedent (schema 3) and a tested repository
pattern. Harder: the server is no longer read-only, so tests must cover a malformed body and an
unknown lesson. Revisit if the app ever serves more than one learner, which would key the pointer
by user, or if within-lesson resume is ever asked for, which would reopen the granularity decision
recorded in the slice spec.
