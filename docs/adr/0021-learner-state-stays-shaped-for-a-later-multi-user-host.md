# 0021. Learner state stays shaped so a later multi-user host is a migration, not a rewrite

Date: 2026-11-19
Status: Accepted

## Context

EduCode serves one learner on their own machine. The server listens on `127.0.0.1`, and there are no
accounts (`docs/brief.md` puts authentication, multi-user access and hosting out of scope). Two
students today means two clones, each with its own `data/educode.sqlite`. There is no hosting plan,
but the owner wants hosting to stay doable. Building accounts now would be work with no user. Letting
each new slice store learner state wherever is convenient would make a later host a rewrite.

## Decision

No accounts and no `learner_id` now. Every slice keeps these four rules, so that adding accounts later
is one migration plus one filter layer:

1. **Learner state lives only in the server's store.** Browser storage holds per-device preferences
   only (today: the feedback model choice). Files under `data/` hold nothing a learner wrote that the
   store does not also hold.
2. **Every learner-owned table is listed here.** A slice that adds one updates this list in the same
   commit. Today: `resume_point`, `course_resume_point`, `learner_response`,
   `learner_response_revision`, `feedback_conversation`, `feedback_usage`.
3. **Only the repository modules query the store.** Routes, export and feedback code call
   `responseRepository`, `resumeRepository`, `feedbackRepository` and the content repository; they
   never `prepare` SQL themselves. The later per-learner filter then goes in one layer.
4. **Feedback reaches Claude only through `FeedbackRunner`** (`modules/feedback/types.ts`). A hosted
   version can swap the Claude Code child process (ADR 0019) for a per-learner runner without
   changing the routes or the store.

## Alternatives considered

- **Add accounts and `learner_id` now.** Lost because nobody would use them, and every slice until a
  host exists would pay for the extra column, filter and isolation tests.
- **Do nothing and work it out at hosting time.** Lost because state that has drifted into browser
  storage, files or ad-hoc queries is found only by reading the whole codebase, and anything missed
  leaks one learner's work to another.

## Consequences

Easier: a later host adds a `learner_id` to the listed tables, filters in the repositories, and swaps
the runner; the list is the checklist for isolation tests. Harder: each slice spends a line keeping
the list current, and a convenience such as caching answers in the browser is ruled out. Not settled
here: how a hosted version authenticates, and who pays for feedback once it no longer runs on the
learner's own Claude Code; both need their own ADRs. Revisit when hosting is planned.
