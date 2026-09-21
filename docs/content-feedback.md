# Content feedback for the release owner

Every proposed change to the authored lesson content, in one place, ready to hand back.

The handoff (`VS_Code_Coder_Handoff_v1.md` §4, "Versioning and ownership") says: _"Return any
proposed teaching change to the owner with the exact original and proposed text."_ This file is
where those accumulate between reviews, so the handover is a copy of this file rather than a
reconstruction from four slice logs.

**Nothing here has been applied.** The release is the source of truth and every lesson's SHA-256 is
pinned in `content/learning-release.json`; the application reads the content it was given and
changes none of it. Accepting any entry below requires a reissued release — see _What accepting
costs_ at the bottom.

## Status

| ID     | Lesson | Kind             | One line                                           | Status               |
| ------ | ------ | ---------------- | -------------------------------------------------- | -------------------- |
| CF-001 | 2      | Diagram (breaks) | `;` in a Mermaid message stops the diagram drawing | Open — owner to rule |

Kinds: **breaks** — the reader sees a degraded page until it is fixed. **teaching** — the page
renders, but the content could read better. **cosmetic** — presentation only.

---

## CF-001 — Lesson 2's sequence diagram cannot be drawn

**Lesson:** 2, _Give the browser an address—and something to answer_ (`LS-M020-02`)
**File:** `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md`, line 418, inside the `mermaid`
fence that opens at line 410 (§10, "Follow the file and process over time")
**Kind:** breaks — the reader gets the diagram's source code where the picture should be
**Found:** 2026-09-11, Milestone 1 slice 3
**Status:** open

Exact original:

```
    Server-->>Terminal: Stopped; the file remains
```

Proposed:

```
    Server-->>Terminal: Stopped, the file remains
```

**Why.** Mermaid's sequence-diagram grammar reads `;` as a statement separator, exactly as it reads
a newline. The message text therefore ends at `Stopped`, and `the file remains` is parsed as a new
statement with no arrow in it. The parser's own words:

```
Parse error on line 15:
...ed; the file remains    Learner->>Brows
-----------------------^
Expecting '()', 'SOLID_OPEN_ARROW', 'DOTTED_OPEN_ARROW', 'SOLID_ARROW', ... got 'NEWLINE'
```

**Verified.** With the comma, the diagram renders at 969.5 × 704. An em dash (`Stopped — the file
remains`) works equally well if the stronger break reads better; the only character that must go is
the semicolon.

**What the reader sees until then.** The lesson is readable and loses no teaching: the page shows a
line saying the diagram could not be drawn, the diagram's source in a labelled block, and the
parser's reason behind a disclosure. Lessons 1 and 5 draw their diagrams normally — this is the
only one of the three affected.

---

## What accepting a change costs

A one-character edit to a lesson is not a one-file change, because the release is content-addressed.
For CF-001, four things move together:

1. `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md` — the edit itself.
2. That lesson's `sha256` in `content/learning-release.json` (currently `38a49d31…`). Without this
   the import refuses the file outright: _"is not the file the release describes"_
   (`apps/server/src/modules/content/releaseFiles.ts:114`).
3. The same lesson file inside the Lesson 2 lab kit, which carries its own copy at
   `content/labs/HTTP_Lesson_02_Local_Server_Kit_v1/http-lesson-02-lab/`.
4. The kit's zip and its `sha256` in `lab_downloads` (currently `5a6b0898…`), since the zip's bytes
   change with the file inside it.

That is a release reissue, and the release version should move with it. It is the owner's call, not
the implementation's.

## Adding an entry

Next free ID, appended in order. Keep the shape: lesson and file with a line number, the kind, the
**exact** original and proposed text in fenced blocks, the reason stated so someone who does not
know the tooling can judge it, and what the reader sees meanwhile. Add the row to the status table.
Exact text is the point — the owner has to be able to accept an entry by applying it verbatim.
