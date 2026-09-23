# 0012. Every accepted write that changes the text is an append-only revision

Date: 2026-09-23
Status: Accepted

## Context

ADR 0011 keyed learner work by `(activity_id, field_name)` and stamped the content version on each
accepted write, and it deferred one thing by name: "'A new version does not rewrite history' is
honoured by the revision history, not by the key. The next slice makes an acknowledged prediction
its own immutable revision." This is that slice, and this is the shape of that history.

Three documents ask for it in the same words. `docs/brief.md` makes "**No rewritten history**" a hard
constraint — "Importing a new content version must not overwrite an earlier recorded prediction or
change the question it answered" — and item 5 of what the checkpoint must do says "A submitted
prediction is stored separately from any later correction". `VS_Code_Coder_Handoff_v1.md` §"Records
and versioning" says the same about an earlier submitted attempt. The author's own
`prediction_policy` in `trial-activities.json` says "Keep the original acknowledged prediction
separate from later explanation".

Under ADR 0011 alone, none of that is true of the text: the live record's text is replaced on every
accepted write, so the sentence somebody committed to before they knew the answer is gone the moment
they correct it. Only its provenance stamp survives, and that stamp moves to the version of the
_latest_ write.

## Decision

**Every accepted write whose text differs from what the field's newest revision holds appends one
row to `learner_response_revision`, and nothing ever edits or deletes one.** The row carries the
revision number the live record took from that write, the text character for character, and the
`candidate_lesson_id`, `content_version` and `release_id` the server stamped on the live write.

`learner_response` is untouched. It stays the one live record per field, keyed and written exactly
as ADR 0011 and ADR 0004 describe, and it stays what the reader edits. The append happens inside the
same `db.transaction` as the conditional write that decided the outcome, so there is no state in
which the live record moved and the history did not.

**A write whose text is character-for-character the newest revision's appends nothing.** It is still
accepted and the reader is still told `saved` — nothing about the acknowledgement changes. Nothing
about the _work_ changed either, so there is no new version of it to record.

This holds for all four declared fields, not for `prediction` alone. The mechanism is identical, the
brief's constraint is not scoped to predictions, and an owner who rewrites an observation has lost
the earlier one for good under any narrower rule.

The invariant that follows, and that the tests pin: **the live record's text always equals the text
of the newest revision row for that field.** A write that changed the text appended that text; a
write that did not append left the text equal to the previous row's.

## Alternatives considered

- **Make `learner_response` itself append-only, with the live row being `MAX(revision)`.** Rejected:
  it rewrites the `(activity_id, field_name)` uniqueness the compare-and-set leans on, and with it
  the conflict path — to buy a single table. The read path would then have to derive "current" on
  every page load, which is a worse trade than one extra insert on write.
- **A row per acknowledgement, including the no-op save.** Rejected as the display it produces: a
  reader who pressed Save twice is shown two identical earlier versions, which reads as a defect in
  the app rather than as a fact about their work. It is the more literal log of what the server
  accepted, and what the app owes the owner is the sequence of states their work passed through.
  Revisit if an audit of acknowledgements is ever needed for its own sake; the live record's
  `updated_at` already carries the time of the last accepted write.
- **Keep history for `prediction` only.** Rejected: see above. It also makes the storage
  non-uniform, so every later reader of the table — Export first — has to know which fields have a
  history and which do not.
- **Let the client assemble the history from what it remembers sending.** Rejected for the same
  reason ADR 0011 refuses a client-supplied version: it is provenance. Both the 200 and the 409
  answers of a save carry the field's earlier versions as the server holds them, so the page shows
  the server's last word rather than its own memory.

## Consequences

Easier: "no rewritten history" becomes a property of the store rather than a claim about it, and
Export has something to carry — each revision names the version it answered, so what was answered
when survives independently of which version the live record currently names. A correction that
moves a lesson to a new content version now demonstrably leaves the earlier answers intact and
attributed.

Harder: writes cost one more insert, and the store grows without bound in the number of distinct
texts the owner commits to. That is the point, and at the scale of one owner and 180 fields it is
not a cost worth engineering against. Revision numbers may have gaps, because a no-op save takes a
number in the live record and appends nothing — anybody reading the table must treat `revision` as
the live counter's value at the time, not as a dense index.

Revisit if history ever has to be shown for two versions of a lesson side by side, or if the owner
needs to remove something they wrote. The second is a real requirement in a multi-user product and
this ADR deliberately does not provide for it: a deletion path is the one thing that would make
"never edited and never deleted" untrue, and it needs its own decision.
