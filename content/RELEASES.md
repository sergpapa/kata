# Received content releases

Every package the content author ships lands here byte-for-byte, in its own directory named after
the package's inner folder. Never edit anything under `releases/` — each package is byte-addressed
(`package-manifest.json` and `learning-release.json` carry a SHA-256 per file) and the importer
verifies those hashes. Proposed content changes go to `docs/content-feedback.md` for the owner.

**Current release: `releases/http-lessons-09-13-release-v1/`** — the app's default
`releaseDir` in `apps/server/src/config.ts` points at its `content/` directory.

| Directory                                   | Package / release ID                                      | Received   | Status                                                                                      |
| ------------------------------------------- | --------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------- |
| `releases/http-lessons-09-13-release-v1/`   | `FSSE-HTTP-CACHING-09-13` / `FSSE-HTTP-FIRST-THIRTEEN`    | 2026-09-21 | **Current.** Lessons 1–13, four lab kits, 39 activities                                     |
| `releases/http-depth-and-lessons-06-08-v1/` | `FSSE-HTTP-FIRST-EIGHT` chain                             | 2026-09-21 | Superseded content; current curriculum specifications (v1_1) and the Lesson-08 owner review |
| `releases/vs-code-first-five-v1/`           | `FSSE-VSCODE-FIRST-FIVE-HANDOFF` / `FSSE-HTTP-FIRST-FIVE` | 2026-09-11 | Superseded; holds the app/architecture handoff that governs this build                      |

Releases are cumulative: each re-ships everything before it so it verifies stand-alone. The
duplication across directories is deliberate and cheap — git stores identical bytes once — and
pruning a superseded package would break its manifest hashes and the regression test that proves
old releases still verify (`apps/server/src/modules/content/verify.test.ts`).

Adding a new drop: copy its inner package folder in unchanged, flip the default `releaseDir` in
`apps/server/src/config.ts` (and the path in `config.test.ts`), and update this file. The
`content/releases/** -text` rule in `.gitattributes` already protects it from line-ending
conversion. See ADR 0009 for why the layout is shaped this way.
