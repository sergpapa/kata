# Q02 draft set

Drafts of module Q02 of the QA Automation Engineering course, "Terminal and local program operation", written on 2026-11-19. Q02 is the full-stack module M002, shared unchanged (`docs/courses/qa-automation/Module_Syllabus_v0_1.md`), so the lessons carry M002 IDs, no lesson number in their titles, and refer to no QA-only lesson. Nothing here is in a release, and nothing here is committed.

**State on 2026-11-19, 17:15: text and kit drafted. Not reviewed, not re-verified against the final text, not packaged.** The remaining work is listed under "Still to do".

## What is here

| Module order | Lesson ID | File | Title | Words |
| --- | --- | --- | --- | --- |
| 1 | `LS-M002-01` | `lessons/M002_Lesson_01_Student_Edition_v1.md` | Where the terminal is standing | 4,627 |
| 2 | `LS-M002-02` | `lessons/M002_Lesson_02_Student_Edition_v1.md` | What a program receives | 5,138 |
| 3 | `LS-M002-03` | `lessons/M002_Lesson_03_Student_Edition_v1.md` | Change files without regret | 4,673 |
| 4 | `LS-M002-04` | `lessons/M002_Lesson_04_Student_Edition_v1.md` | Output, messages and the exit code | 5,008 |
| 5 | `LS-M002-05` | `lessons/M002_Lesson_05_Student_Edition_v1.md` | The settings a program is handed | 5,203 |
| 6 | `LS-M002-06` | `lessons/M002_Lesson_06_Student_Edition_v1.md` | Programs that keep running | 5,290 |
| 7 | `LS-M002-07` | `lessons/M002_Lesson_07_Student_Edition_v1.md` | It worked on their computer | 5,620 |

All seven use one kit, `labs/terminal-practice-kit`. Word counts exclude front matter and include practice explanations and the troubleshooting section. They are above the 4,000 that was aimed for and well below the 8,000 the Q01 reviewers objected to.

## Decisions behind the set

The owner made the first two on 2026-11-19. They are not yet recorded as an ADR.

1. **PowerShell and bash/zsh side by side.** Each idea is taught once, on a Node.js kit that behaves the same everywhere. Where the typing differs, the lesson shows a labelled block for each shell family. The learner keeps the shell VS Code gave them. The alternative, Git Bash for everyone on Windows, was rejected: it shows Windows paths as `/c/Users/...`, and it installs Git two modules early.
2. **Seven lessons, one kit, the whole module.**
3. **One program runs through the module** (`check-orders.mjs`), and each lesson shows another side of it: where it looks for files, its arguments, its two streams and exit code, its settings, and in Lesson 7 all of them at once. This follows the authoring standard's "reuse one example while adding precision".
4. **Every lesson opens with a developed familiar situation**: directions over the phone, an order slip, a clearance crew, a delivery, a handover sheet, a recipe and a pan, a note about the heating.
5. **Lesson 7 is the module's exit task** from `Curriculum_Architecture_v1_1.md`: reproduce and repair a path or environment problem using a short command log. It is practice, not a demonstration, because full explanations are open.
6. **Topics left out on purpose**, each named in a lesson's `deferred` list: permanent settings and `.env` files, background jobs, ports, signals in depth, scripts, text encodings, and a quotation mark inside an argument.

Each lesson covers these planned M002 topics: paths (1); commands, arguments and quoting (2); file operations and the lab-target rule CP020 (3); standard streams and exit codes (4); environment variables and locating a missing executable (5); processes (6); reading errors (all, and 7).

## Packaging brief

- **Archive and lab ID.** The lessons name the archive, so the name is fixed: `Terminal_Practice_Kit_v1.zip`, top folder `terminal-practice-kit`, proposed lab ID `M002-LAB-01`, serving all seven lessons.
- **`manifest.json`** is listed in the kit's README and must be created at packaging.
- **Leave out of the archive:** `sandbox/`, `tick.running`, and any `report*.txt`, `messages.txt` or `november.txt` left by a test run.
- **`data/archive/orders 2025.csv` has a space in its name on purpose.** The packaging tool and the archive must keep it.
- **No file in the kit needs an execute permission**, by design, so an archive built on Windows works on macOS and Linux.
- `release:build` refuses a build that adds a lesson or a kit, as for Q01.

## How the output in the lessons was produced

Every block marked as the author's run was captured, not written from memory, on:

- **Windows 11, Windows PowerShell 5.1, Node.js v24.12.0.** Commands were fed to `powershell.exe -NoProfile -Command -` one line at a time.
- **Ubuntu 24.04 in WSL, bash 5.2.21 and zsh 5.9, Node.js v24.22.3.** Node.js and zsh were unpacked into a cache folder in WSL (`~/.cache/educode-m002`), not installed. That folder can be deleted.

The home folder was renamed to the example user maria's in every block. Two things were removed that only the capture method added: a `line N:` inside bash's own messages, and wrapped long lines in PowerShell tables.

## Still to do

### 1. Re-run every command against the final text

The text was written from captures, and then some output was written from the mechanism without a capture of that exact command. Re-run each lesson top to bottom in all three shells. These are the places known to lack a capture of the exact command:

| Lesson | Place | What to confirm |
| --- | --- | --- |
| 1 | Section 5, and Practice B | `cd data/archive` then `cd ../..`; the three `where.mjs` results from `data/archive` (4 items, 291 bytes, nothing) |
| 1 | Practice D | `ls ../../handover` from `data/archive` |
| 2 | Practice A, number 6 | `data/archive/*.csv` arrives as one argument in bash and zsh, and as the pattern in PowerShell |
| 2 | Practice C and D | The three repaired commands; Dana's `cannot read` message for `data/*.csv` in PowerShell; Tomás's "3 arguments arrived" in bash |
| 2 | "If something does not match" | PowerShell's `>>` prompt for an open quotation mark; curved quotation marks |
| 3 | Sections 3 to 7 | The whole sequence in one run, in the order the lesson gives it. The capture used a slightly different order |
| 3 | Practice A | PowerShell refuses `mv` of a file into a folder that already holds that name |
| 4 | Practice A | All three commands, and that `november.txt` is empty after the second |
| 5 | Section 6 | The Windows `find-on-path.mjs` block is a constructed example and is labelled as one |
| 5 | Practice A and B | All four cases; `ORDERS_DIR` from the home folder was captured in both families |
| 6 | Section 2 | "The author's second run said process 36424" was a run with `--count 2`, not `--count 3` |
| 6 | Section 5 | The bare word `Killed` is what an interactive bash prints. The capture was non-interactive and read `bash: line 1: 833 Killed node tick.mjs`. zsh's interactive wording was not captured |
| 7 | Practice C | Tomás's five steps in zsh |

### 2. Cannot be checked from an agent session

- **macOS.** Nothing was run there. Each lesson says so.
- **Keypresses:** Tab completion, Ctrl+C on any system (on Linux the same signal was sent by `kill -INT`), and Ctrl+C copying selected text in VS Code on Windows.
- **PowerShell's confirmation prompt** for `rm` on a folder with contents. The lesson describes it from the documentation and says so. Its default answer being Yes needs a person to confirm.
- **Closing a terminal panel** with a program running. Lesson 6 says the author did not test it.
- **PowerShell's `$?`.** The capture method could not read it honestly, so Lesson 4 only says it answers True or False.
- **The on-screen look of standard error in a real PowerShell console.** The file contents after `2>` were captured.

### 3. Facts and links

Check each link resolves and supports the sentence before it: PowerShell `about_Quoting_Rules`, `about_Parsing`, `about_Aliases`, `about_Redirection`, `about_Automatic_Variables`, `about_Pipeline_Chain_Operators`, `about_Environment_Variables`, `Remove-Item`, `Stop-Process`; the Bash manual sections Quoting, Filename Expansion, Exit Status and Environment; Node.js `process.argv`, `process.exitCode` and signal events; VS Code terminal basics. The anchor on the `process.exitCode` link is the least certain.

### 4. Diagrams

Five Mermaid blocks, in Lessons 1, 2, 4, 5 and 6. Parse and render each with the app's Mermaid 11.17.2 in Chromium, in both themes at 375, 768 and 1440 pixels. The sequence diagram in Lesson 2 uses `<br/>` inside notes.

### 5. Activity records

Not yet cut. Each lesson has five, and every heading appears once in its lesson.

| Lesson | Prediction activity | Its feedback heading |
| --- | --- | --- |
| 1 | Predict, then run from another folder | What the two runs show |
| 2 | Predict, then run with a space in the name | Why the space broke it |
| 3 | Predict, then list before you delete | What the listing showed |
| 4 | Predict, then send the report into a file | What stayed on the screen |
| 5 | Predict, then run the unchanged command | What changed, and what did not |
| 6 | Predict, then stop it from outside | A request and a forced stop |
| 7 | Run the first two steps, and log them | The first three rows |

Plus Practice A to D in every lesson, with the feedback heading `Practice explanations`. Lesson 7 also has `Hints for Practice A`.

### 6. Review, and the rest

- **Two fresh reviewers** (ADR 0013), who see only the standard, the owner's recorded feedback, the preceding lesson *When something goes wrong*, and these drafts.
- **An ADR** for decision 1 above.
- **The module syllabus** still describes Q02 in two lines.
- **`docs/roadmap.md`**, "Current state".

## Incident on 2026-11-19

Between 16:59 and 17:06 another session ran `rm -rf content/drafts` to remove the Q01 drafts it had moved. That deleted 21 files of this set: Lessons 1 to 5 and the whole kit. All were restored by 17:10, 17 by replaying this session's own file writes from its transcript and the 4 order files from a scratch copy of the kit. The 8 restored programs are byte-identical to the copies the captures ran. Lessons 6 and 7 were written after the delete. Until this folder is committed, it has no other copy.
