# EduCode

A local application for reading the authored HTTP lessons and recording your actual work against
them. It runs on your own computer. There is no account, no server to sign in to, and no copy of
your work anywhere else.

**Current state:** the fifteen-lesson release imports, every lesson is listed and reads at its own
address inside the Engineering Practice design, and diagrams that parse are drawn. There is no
contents list or resume point yet. See [docs/roadmap.md](docs/roadmap.md).

## What it is not

It does not run your code, or the lessons' code. Buttons download files or copy text; nothing is
executed by the application. It does not grade you, review your work, or claim anything about what
you have mastered. "Studied", "practice recorded" and "feedback received" are the only states it
will ever show.

## Requirements

Node.js 22.13 or newer, on the machine you want to learn on. Nothing else — no database server, no
hosting account.

## Running it

```sh
npm install
npm run dev
```

`npm run dev` starts the server on <http://127.0.0.1:8317> and the client dev server on
<http://127.0.0.1:5317>. Open the second one.

The app deliberately stays off ports 4315–4323: the lessons' downloadable lab kits run their own
local servers there — lessons 6–8 tell you to start one on 4317 while you read, and the lessons
14–15 investigation kit uses 4321 and 4323.

## The content release

On every start, the app reads `learning-release.json` from the release directory, hashes all
twenty-one files it names — fifteen lessons, five lab kits, the activity file — and compares each
against the hash the release publishes. It also cross-checks the identities: a lesson file whose `candidate_lesson_id`,
`document_id` or `version` disagrees with the manifest entry is a conflict, not a preference.

If anything fails, the app still starts and the page states which file failed and why. No lesson is
imported — not even the ones that verified — and nothing is ever filled in with substitute content.

The release directory defaults to the supplied package. Point `EDUCODE_RELEASE_DIR` elsewhere to
read a different one; it is only ever read, never written to.

## Reading a lesson

Each lesson has its own address — `/lessons/LS-M020-03` — so it can be linked, bookmarked, and
reached with the back button.

Lesson text is data, never markup that runs. Markdown becomes React elements directly; no HTML
string exists anywhere in the application. Anything that must not render is turned into visible
text rather than deleted: raw HTML shows as the characters the author typed, a link whose target is
not `http:` or `https:` shows its label and its target, and an image shows its alt text and source
instead of loading. You can always see what was written and why it did not render. The reasoning is
in [docs/adr/0007](docs/adr/0007-markdown-renders-to-react-elements-and-nothing-is-deleted-silently.md).

Code blocks keep the author's whitespace exactly, including the blank line that separates headers
from body in an HTTP message, and carry their language as a label so a command you type is not
mistaken for output you should see. A block wider than the column scrolls inside itself; the page
never scrolls sideways.

For the built application:

```sh
npm run build
npm start        # serves the built client and the API from http://127.0.0.1:8317
```

## Checking it

| Command               | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`            | Unit and HTTP-level tests (Vitest)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm run typecheck`   | Types across server and client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `npm run lint`        | ESLint across the workspace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run build`       | Both apps compile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npm run screenshots` | Boots the built app and captures all seventeen routes at 375px, 768px and 1440px, light and dark, into `screenshots/`, plus a 720px pass (1440 at 200% zoom), the mobile drawer opened, and navigation checked still in view 3,000px down a lesson. **Fails** if a page scrolls sideways, a code block stops preserving whitespace, Mermaid reaches the entry chunk, or a diagram stops being a drawing — none of which is visible to the test suite, which has no stylesheet and no SVG layout. Run `npm run build` first, and `npx playwright install chromium` once. |

Everything runs locally and costs nothing. There is no CI pipeline in this repository, deliberately.

## Where things are

| Path                                                | What lives there                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/server`                                       | Fastify application, domain modules under `src/modules/<area>/`, SQLite access             |
| `apps/server/src/modules/content/`                  | Release import: manifest, hashes, path safety, and the content repository                  |
| `apps/web`                                          | React client (Vite)                                                                        |
| `apps/web/src/markdown/`                            | The lesson renderer and the guards that keep lesson content inert                          |
| `tools/`                                            | Local development tooling, including the screenshot capture                                |
| `docs/brief.md`                                     | What the first checkpoint delivers, and its hard constraints                               |
| `docs/roadmap.md`                                   | Current state and the remaining slices — read this first in a new session                  |
| `docs/specs/`                                       | The agreed acceptance criteria for each slice, and its slice log                           |
| `docs/adr/`                                         | Why the stack and the data rules are what they are                                         |
| `data/`                                             | Your work. Not committed. Delete the directory to start clean.                             |
| `content/releases/`                                 | Every received content package, byte-for-byte; `content/RELEASES.md` names the current one |
| `content/releases/http-first-fifteen-v1_0_1/`       | The current package (lessons 1–15, CF-001/CF-002 corrected); the app's default import      |
| `content/releases/http-lessons-14-15-release-v1/`   | The fifteen-lesson 1.0.0 package: superseded content, kept as a verified baseline          |
| `content/releases/http-lessons-09-13-release-v1/`   | The lessons 9–13 package: superseded content, kept as a verified baseline                  |
| `content/releases/http-depth-and-lessons-06-08-v1/` | The lessons 6–8 package: superseded content, current curriculum specifications             |
| `content/releases/vs-code-first-five-v1/`           | The first content package, and the app/architecture handoff that governs this build        |

The content packages are inputs, kept byte-for-byte; never edit them. Proposed changes to their
content go to [docs/content-feedback.md](docs/content-feedback.md) for the owner instead. A new
drop gets its own directory under `content/releases/`; see [content/RELEASES.md](content/RELEASES.md).

## Pinned versions

Node 22.13.0 · TypeScript 6.0.3 · Fastify 5.12.4 · better-sqlite3 12.11.1 · React 19.3.0 ·
Vite 8.3.0 · Vitest 5.0.0 · ESLint 10.10.0 · Playwright 1.63.0 · yaml 2.9.0 ·
react-markdown 10.1.0 · remark-gfm 4.0.1 · rehype-sanitize 6.0.0.

`better-sqlite3` is held at 12.x on purpose: 13.0.3's Windows prebuild crashes on this Node version
(see [docs/adr/0002](docs/adr/0002-sqlite-behind-a-repository-boundary.md)). Exact resolved versions
are in `package-lock.json`.
