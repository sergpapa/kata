# EduCode

A local application for reading the authored HTTP lessons and recording your actual work against
them. It runs on your own computer. There is no account, no server to sign in to, and no copy of
your work anywhere else.

**Current state:** the fifteen-lesson release imports, every lesson is listed and reads at its own
address inside the Engineering Practice design, and diagrams that parse are drawn. Each lesson
carries its section contents in the sidebar and previous/next at its foot, and the app keeps the
lesson you last opened, so the dashboard can offer Continue after a refresh or a restart. The
author's 45 practice activities appear beside the sections they were written for, and **you can now
write against each of them and have the app keep it**: one box per field the author asked for, each
saved on its own and each saying whether what is in it is stored. Your work survives a refresh and
a restart. **Each lesson also hands over its practice kit** — the right archive of the five, under
the author's own filename, with its version and checksum beside it — and every code sample carries a
Copy button. **Every answer you replace is kept**, under the box that replaced it, with the lesson
wording it was written against. There is no download of unsaved text after a failure, and nothing is
exported yet. See [docs/roadmap.md](docs/roadmap.md).

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

The release ships a separate file of practice activities, each naming the lesson section it belongs
to. The app places every one at the end of its own section, after the author's prose and before the
next heading, and never repeats the prompt that is already on the page. An activity whose section a
future release renames is shown at the foot of the lesson, with its prompt, saying which section it
was written for.

## Writing, and what "saved" means here

Each activity carries one box per field its author asked for — prediction, what you observed, your
explanation, whether you used help — and each box saves on its own, when you ask it to. There is no
autosave.

Beside every box is one line saying where that text is. It reads **Saved**, with when, only after
the app's own server has written it and said so; the moment you type another character it goes back
to **Not saved yet**. If a save does not go through, the line says so, your text stays exactly where
it is, and Save is still there to press again.

If the same field was saved somewhere else — a second tab, another window — your save is refused
rather than allowed to overwrite it. Both texts are then shown together, yours still in the box and
theirs beside it, and you choose: keep yours, or take what is stored. Neither is thrown away without
you saying so.

Leaving a lesson with something typed but not saved stops and asks first, naming what is unsaved.
That covers a link, the back button and a refresh.

What is stored is recorded against the activity, the lesson, the content version and the release it
was written under, so a later correction to a lesson never quietly re-labels an answer you gave to
an earlier wording.

**Nothing you have saved is ever replaced.** Every save that changes a box's text is kept as its own
revision, and a box with something behind it carries an **Earlier versions** disclosure underneath —
closed, and absent entirely until there is something in it. Opening it shows each earlier answer as
you typed it, when it was saved, and which version of the lesson it was answering. That last part is
the point of keeping them: a prediction you committed to before you knew the answer stays readable
beside the correction you wrote afterwards, and a corrected lesson cannot rewrite either. Nothing
here edits or deletes a revision, including the app. The reasoning is in
[docs/adr/0012](docs/adr/0012-every-accepted-write-that-changes-the-text-is-an-append-only-revision.md).

Lesson text is data, never markup that runs. Markdown becomes React elements directly; no HTML
string exists anywhere in the application. Anything that must not render is turned into visible
text rather than deleted: raw HTML shows as the characters the author typed, a link whose target is
not `http:` or `https:` shows its label and its target, and an image shows its alt text and source
instead of loading. You can always see what was written and why it did not render. The reasoning is
in [docs/adr/0007](docs/adr/0007-markdown-renders-to-react-elements-and-nothing-is-deleted-silently.md).

Code blocks keep the author's whitespace exactly, including the blank line that separates headers
from body in an HTTP message, and carry their language as a label so a command you type is not
mistaken for output you should see. A block wider than the column scrolls inside itself; the page
never scrolls sideways. Each one has a Copy button that puts those exact characters on your
clipboard and does nothing else — if the browser refuses the clipboard, the button says so rather
than pretending it worked.

A lesson that has a practice kit shows it below the lesson's facts: the archive's own filename, a
Download kit button, who else uses the same kit, and — behind a disclosure — its lab id, version,
size and full SHA-256, so you can check what you downloaded against the release registry. Lesson 1
needs no kit and says so. The bytes are re-hashed against the release every time you press Download;
if the archive on disk has changed since the app started, you get a named refusal and both hashes
rather than a file the release does not describe. The 14–15 kit ships deliberately broken starter
code — that is the lesson, and the app never repairs, runs or rewrites it.

For the built application:

```sh
npm run build
npm start        # serves the built client and the API from http://127.0.0.1:8317
```

## Checking it

| Command               | What it proves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`            | Unit and HTTP-level tests (Vitest)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run typecheck`   | Types across server and client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `npm run lint`        | ESLint across the workspace                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `npm run build`       | Both apps compile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `npm run screenshots` | Boots the built app on a wiped per-run data directory and captures all nineteen routes at 375px, 768px and 1440px, light and dark, into `screenshots/`, plus a 720px pass (1440 at 200% zoom), the mobile drawer opened on a lesson with its contents inside, navigation checked still in view 3,000px down a lesson, a followed contents anchor landing clear of the top bar, and a resume round trip (open a lesson, return home, the card offers Continue). **Fails** if a page scrolls sideways, a code block stops preserving whitespace, Mermaid reaches the entry chunk, a diagram stops being a drawing, or a contents entry points at nothing — none of which is visible to the test suite, which has no stylesheet and no SVG layout. Run `npm run build` first, and `npx playwright install chromium` once. |

Everything runs locally and costs nothing. There is no CI pipeline in this repository, deliberately.

## Where things are

| Path                                                | What lives there                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `apps/server`                                       | Fastify application, domain modules under `src/modules/<area>/`, SQLite access             |
| `apps/server/src/modules/content/`                  | Release import: manifest, hashes, path safety, and the content repository                  |
| `apps/web`                                          | React client (Vite)                                                                        |
| `apps/web/src/markdown/`                            | The lesson renderer and the guards that keep lesson content inert                          |
| `apps/web/src/activities/`                          | The practice panels: the boxes, the save states, the conflict path and the revisions       |
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
