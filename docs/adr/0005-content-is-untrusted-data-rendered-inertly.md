# 0005. Imported content is untrusted data, rendered inertly, and admitted only on a hash match

Date: 2026-09-11
Status: Accepted

## Context

Lessons arrive as Markdown authored outside this repository and carry HTML examples inside code
fences that must stay visible as code. `content/learning-release.json` carries a SHA-256 for every
lesson, lab and the activity file, and the handoff requires validating them before import and
failing specifically when one does not match. Three lessons contain Mermaid diagrams with authored
prose beside them.

## Decision

The importer resolves every manifest path inside the release directory, rejects any path that
escapes it, hashes the received bytes itself and refuses the release on any mismatch, missing file,
duplicate lesson ID or missing referenced lab — with a message naming the file and the failure. The
renderer supports CommonMark plus tables and fenced code, disables raw HTML, and sanitizes output.
Mermaid renders in its safe configuration with the authored prose kept adjacent and a labelled text
fallback when a diagram cannot render. The lesson's stable key is `candidate_lesson_id`; the display
title is the first H1, never the filename. Front matter is shown as selected learner-facing facts,
not dumped.

## Alternatives considered

- **Trust the package and skip hash verification.** Rejected: the hashes are the only mechanism that
  proves an import was faithful, and a silent partial import is the failure mode most likely to
  waste the owner's review time.
- **Render Markdown to HTML at import and store the HTML.** Rejected: it makes the Markdown
  non-canonical, and any renderer change then requires a re-import.
- **Allow raw HTML for richer lessons.** Rejected: submitted and authored content share one renderer,
  and the specification requires both to stay inert.

## Consequences

Easier: an import either matches the author's bytes or fails loudly; a lesson can never execute.
Harder: an author who edits a lesson must reissue the manifest hash, which is the intended
discipline. Revisit if a future lesson genuinely needs an interactive widget — that is a separate
versioned trusted component with its own content schema, never an HTML escape hatch.
