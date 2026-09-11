# 0001. Ship the first checkpoint as a local single-machine application

Date: 2026-09-11
Status: Accepted

## Context

`VS_Code_Coder_Handoff_v1.md` §3 permits durable storage on the owner's own machine as a first
delivery mode, provided it is clearly documented and makes no cross-device promise. The full P1
specification requires managed identity, private object storage, an approved data policy and named
review staffing before real work is collected from anyone. The checkpoint has exactly one learner —
the owner — and its purpose is a learning rehearsal through Lesson 5.

## Decision

The application runs on the owner's machine: a local Node server plus a local browser client, no
accounts, no network dependency, no hosted infrastructure. The UI states that work is stored on this
computer only. Nothing is deployed and no third-party service is provisioned.

## Alternatives considered

- **Hosted multi-user P1 now.** Rejected: authentication, private storage and an approved data
  policy are prerequisites for collecting real work, and building them delays the Lesson 5
  rehearsal that the whole package exists to reach. It also starts a monthly charge.
- **Browser-only page with IndexedDB.** Rejected: the architecture calls device-local state a
  prototype mechanism (ADR-12 in the supplied plan) that P1 must replace, and an honest
  acknowledged-save state is hard to demonstrate without a server that acknowledges.

## Consequences

Easier: zero cost, no auth surface, no data policy blocker, fast to run and to rehearse.
Harder: no cross-device recovery, no second user, no reviewer workflow — all deliberately out of
scope. Revisit when a second person needs access, or when real learner work beyond the owner's own
is to be collected; that is a new ADR covering identity, storage and data policy together.
