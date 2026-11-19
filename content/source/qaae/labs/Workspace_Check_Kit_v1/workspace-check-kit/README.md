# Workspace check kit

Start with the lesson **Set up a safe workspace**. It explains every step below. The lesson **When something goes wrong** uses this same folder afterwards.

This folder holds two very small programs and one template. Node.js runs the programs. There is nothing to install inside this folder and nothing here uses the internet.

## Files

| File | Purpose |
| --- | --- |
| `check-workspace.mjs` | Prints a short report about your setup: Node.js version, operating system, current folder, whether the folder looks synced, write permission, memory and free disk space |
| `greeting.mjs` | Prints two lines. The second lesson asks you to break it on purpose and repair it |
| `Recovery_Note_Template.md` | The headings for your recovery note. Save your copy outside this folder |
| `manifest.json` | Version and file identities, for authors and course tooling |

## Command reminder, after reading the lessons

Open this folder in VS Code, open a new terminal, and run:

```sh
node --version
node check-workspace.mjs
node greeting.mjs
```

## What the check changes

`check-workspace.mjs` creates one file named `.workspace-check-write-test` in this folder, reads it back and deletes it. It changes nothing else.

## Reset

Delete this folder and extract the ZIP again. Keep your `recovery-note.md` outside this folder so that a reset does not remove it.

## Scope

The author ran both programs on Windows 11 with Node.js v24.12.0. macOS and Linux runs, and use by a learner, have not been checked yet.
