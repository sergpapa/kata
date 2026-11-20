# Q02 draft set

Drafts of module Q02 of the QA Automation Engineering course, "Terminal and local program operation". Q02 is the full-stack module M002, shared unchanged (`docs/courses/qa-automation/Module_Syllabus_v0_1.md`), so the lessons carry M002 IDs, no lesson number in their titles, and refer to no QA-only lesson. Nothing here is in a release.

**State on 2026-11-20: written, reviewed by two fresh reviewers, revised, and every command re-run against the revised text. Not packaged, and not read by the owner.** The remaining work is under "Still to do". The 2026-11-20 revision is in the working tree and was not committed by the session that made it.

## What is here

| Module order | Lesson ID | File | Title | Words |
| --- | --- | --- | --- | --- |
| 1 | `LS-M002-01` | `lessons/M002_Lesson_01_Student_Edition_v1.md` | Where the terminal is standing | 5,012 |
| 2 | `LS-M002-02` | `lessons/M002_Lesson_02_Student_Edition_v1.md` | What a program receives | 5,369 |
| 3 | `LS-M002-03` | `lessons/M002_Lesson_03_Student_Edition_v1.md` | Change files without regret | 4,851 |
| 4 | `LS-M002-04` | `lessons/M002_Lesson_04_Student_Edition_v1.md` | Output, messages and the exit code | 5,464 |
| 5 | `LS-M002-05` | `lessons/M002_Lesson_05_Student_Edition_v1.md` | The settings a program is handed | 5,562 |
| 6 | `LS-M002-06` | `lessons/M002_Lesson_06_Student_Edition_v1.md` | Programs that keep running | 5,462 |
| 7 | `LS-M002-07` | `lessons/M002_Lesson_07_Student_Edition_v1.md` | It worked on their computer | 5,930 |

All seven use one kit, `labs/terminal-practice-kit`. Word counts exclude front matter and include practice explanations and the troubleshooting section. The revision added 200 to 450 words to each lesson. `verification/` holds the command list for each lesson and the two scripts that run a list in one shell session.

## Decisions behind the set

Decisions 1 and 2 are the owner's, from 2026-11-19, and are recorded in ADR 0024.

1. **PowerShell and bash/zsh side by side.** Each idea is taught once, on a Node.js kit that behaves the same everywhere. Where the typing differs, the lesson shows a block for each shell family, with the shell's name on a line above the block. The learner keeps the shell VS Code gave them.
2. **Seven lessons, one kit, the whole module.**
3. **One program runs through the module** (`check-orders.mjs`), and each lesson shows another side of it: where it looks for files, its arguments, its two streams and exit code, its settings, and in Lesson 7 all of them at once.
4. **Every lesson opens with a developed familiar situation**: directions over the phone, an order slip, a clearance crew, a delivery, a handover sheet, a recipe and a pan, a note about the heating.
5. **Lesson 7 is the module's exit task** from `Curriculum_Architecture_v1_1.md`: reproduce and repair a path or environment problem using a short command log. It is practice, not a demonstration, because full explanations are open.
6. **Topics left out on purpose**, each named in a lesson's `deferred` list: permanent settings and `.env` files, background jobs, ports, signals in depth, scripts, text encodings, and a quotation mark inside an argument.
7. **`ORDERS_DIR` is a second place to look, not a replacement for the current folder** (changed 2026-11-20). The checker joins a relative name to the current folder first, and tries `ORDERS_DIR` only when nothing is there. Before the change, Dana's note in Lesson 7 could not have worked on her own computer.

## Review on 2026-11-20

Two reviewers read commit `25c3193` in separate sessions, as ADR 0013 asks. Neither saw this file or the roadmap. One walked the lessons as the learner against the authoring standard and the owner's recorded feedback (2 blockers, 10 major, 18 minor). The other checked every technical claim against the kit and the shells (3 blockers, 7 major, 18 minor). The author re-ran every command at the same time and found 9 of the same defects independently.

**Taken, most serious first:**

| Where | What was wrong | What changed |
| --- | --- | --- |
| Lesson 7, kit | With `ORDERS_DIR` set as the explanation says, Dana's steps 3 and 4 fail with `data\data` in the path | Decision 7. Help text, `--settings`, Lesson 5 Practice B and Lesson 7 Part 1 follow it |
| Lesson 2 §6 | The heading said the shell fills in before it cuts. It cuts first | Heading and text corrected. bash's second cut of an unquoted variable is shown from a run |
| Lessons 5 and 6 | `# bash or zsh` as the first line of a code block. Interactive zsh does not treat `#` as a comment (confirmed in a zsh terminal) | Labels moved above the blocks |
| Lesson 3 §7, kit | From inside `sandbox` on Windows, the reset crashed with `EPERM` and left the folder half deleted | `reset-sandbox.mjs` refuses from inside `sandbox` on every system. The lesson has the learner try it |
| `.gitignore` | Line 8, `data/`, hid the kit's four order files from git | Now `/data/`. The files show as untracked |
| Lesson 4 | Standard input, `echo` and "fields" were used before they were taught. The order file was never shown | The lesson prints the file and defines a field first, teaches standard input before the pipe, explains `echo $?`, and has a pause point |
| Lesson 5 | The pocket-note transcript gave the opposite result where it stood, because the variable was still exported | The variable is removed first. An exported variable staying exported is stated |
| Lesson 7, template | "The last two columns" did not exist, and a table cell cannot hold PowerShell's six-line messages | The template has six content columns and a "Full output" section. The lesson shows one filled row |
| Lessons 4, 5, 7 | Ubuntu's helper changes the "command not found" message | Stated where each message is shown |
| Lesson 2 | Curved quotation marks, `&`, `~` and `#` were described wrongly for PowerShell or zsh | The character table is cut to what the lesson uses. The rest is corrected from runs |
| Lesson 1 | "No exceptions" was contradicted later. The scene was not mapped | Reworded, with a mapping table and the one limit of the comparison |
| All | The author's limits ("could not capture") sat in the student text | Moved to each lesson's `runtime_target` |
| All | No way to tell Windows PowerShell 5.1 from PowerShell 7 | Lesson 1 shows `$PSVersionTable.PSVersion`. Each lesson names where 7 is documented to differ |
| Kit | `node.EXE` printed where the lesson shows `node.exe`. `tick.running` had no final newline. "Tomás" printed as mojibake from `cat` in PowerShell 5.1 | Fixed. The name is spelled Tomas everywhere |
| Links | Four of 17 did not support the sentence beside them | Moved to a sentence they support, or removed. The `process.exitCode` anchor is `#processexitcode-1` |

Smaller ones taken: a route for a learner who already uses a terminal, at the top of Lessons 1 to 6. Lessons named by title, never by position. "Signal" defined. The marker explained as a stand-in for a port. Reused process numbers. `type ls` after the PATH repair. The Lesson 3 failed-delete block recaptured on the right file. `/bin` as a second name for `/usr/bin` in the PATH example.

**Declined, with the reason:**

- **Split Lesson 4 in two.** Decision 2 is the owner's. The lesson has a pause point between streams and exit codes.
- **Graduated hints in Lessons 1 to 6.** The reference lesson (HTTP Lesson 1) has none either. Lesson 7 has them where the task is independent.
- **A stale `tick.running` in Tomas's note, so that the exit task uses Lesson 6.** The module's exit task is a path or environment problem. A process step would be a third thing to find in a note that already has five.
- **A primary source for each zsh fact and for `kill` sending a request.** The zsh facts rest on the author's runs. The Bash manual section on `kill` answered HTTP 429 twice and was not read.
- **`find-on-path.mjs` following PowerShell's preference for `.ps1`.** Its header comment now says it does not. The lessons use it for `node` only.

**Found outside this set:** `M001_Lesson_02` in the Q01 release shows `bash: nod: command not found` with no note that Ubuntu words it differently. That is a finding for the next Q01 reissue.

## For the owner, at a keyboard

No agent session can press these. Each takes under a minute, in VS Code's terminal on Windows.

1. **Tab completion** (Lesson 1 §5): type `cd da` and press Tab. PowerShell's own completion engine answered `.\data`.
2. **PowerShell's question before deleting a folder** (Lesson 3 §6): in `sandbox`, `rm archive/2026-12` with files in it. The lesson says the choices begin `[Y] Yes  [A] Yes to All  [N] No` and that the default is Yes.
3. **Ctrl+C on Windows** (Lesson 6 §3): `node tick.mjs`, then Ctrl+C. Expect the closing line ending "Marker removed". A reviewer sent a console Ctrl+C event to it on Windows and got that line. On Linux it was sent through a terminal.
4. **Ctrl+C with text selected** in VS Code's terminal copies instead of stopping (Lesson 6 §3).
5. **Closing the terminal panel with `tick.mjs` running** (Lesson 6 §6): check afterwards for the process and the marker.
6. **`>>` after an open quotation mark** in PowerShell (Lesson 2, "If something does not match").

Nothing was run on macOS or in PowerShell 7.

## Packaging brief

- **Archive and lab ID.** The lessons name the archive, so the name is fixed: `Terminal_Practice_Kit_v1.zip`, top folder `terminal-practice-kit`, proposed lab ID `M002-LAB-01`, serving all seven lessons.
- **`manifest.json`** is listed in the kit's README and must be created at packaging.
- **Leave out of the archive:** `sandbox/`, `tick.running`, and any `report*.txt`, `messages.txt`, `november.txt` or `october-*.txt` left by a test run. `verification/` is not part of the kit.
- **`data/archive/orders 2025.csv` has a space in its name on purpose.** The packaging tool and the archive must keep it.
- **The kit's `data/` folder must be added to git.** It was ignored until 2026-11-20. The same rule would have ignored it under `content/source/`.
- **No file in the kit needs an execute permission**, by design, so an archive built on Windows works on macOS and Linux.
- **Activity records are not yet cut.** Each lesson has five, and every heading appears once in its lesson.

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

## How the output in the lessons was produced

Every block marked as the author's run was captured, not written from memory, on:

- **Windows 11, Windows PowerShell 5.1, Node.js v24.12.0.** Commands were fed to `powershell.exe -NoProfile -Command -` one line at a time (`verification/run-powershell.sh`).
- **Ubuntu 24.04 in WSL, bash 5.2.21 and zsh 5.9, Node.js v24.22.3.** Commands were fed to `bash --norc --noprofile -s` and `zsh -f -s` (`verification/run-bash-or-zsh.sh`). Node.js and zsh were unpacked into a cache folder in WSL (`~/.cache/educode-m002`), not installed. That folder can be deleted.

Those Linux sessions are not interactive and read no start-up files. So they show none of what a system adds: Ubuntu's suggestions after "command not found", aliases, and zsh's handling of `#` at a prompt. Four things were captured in an interactive shell on a real terminal instead: Ctrl+C in bash and zsh, the `Killed` line in bash and zsh, and `#` at a zsh prompt.

The home folder was renamed to the example user maria's in every block. Two things were removed that only the capture method added: a `line N:` inside bash's own messages, and wrapped long lines in PowerShell tables. The Windows `find-on-path.mjs` block in Lesson 5 is a constructed example and is labelled as one.

On 2026-11-20 all 12 command lists were run in all three shells before the revision and again after it. The only differences between the two runs are the kit changes listed above.

## Still to do

1. **Commit.** The revision, the kit's `data/` folder, `verification/` and ADR 0024 are uncommitted. Until they are, this folder's data files have no other copy.
2. **Diagrams.** Five Mermaid blocks, in Lessons 1, 2, 4, 5 and 6. A reviewer parsed all five with the app's Mermaid 11.17.2. None has been rendered. Render each in the app in both themes at 375, 768 and 1440 pixels (`npm run screenshots`, once the lessons are in a release). The sequence diagram in Lesson 2 uses `<br/>` inside notes.
3. **Packaging**, as the brief above: cut the 35 activity records, add the manifest, move lessons and kit into `content/source/qaae/`, build the next QA release, point the app and its tests at it.
4. **The module syllabus** still describes Q02 in two lines.
5. **The owner's reading**, and the six keyboard checks above.

## Incident on 2026-11-19

Between 16:59 and 17:06 another session ran `rm -rf content/drafts` to remove the Q01 drafts it had moved. That deleted 21 files of this set: Lessons 1 to 5 and the whole kit. All were restored by 17:10, 17 by replaying this session's own file writes from its transcript and the 4 order files from a scratch copy of the kit. The 8 restored programs were byte-identical to the copies the captures ran. Lessons 6 and 7 were written after the delete.
