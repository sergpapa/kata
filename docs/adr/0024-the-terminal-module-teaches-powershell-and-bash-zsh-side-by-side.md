# 0024. The terminal module teaches PowerShell and bash/zsh side by side, on one kit

Date: 2026-11-20
Status: Accepted

## Context

Module M002, "Terminal and local program operation", is shared unchanged by the full-stack course
and the QA course (Q02). Its learners work in VS Code's terminal on their own machine. On Windows
that terminal runs PowerShell. On macOS it runs zsh, and on Linux bash or zsh. The module's topics
(paths, arguments and quoting, streams, exit codes, environment variables, processes) behave the
same in all of them, and are typed differently in several places. The owner decided how to handle
that on 2026-11-19, before the lessons were drafted. This record was written the day after.

## Decision

Points 1 and 2 are the owner's, from 2026-11-19. Points 3 and 4 were added by the author after the
review on 2026-11-20 and are the owner's to overturn.

1. **Each idea is taught once, on a Node.js kit that behaves the same on every system.** Where the
   typing differs, the lesson shows a labelled block for each shell family: PowerShell, and bash or
   zsh. The learner keeps the shell VS Code gave them.
2. **The module is seven lessons on one kit**, `Terminal_Practice_Kit_v1.zip` (`M002-LAB-01`). One
   program, `check-orders.mjs`, runs through it, and the seventh lesson is the module's exit task.
3. **The label for a shell sits above a code block, never inside it as a `#` comment.** Interactive
   zsh, the macOS default, does not treat `#` as a comment, so a pasted label line fails there
   (found in review on 2026-11-20).
4. **Windows PowerShell 5.1 is the reference on Windows**, because it is what Windows ships and what
   the author can run. The first lesson shows how to tell 5.1 from PowerShell 7, and each lesson
   names the places where 7 is documented to differ.

## Alternatives considered

- **Git Bash for everyone on Windows.** Rejected by the owner: it shows Windows paths as
  `/c/Users/...`, which is not what the rest of the learner's tools print, and it installs Git two
  modules before Git is taught.

No other alternative is on record.

## Consequences

Easier: a learner on any of the three systems follows the same lesson, and meets the real
differences between shells (wildcards, `&&`, how a variable is set, a request against a forced stop)
as subject matter. Instructions that work in one shell and fail in another are the material of the
exit task.

Harder: every command must be run in three shells before a release, and a lesson is longer wherever
the shells differ. Nothing was run on macOS or in PowerShell 7, so those claims rest on documentation
and are marked as such in each lesson's `runtime_target`. A few steps need a keypress no agent
session can make (Tab completion, Ctrl+C on Windows, PowerShell's confirmation prompt): the owner's
reading is the check for those. Later modules that are shell-heavy (Git, containers, continuous
integration) inherit the question. Revisit if the owner finds the side-by-side blocks tiring to
read, or when a module needs a shell feature PowerShell lacks.
