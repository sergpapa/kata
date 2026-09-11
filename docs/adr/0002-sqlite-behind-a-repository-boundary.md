# 0002. Store records in SQLite behind a repository boundary

Date: 2026-09-11
Status: Accepted

## Context

The checkpoint needs durable, acknowledged writes on one machine with no server to administer. The
supplied architecture proposes PostgreSQL for P1 (its ADR-02) because attempts, versions, evidence
and appeals need relationships, constraints and atomic state changes. Those needs are real later;
none of them are exercised by a single owner recording notes against five lessons.

## Decision

SQLite (`better-sqlite3`) as the record store, in a file under the app's data directory. All access
goes through a repository module per domain area — `content`, `learning`, `lifecycle` — and no SQL
appears outside those modules. Schema changes are numbered forward-only migration files.

## Alternatives considered

- **PostgreSQL now.** Rejected: it makes the owner install and run a database server to read five
  lessons, and buys nothing this checkpoint uses.
- **JSON files on disk.** Rejected: no atomic multi-row write, no constraint enforcement, and a
  crash mid-write can lose acknowledged work — which is the one thing the brief forbids.
- **`node:sqlite` built into Node 22.** Rejected: still flagged experimental on this runtime; a
  pinned library is the boring choice.

## Consequences

Pinned at `better-sqlite3@^12.11.1`. Version 13.0.3 was tried first and its `win32-x64` prebuild
segfaults on this machine (Node 22.13.0, exit `0xC0000005`) on the first `new Database(':memory:')`,
both under Vitest and under a bare `node -e`. 12.11.1 opens, migrates and queries normally. Recheck
13.x after a Node upgrade before moving the pin.

Easier: one file to back up, one file to delete, no service to run, real transactions.
Harder: `better-sqlite3` is a native module, so a Node major-version upgrade needs a rebuild. The
repository boundary is what keeps the PostgreSQL move a rewrite of three modules rather than of the
application. Revisit when a second user or a hosted deployment arrives.
