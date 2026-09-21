# 0009. Received content packages live byte-for-byte under content/releases/, one directory per drop

Date: 2026-09-21
Status: Accepted

## Context

Three received packages sat as three top-level folders, each wrapped in a redundant outer
directory (`HTTP_Caching_Lessons_09_13_v1/http-lessons-09-13-release-v1/`). Releases are
cumulative, so 17 file groups were byte-identical across folders — lessons 1–5 existed three
times — and it was not obvious from the tree which copy the app serves. Only the first package was
protected by the `.gitattributes` `-text` rule; the two newer ones could have been corrupted by
line-ending conversion, which breaks every manifest hash (ADR 0006 verifies them on start).

## Decision

All received drops live under `content/releases/<inner-package-name>/`, moved with `git mv` only —
byte-for-byte, every manifest hash intact. The outer wrapper folders are gone. `content/RELEASES.md`
names the current release; `apps/server/src/config.ts` points its default `releaseDir` at it. One
`.gitattributes` rule (`content/releases/** -text`) and one ignore entry each in `.prettierignore`
and `eslint.config.js` cover every present and future drop. A new drop is: add its directory, flip
the config path, update `RELEASES.md`.

## Alternatives considered

- **Leave the three folders at the root.** Lost because every new drop adds root clutter and a new
  line in three tool configs, and "which copy is current" stays implicit in `config.ts`.
- **Extract one deduplicated canonical lesson tree and prune old packages to their unique files.**
  Lost because pruning breaks the pruned package's `package-manifest.json` (missing hashed files)
  and with it the regression test proving superseded releases still verify — the property the
  append-only import guarantee (ADR 0006) rests on. A separate "clean" tree would also fork the
  author's content, breaking the reissue flow.
- **Ask the author to ship deltas instead of cumulative packages.** Not pursued: cumulative drops
  are what make each release verify stand-alone, and git stores identical blobs once, so the
  duplication costs almost nothing.

## Consequences

Easier: a clean root, one designated current release, one protection rule for all drops, and a
one-directory recipe for every future package. Harder: paths in docs and tests got longer, and the
slice logs now name both the delivered wrapper name and the rehomed path. Revisit if the author
changes the packaging shape (deltas, or packages that reference each other by path) or if drops
grow large enough that keeping every superseded package in the working tree hurts.
