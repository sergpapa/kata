# EduCode

A local application for reading the authored HTTP lessons and recording your actual work against
them. It runs on your own computer. There is no account, no server to sign in to, and no copy of
your work anywhere else.

**Current state:** walking skeleton only. The client, server and record store are wired together and
verified; no lesson is readable yet. See [docs/roadmap.md](docs/roadmap.md).

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

`npm run dev` starts the server on <http://127.0.0.1:4317> and the client dev server on
<http://127.0.0.1:5317>. Open the second one.

For the built application:

```sh
npm run build
npm start        # serves the built client and the API from http://127.0.0.1:4317
```

## Checking it

| Command               | What it proves                                                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`            | Unit and HTTP-level tests (Vitest)                                                                                                                                                                   |
| `npm run typecheck`   | Types across server and client                                                                                                                                                                       |
| `npm run lint`        | ESLint across the workspace                                                                                                                                                                          |
| `npm run build`       | Both apps compile                                                                                                                                                                                    |
| `npm run screenshots` | Boots the built app and captures `/` at 375px, 768px and 1440px into `screenshots/`, warning on any horizontal page overflow. Run `npm run build` first, and `npx playwright install chromium` once. |

Everything runs locally and costs nothing. There is no CI pipeline in this repository, deliberately.

## Where things are

| Path                                     | What lives there                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `apps/server`                            | Fastify application, domain modules under `src/modules/<area>/`, SQLite access |
| `apps/web`                               | React client (Vite)                                                            |
| `tools/`                                 | Local development tooling, including the screenshot capture                    |
| `docs/brief.md`                          | What the first checkpoint delivers, and its hard constraints                   |
| `docs/roadmap.md`                        | Current state and the remaining slices — read this first in a new session      |
| `docs/adr/`                              | Why the stack and the data rules are what they are                             |
| `data/`                                  | Your work. Not committed. Delete the directory to start clean.                 |
| `VS_Code_App_and_First_Five_Lessons_v1/` | The supplied content package. An input, kept byte-for-byte; never edit it.     |

## Pinned versions

Node 22.13.0 · TypeScript 6.0.3 · Fastify 5.12.4 · better-sqlite3 12.11.1 · React 19.3.0 ·
Vite 8.3.0 · Vitest 5.0.0 · ESLint 10.10.0 · Playwright 1.63.0.

`better-sqlite3` is held at 12.x on purpose: 13.0.3's Windows prebuild crashes on this Node version
(see [docs/adr/0002](docs/adr/0002-sqlite-behind-a-repository-boundary.md)). Exact resolved versions
are in `package-lock.json`.
