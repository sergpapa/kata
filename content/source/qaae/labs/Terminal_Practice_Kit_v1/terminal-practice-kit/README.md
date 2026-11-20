# Terminal practice kit

Start with the lesson **Where the terminal is standing**. The seven lessons of the terminal module use this one folder, and each lesson explains the steps below.

This folder holds eight small programs, a few files of invented orders, two handover notes and one template. Node.js runs the programs. There is nothing to install inside this folder and nothing here uses the internet.

## Files

| File or folder | Purpose | Lesson |
| --- | --- | --- |
| `where.mjs` | Shows where a path leads from the terminal's current folder | Where the terminal is standing |
| `show-args.mjs` | Prints exactly the arguments it received | What a program receives |
| `reset-sandbox.mjs` | Builds, or rebuilds, the practice folder `sandbox` | Change files without regret |
| `check-orders.mjs` | Checks one file of orders. The program most lessons return to | Most lessons |
| `keep-lines.mjs` | Passes on only the lines that contain a word | Output, messages and the exit code |
| `show-env.mjs` | Prints the environment variables you name | The settings a program is handed |
| `find-on-path.mjs` | Walks the PATH list looking for a program by name | The settings a program is handed |
| `tick.mjs` | Keeps running and prints a line each second | Programs that keep running |
| `data/` | Three months of invented orders, and `archive/orders 2025.csv`, whose name contains a space on purpose | Most lessons |
| `handover/` | Two sets of instructions that worked on somebody else's computer | It worked on their computer |
| `Command_Log_Template.md` | The headings for your command log. Save your copy outside this folder | It worked on their computer |
| `manifest.json` | Version and file identities, for authors and course tooling | |

## What the programs change

Most of them only read and print. Two leave something behind, and so can a command of your own:

- `reset-sandbox.mjs` deletes and rebuilds the folder `sandbox` beside it, and nothing else. It refuses to start while the terminal is standing inside `sandbox`.
- `tick.mjs` keeps a small file named `tick.running` in this folder while it runs.
- When a lesson asks you to send output into a file, such as `report.txt`, that file appears in the folder the terminal is standing in.

## Reset

Delete this folder and extract the ZIP again. Keep your `recovery-note.md` and your `command-log.md` outside this folder so that a reset does not remove them.

## Scope

The author ran the programs on Windows 11 with Node.js v24.12.0 in Windows PowerShell 5.1, and on Ubuntu 24.04 inside Windows (WSL) with Node.js v24.22.3 in bash 5.2 and zsh 5.9. The Linux runs fed commands to a shell started without its start-up files, so they show none of the extras a system adds, such as Ubuntu's suggestions after "command not found". Nothing was run on macOS or in PowerShell 7, and no learner has used the kit yet.
