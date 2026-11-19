# Verification and known limits

What was checked for `QAAE-Q01@1.1.0-draft`, and what was not. Author rehearsal, independent
review and automated checks only. No learner has used these lessons, and the owner has not yet read
the four new ones.

## This release

Built on 2026-11-19 with `npm run release:build` from `content/source/qaae/`, which the tool's own
test rebuilds and compares with this package byte for byte (`apps/server/src/realQaaeSource.test.ts`).
The build recomputed every hash and ran the app's importer on the result (`package-verification.json`).
The app imports this release beside the full-stack release, serves every lesson with its activities
(`apps/server/src/realQaaeRelease.test.ts`), and the screenshot gate opens each lesson at 375, 768 and
1440 pixels in both schemes (`npm run screenshots`).

## The four new lessons and their kits

### Review

Written by Fable 5.2 on 2026-11-19. Reviewed the same day by two fresh reviewers that saw only the
authoring standard, the owner's recorded feedback, the course's teaching contract, the previous
lesson and the drafts (ADR 0013). One read the two M001 lessons, the other the two QA lessons.

| Reviewed | High | Medium | Low | Taken |
| --- | --- | --- | --- | --- |
| `LS-M001-01`, `LS-M001-02`, workspace kit | 5 | 17 | 10 | All but the two noted below |
| `LS-Q01-02`, `LS-Q01-03`, both QA kits | 7 | 18 | 15 | All but the two noted below |

The highest findings, all corrected:

- A new terminal inside an already-open VS Code does not see a fresh install. VS Code hands its own
  old copy of PATH to every terminal. The lesson had taught "open a new terminal".
- A write failure "from inside a ZIP view" cannot happen. Node.js never starts there.
- The workspace check's own messages sent the learner back to Documents, which the lesson forbids.
- nodejs.org now preselects v26 and opens with fetch-and-run commands for other tools.
- Playwright's HTML reporter prints three extra lines in a real terminal. Both kits now use the
  list reporter only.
- Both kits failed behind a proxy variable, because Playwright's readiness probe honours it. They
  now wait on the port, which was run with a dead proxy set and passed.
- Ctrl+C is the Control key on macOS. The setup lessons had taught Ctrl as Command.
- "Mutation testing, also called fault injection" was wrong. The lesson now says fault seeding.
- Lesson 5 quoted a practice's answer before the practice.

Not taken, for the owner to decide:

- **Length.** `LS-M001-01` is about 8,600 words and `LS-Q01-02` about 8,150, against 3,700 for the
  full-stack Lesson 1. Both reviewers proposed splitting each in two. Marked pause points were
  added instead.

### Checked, 2026-11-19

Checked, on Windows 11 with Node.js v24.12.0 and Playwright Test 1.65.1 (Chromium build 1255):

- **Every command in the four lessons**, by the author and again by a reviewer in a clean copy.
  Every quoted output, line number and count matched the reviewers' runs before the rewrite. The
  outputs that changed in the rewrite were captured again.
- **The grading path**: the Lesson 1 test catches 1 of 6. With the total check, 3 of 6. With room,
  date and time checks, 5 of 6. With the supplied second test, 6 of 6. A wrong expected total
  gives "Not graded". A syntax error gives "could not run".
- **The first-run path**: missing packages, missing browser, pass (342 ms), failure on the total
  at line 13 after 5 s, timeout at line 10 after 30 s, and the two-run practice against a running
  site (line 13, then line 12).
- **Diagrams**: all four Mermaid blocks parse and render with the app's Mermaid 11.17.2 in
  Chromium, in both themes at 375, 768 and 1440 pixels, and the drawings were looked at. Two were
  corrected after looking: a label that split `--version`, and a lifeline through three labels.
- **Facts** against playwright.dev, docs.npmjs.com, learn.microsoft.com, code.visualstudio.com,
  nodejs.org and the Node.js and VS Code sources, on 2026-11-19.
- **Activities**: each `source_heading` and `feedback_source_heading` appears exactly once in its
  lesson, and each `prompt_markdown` is the section's own text.

### Not checked, 2026-11-19

- **macOS and Linux.** Every run was on Windows. The lessons say so.
- **A real interactive terminal.** Output was captured from a non-interactive shell inside a
  coding agent. Playwright behaves differently on a terminal and under an agent. The known
  difference was removed, and others may remain.
- **Node.js 26**, which nodejs.org now preselects. The workspace check warns on it.
- **Firefox and WebKit.**
- **Inside the app**, beyond the importer and the screenshot gate (see "This release" above).
  Saving an answer in each new activity, and downloading each kit from the app, were not done by
  hand.
- **Screens that need a person**: the VS Code trust dialog, File Explorer and Finder steps, the
  Windows and Node.js installers, the browser's time field, `Terminate batch job`, and npx's
  `Ok to proceed?`.
- **The ISTQB glossary page** for fault seeding. Its site returned no text to the tools.
- **Any learner.** Reading time, difficulty and whether the analogies work are unmeasured.

## Lesson 1 (from its first release, 2026-11-03)

The correction in this release changed three sentences and the version. Nothing below was re-run
for it.

### Checked

- **Import.** The app's importer accepts the package beside the full-stack release, with neither
  refused (`apps/server/src/realQaaeRelease.test.ts`). Every file hash in `learning-release.json`
  and `package-manifest.json` was computed by script from the bytes on disk.
- **Activities.** Each of the three `source_heading` values names a heading that appears exactly
  once in the lesson, outside code blocks. Each `prompt_markdown` is the lesson's own section text.
  Each `lesson_version` matches the lesson.
- **Independent review** (ADR 0013), in a separate session that saw only the authoring standard,
  the owner's recorded feedback, this course's teaching contract and Q01 module record, the
  full-stack Lesson 1 as the quality bar, and the draft. Its findings were taken before release:
  3 high, 7 medium and 7 low. The highest were an analogy that contradicted itself about which
  knowledge the new colleague had, a "fresh page" claim that implied the site's data is reset, and
  a claim about missing `await` that current Playwright does not bear out.
- **Playwright facts**, against playwright.dev on 2026-11-03, and by the reviewer running the
  lesson's own examples on Playwright 1.63.0 in Chromium:
  - role, label and text matching is case-insensitive substring by default;
  - a locator matching two elements makes an action fail (strictness);
  - actions wait for actionability, with no time limit of their own, inside the 30-second test
    timeout; assertions retry for 5 seconds;
  - Practice C's renamed-button test fails after 30 seconds waiting for the button, and the
    assertion is never reached;
  - the €0.00 page passes the lesson's test, and fails it once the total is checked.
- **Diagram.** The one Mermaid block contains no raw semicolons. It parses and draws with the
  app's pinned Mermaid 11.17.2 in Chromium, inside the app's lesson page, at 375, 768 and 1440
  pixels in light and dark schemes (`npm run screenshots`, all layout checks passed). At 375
  pixels it sits in the same horizontally scrolling frame as the full-stack lessons' diagrams.

### Not checked

- Firefox and WebKit. Every browser check here ran in Chromium.
- Any learner. Reading time, difficulty and whether the analogy works are unmeasured.
- Two departures from the course's teaching contract, left for the owner to decide:
  - The contract says each lesson has a lab. This lesson has none, by the owner's choice of an
    install-free first lesson.
  - The contract asks for the naive attempt to be observed. Here the colleague's two runs are
    described, because the learner has no tools yet.
