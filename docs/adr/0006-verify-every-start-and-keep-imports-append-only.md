# 0006. Verify the release on every start, and keep imported content append-only

Date: 2026-09-11
Status: Accepted

## Context

ADR 0005 settled what an import must check. It did not settle three things the first importer forced
us to answer: when verification runs, what a refusal does to a running app, and how a second version
of a lesson sits beside the first.

The brief forbids rewritten history — "importing a new content version must not overwrite an earlier
recorded prediction or change the question it answered" — and work is to be stored against lesson
ID, content version, release ID and activity ID. Nothing records work yet, but the rows those
records will point at are created here, so the shape has to be right before there is anything to
lose.

## Decision

**Verification runs on every start, against the bytes on disk at that moment.** There is no "it
verified last time" shortcut. Storing is idempotent: a release whose manifest hashes to a value
already stored is recognised and nothing is written, which is what makes re-verifying cheap enough
to do every time.

**A refused release does not stop the app.** The server starts, `GET /api/release` answers 200 with
`state: "failed"` and the named reason, and the page states which file failed. Zero lessons are
stored; nothing is filled in with substitute content.

**Content rows are append-only, keyed by the release row, `candidate_lesson_id` and content
version.** A release is stored whole, identified by `(release_id, version, manifest_sha256)`. Any
byte-level change anywhere in the release changes the manifest hash, so a revised release becomes a
second release beside the first rather than an overwrite. The lesson's stable key is
`candidate_lesson_id` from the file's own front matter; the manifest's `lesson_id` is cross-checked
against it and a conflict is an import error (handoff §4).

Lesson Markdown and the activity file are stored as text. Lab kits are stored by reference — path,
version, hash and byte size — because nothing downloads them until Milestone 3 and the zips are
large enough that putting them in the learner's database file would be a cost with no buyer yet.

YAML front matter is parsed with the `yaml` package rather than by hand: the blocks contain nested
lists and quoted scalars, which is exactly what a subset parser reads wrongly and silently.

## Alternatives considered

- **Import once and trust the record.** Rejected: verification is a claim about bytes, and a claim
  about bytes from last Tuesday is not one. The check costs a few milliseconds on eight files.
- **Exit on a refused release.** Rejected: it puts the only explanation in a terminal the owner may
  never read, and leaves them with an app that will not start rather than one that says why.
- **Upsert lesson rows by `(candidate_lesson_id, content_version)`.** Rejected: the first time an
  author revises a lesson without bumping its version, an upsert silently rewrites the text a
  recorded prediction was answering. That is the failure the brief names as a defect.
- **Deduplicate unchanged lessons across releases via a join table.** Rejected for now: it saves
  perhaps 150KB per release version and costs a level of indirection in every later query. Revisit
  if releases ever arrive often enough for that to matter.

## Consequences

Easier: an import is provable at any moment by restarting; a refused release is visible and
diagnosable rather than silent; no stored row is ever rewritten, so later work can point at one
safely.

Harder: a revised release duplicates the lessons that did not change, so the database grows by a
whole release each time one is reissued. Every start pays the cost of hashing the release — about
8MB for the supplied package, which is imperceptible locally and would need revisiting if this ever
became a hosted multi-tenant service.
