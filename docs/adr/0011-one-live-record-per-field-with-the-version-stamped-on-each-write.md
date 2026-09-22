# 0011. Learner work is one live record per field, with the content version stamped on each write

Date: 2026-09-22
Status: Accepted

## Context

ADR 0004 fixed that every recorded field is a server write under compare-and-set. It did not fix
the record's key. `docs/brief.md` requires work to be stored "against lesson ID, content version,
and release ID", and the handoff's acceptance table requires that when content is updated, "old
submitted work retains its original context; a new version does not rewrite history". Those two
sentences can be read as making the content version part of the key.

The app has already taken an authorized correction once: the 1.0.1 reissue changed the bytes and the
`content_version` of two shipped lessons, with the transition pinned in `content-corrections.json`.
More will arrive. Whatever this decision says will be lived through, not hypothesised about.

If the content version were part of the key, the day a lesson is corrected the owner opens it and
finds an empty box where their answer was. The answer is not gone — it is filed under a version
string they never saw and cannot navigate to — but the app has to grow a second, read-only surface
to show it to them, and until that surface exists a correction looks exactly like data loss.

## Decision

The live record is keyed by `(activity_id, field_name)`. There is exactly one of them per field, and
it is what the reader edits. Every accepted write stamps onto that record the `candidate_lesson_id`,
`content_version` and `release_id` the server reads from the imported release **at the moment of the
write** — never anything the client supplied. That stamp is the provenance the export carries.

An authorized correction therefore leaves the owner's answer on screen and editable. The record's
stamp moves to the new version on the next write, which is true: that write did answer the new
version.

"A new version does not rewrite history" is honoured by the revision history, not by the key. The
next slice makes an acknowledged prediction its own immutable revision; each revision carries the
version it was written under, so the record of what was answered when survives independently of
which version the live record currently names.

## Alternatives considered

- **Key by `(activity_id, field_name, content_version)`.** Rejected for this slice: it is the
  strictest reading of "pinned to the version it answered", but it makes a correction present as an
  empty box, and it needs a second read-only surface built in the same slice to stay honest. It also
  puts the version in the identity of a record whose whole purpose is to be edited, so an ordinary
  correction silently forks the learner's work into two live records neither of which is complete.
- **Store no version at all.** Rejected: the owner review needs to know which wording an answer was
  written against, and an export without that context cannot be read by the content author.
- **Let the client send the version.** Rejected: it is provenance, and a client that gets it wrong
  produces a record that is worse than no record. The server knows which release it imported.

## Consequences

Easier: a correction never looks like loss; the live record has one row per field, so the reader's
box, the conflict path and the export all read the same place. Harder: the live stamp names the
version of the _latest_ write, not of the first, so anybody reading a single record must not mistake
it for the full answer history — the revision table the next slice adds is where that lives, and
until it exists the export can only claim what the stamp actually means. Revisit if the app ever has
to show, side by side, what the owner answered under two versions of the same lesson; that is a
presentation change over the revision history, not a change to this key.
