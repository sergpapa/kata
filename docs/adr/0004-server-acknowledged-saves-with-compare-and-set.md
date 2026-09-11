# 0004. A save is acknowledged by the server, and writes are compare-and-set

Date: 2026-09-11
Status: Accepted

## Context

The brief forbids showing "Saved" for text the server has not stored. The specification's REQ-46
additionally requires that a newer revision from another tab is not silently overwritten, and the
architecture's Draft record requires compare-and-set with no silent last-writer win. Browser storage
cannot supply either guarantee: it acknowledges instantly and knows nothing about a second tab.

## Decision

Every recorded field — note, prediction, observation, reflection — is a server write. The client
sends the revision it believes it is editing; the server accepts only if that matches the stored
revision, and otherwise returns a conflict carrying the current revision and content. The UI shows
four distinct states: unsaved, saving, saved (after the acknowledgement), and failed to save, with
the learner's text still present and recoverable in the failed state. A prediction that has been
acknowledged is stored as its own immutable revision; a later correction appends rather than
replaces.

## Alternatives considered

- **Optimistic local-first with background sync.** Rejected: it shows "saved" before the write
  lands, which is the exact failure the acceptance checks probe.
- **Last-write-wins.** Rejected: a second tab silently erases work, and the concurrent local change
  cannot be recovered once overwritten.

## Consequences

Easier: the save-failure acceptance check and the restart check both become provable, and history is
preserved by construction.
Harder: every editable field needs a revision in its state, and the conflict path needs real UI
rather than a toast. Revisit only if the app ever has to work offline, which would need an explicit
conflict-resolution design rather than a relaxation of this rule.
