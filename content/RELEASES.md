# Received content releases

Every package the content author ships lands here byte-for-byte, in its own directory named after
the package's inner folder. Never edit anything under `releases/` — each package is byte-addressed
(`package-manifest.json` and `learning-release.json` carry a SHA-256 per file) and the importer
verifies those hashes. Proposed content changes go to `docs/content-feedback.md` for the owner.

**Current release: `releases/http-first-fifteen-v1_0_1/`** — the app's default
`releaseDir` in `apps/server/src/config.ts` points at its `content/` directory.

| Directory                                   | Package / release ID                                                    | Received   | Status                                                                                                                                                                            |
| ------------------------------------------- | ----------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `releases/http-first-fifteen-v1_0_1/`       | `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft`                                   | 2026-09-21 | **Current.** Lessons 1–15 with CF-001/CF-002 accepted (lessons 2 and 7 at 1.0.1-draft); the investigation kit still ships deliberately faulty starter code — that is the exercise |
| `releases/http-lessons-14-15-release-v1/`   | `FSSE-HTTP-INVESTIGATION-14-15` / `FSSE-HTTP-FIRST-FIFTEEN@1.0.0-draft` | 2026-09-21 | Superseded; verified baseline, and the pre-correction bytes `content-corrections.json` names as previous                                                                          |
| `releases/http-lessons-09-13-release-v1/`   | `FSSE-HTTP-CACHING-09-13` / `FSSE-HTTP-FIRST-THIRTEEN`                  | 2026-09-21 | Superseded; verified baseline for lessons 1–13 continuity                                                                                                                         |
| `releases/http-depth-and-lessons-06-08-v1/` | `FSSE-HTTP-FIRST-EIGHT` chain                                           | 2026-09-21 | Superseded content; current curriculum specifications (v1_1) and the Lesson-08 owner review                                                                                       |
| `releases/vs-code-first-five-v1/`           | `FSSE-VSCODE-FIRST-FIVE-HANDOFF` / `FSSE-HTTP-FIRST-FIVE`               | 2026-09-11 | Superseded; holds the app/architecture handoff that governs this build                                                                                                            |

Releases are cumulative: each re-ships everything before it so it verifies stand-alone. The
duplication across directories is deliberate and cheap — git stores identical bytes once — and
pruning a superseded package would break its manifest hashes and the regression test that proves
old releases still verify (`apps/server/src/modules/content/verify.test.ts`).

Adding a new drop: copy its inner package folder in unchanged, flip the default `releaseDir` in
`apps/server/src/config.ts` (and the path in `config.test.ts`), and update this file. The
`content/releases/** -text` rule in `.gitattributes` already protects it from line-ending
conversion. See ADR 0009 for why the layout is shaped this way.

**Building a reissue here (ADR 0013).** Releases are now built in this repo, never edited in
place. Seed an editable source once with `npm run release:seed -- content/releases/<current>
content/source`, edit lessons, kits and activities there, then run `npm run release:build --
content/source content/releases/<new>`. The build refuses anything inconsistent and prints
exactly which lessons and kits changed, followed by the make-current steps above. The full
contract is in `docs/specs/release-packaging.md`.
