# Verification and known limits

What was checked for `QAAE-Q02@1.2.1-draft`, and what was not. Author rehearsal, independent
review and automated checks only. No learner has used these lessons. The owner has not yet read the
seven M002 lessons, or the four lessons Q01 added in `1.1.0-draft`.

## This release

Built on 2026-11-20 with `npm run release:build` from `content/source/qaae/`, which the tool's own
test rebuilds and compares with this package byte for byte
(`apps/server/src/authoring/realQaaeSource.test.ts`).
The build recomputed every hash and ran the app's importer on the result (`package-verification.json`).
The app imports this release beside the full-stack release, serves every lesson with its activities
(`apps/server/src/realQaaeRelease.test.ts`), and the screenshot gate opens each lesson at 375, 768 and
1440 pixels in both schemes (`npm run screenshots`). `1.2.1-draft` changes only Lesson 1, whose
diagram is now a Kata diagram; every other lesson, kit and activity is byte for byte
`QAAE-Q02@1.2.0-draft`.

## Lesson 1's Kata diagram (new in 1.2.1-draft)

### Checked, 2026-11-20

- **Same diagram, new drawing.** The Kata diagram's 13 messages are the Mermaid block's 13:
  same senders, receivers, words and order, with a reply wherever Mermaid draws a dashed arrow
  (`apps/web/src/markdown/kataLessons.test.tsx`). With the Kata fence removed, the lesson is
  `1.0.1-draft` apart from its `version` and `date`, so the Mermaid block and the "In words:"
  paragraph are unchanged.
- **Drawn in the page, not Mermaid.** The page draws one Kata diagram and no diagram frame, and
  Mermaid is never asked for it. In Chromium at 375, 768 and 1440 pixels in both schemes, the
  diagram is no wider than the lesson column, nothing inside it scrolls sideways, and every kind of
  text in it measures at least 4.5:1 on its background (`npm run screenshots`). At 1440 it draws
  lanes and arrows, replies dashed and the key step heavier. At 375 and 768 the lesson column is
  narrower than 34rem, so it draws one row per step.
- **The added content.** The phase names, the participants' notes, the key-step note ("The only
  check. Nothing reads the total.") and the caption restate Sections 5 and 6, as checked against
  the lesson's own text by its author. They add no claim the lesson does not make.

### Not checked

- No separate review session read the added phase names, notes and caption.
- Firefox and WebKit. The layout uses CSS container queries, which both support, but neither was
  run.
- A screen reader. The steps are an ordered list whose items say "sender → receiver" in words, but
  no screen reader has read it.

## The seven M002 lessons and their kit (new in 1.2.0-draft)

### Review

Written by Fable 5.2 on 2026-11-19 and 2026-11-20. Reviewed on 2026-11-20 by two fresh reviewers in
separate sessions (ADR 0013); neither saw the drafts' README or the roadmap. One walked the lessons as the
learner against the authoring standard and the owner's recorded feedback. The other checked every
technical claim against the kit and the shells. The author re-ran every command at the same time and
found 9 of the same defects independently.

| Reviewer | Blocker | Major | Minor |
| --- | --- | --- | --- |
| As the learner | 2 | 10 | 18 |
| Technical claims | 3 | 7 | 18 |

The most serious, all corrected:

- With `ORDERS_DIR` set as Lesson 7's explanation said, Dana's steps 3 and 4 failed with `data\data`
  in the path. `ORDERS_DIR` is now a second place the checker looks, tried only when nothing is found
  from the current folder. The help text, `--settings`, Lesson 5 Practice B and Lesson 7 Part 1
  follow it.
- Lesson 2 said the shell fills in before it cuts the command into words. It cuts first.
- Lessons 5 and 6 put `# bash or zsh` as a code block's first line. Interactive zsh does not treat
  `#` as a comment. The shell labels now sit above the blocks, in every lesson.
- On Windows, `reset-sandbox.mjs` run from inside `sandbox` crashed with `EPERM` and left the folder
  half deleted. It now refuses to run from inside `sandbox` on every system, and Lesson 3 has the
  learner try it.
- Lesson 4 used standard input, `echo` and "fields" before teaching them, and never showed the
  order file.
- Lesson 5's pocket-note transcript gave the opposite result where it stood, because the variable
  was still exported.
- The command log template had no "last two columns" for Lesson 7 to refer to, and a table cell
  could not hold PowerShell's six-line messages. It now has six content columns and a "Full output"
  section.
- Ubuntu's helper changes the "command not found" message. Lessons 4, 5 and 7 say so where each
  message is shown.
- PowerShell 5.1 and PowerShell 7 could not be told apart. Lesson 1 shows `$PSVersionTable.PSVersion`
  and each lesson names where 7 is documented to differ.

Not taken, with the reason:

- **Split Lesson 4 in two.** Seven lessons is the owner's decision (ADR 0024). The lesson has a
  pause point between streams and exit codes.
- **Graduated hints in Lessons 1 to 6.** The full-stack reference lesson has none either. Lesson 7
  has them where the task is independent.
- **A stale `tick.running` in Tomas's note in Lesson 7.** The module's exit task is a path or
  environment problem, and the note already has five things to find.
- **A primary source for each zsh fact and for `kill` sending a request.** The zsh facts rest on
  the author's runs. The Bash manual section on `kill` answered HTTP 429 twice and was not read.
- **`find-on-path.mjs` following PowerShell's preference for `.ps1`.** Its header comment says it
  does not. The lessons use it for `node` only.

### Checked, 2026-11-20

- **Every command in the seven lessons**, before and after the revision, in all three shells:
  Windows 11 with Windows PowerShell 5.1 and Node.js v24.12.0; Ubuntu 24.04 in WSL with bash 5.2.21,
  zsh 5.9 and Node.js v24.22.3. The only differences between the two runs are the kit changes listed
  above. Every block marked as the author's run was captured, not written from memory. The command
  lists and the two runners are in `content/source/qaae/verification/m002/` in the repository; they
  are not part of the kit.
- **What the captures changed.** The home folder was renamed to the example user maria's. A
  `line N:` inside bash's own messages and wrapped long lines in PowerShell tables, both added by
  the capture method, were removed. The Windows `find-on-path.mjs` block in Lesson 5 is a
  constructed example and is labelled as one.
- **Interactive terminal, Linux**: Ctrl+C in bash and zsh, the `Killed` line in bash and zsh, and
  `#` at a zsh prompt.
- **Ctrl+C on Windows**: a reviewer sent a console Ctrl+C event to `tick.mjs` and got the closing
  line ending "Marker removed".
- **Diagrams**: the five Mermaid blocks, in Lessons 1, 2, 4, 5 and 6, parse and render with the
  app's Mermaid 11.17.2 in Chromium, inside the app's lesson page, at 375, 768 and 1440 pixels in
  both schemes (`npm run screenshots`: layout, axe and 44px checks passed on all 33 routes). The
  drawings were looked at. Four fit their frame at 1440. Lesson 2's sequence diagram does not: its
  fourth participant, `show-args.mjs`, and the end of the note over Node.js lie past the frame's
  right edge, so even a desktop reader scrolls sideways inside the frame to see them. It was left as
  written for the author to shorten.
- **Activities**: each `source_heading` and `feedback_source_heading` appears exactly once in its
  lesson, outside code blocks, and each `prompt_markdown` is the text from its heading to the next
  heading.

### Not checked, 2026-11-20

- **macOS, and PowerShell 7.**
- **The Linux runs' start-up files.** Commands were fed to `bash --norc --noprofile` and `zsh -f`,
  so the runs show none of what a system adds: Ubuntu's suggestions after "command not found",
  aliases, and prompts.
- **Six checks that need a person at a keyboard**, in VS Code's terminal on Windows:
  1. Tab completion: `cd da` and Tab (Lesson 1 §5). PowerShell's own completion engine answered
     `.\data`.
  2. PowerShell's question before deleting a folder that has files in it (Lesson 3 §6).
  3. Ctrl+C on `node tick.mjs` in a real terminal (Lesson 6 §3).
  4. Ctrl+C with text selected copies instead of stopping (Lesson 6 §3).
  5. Closing the terminal panel with `tick.mjs` running, then checking for the process and the
     marker (Lesson 6 §6).
  6. `>>` after an open quotation mark in PowerShell (Lesson 2, "If something does not match").
- **Inside the app**, beyond the importer and the screenshot gate. Saving an answer in each new
  activity, and downloading the kit from the app, were not done by hand.
- **Any learner.** Reading time, difficulty and whether the analogies work are unmeasured.

## The four Q01 lessons added in 1.1.0-draft (2026-11-19)

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
