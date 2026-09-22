# Content feedback for the release owner

Every proposed change to the authored lesson content, in one place, ready to hand back.

The handoff (`VS_Code_Coder_Handoff_v1.md` §4, "Versioning and ownership") says: _"Return any
proposed teaching change to the owner with the exact original and proposed text."_ This file is
where those accumulate between reviews, so the handover is a copy of this file rather than a
reconstruction from four slice logs.

**Nothing here is ever applied by this repo.** The release is the source of truth and every
lesson's SHA-256 is pinned in `content/learning-release.json`; the application reads the content it
was given and changes none of it. Accepting an entry requires a reissued release from the author —
see _What accepting costs_ at the bottom. The `1.0.1-draft` reissue (2026-09-21) accepted both
entries below; they stay here as the record of the loop closing.

## Status

| ID     | Lesson | Kind             | One line                                                             | Status                                             |
| ------ | ------ | ---------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| CF-001 | 2      | Diagram (breaks) | `;` in a Mermaid message stops the diagram drawing                   | **Accepted** in `1.0.1-draft`, imported 2026-09-21 |
| CF-002 | 7      | Teaching         | A prerequisite names `LS-M020-06` where the learner reads "Lesson 6" | **Accepted** in `1.0.1-draft`, imported 2026-09-21 |

Kinds: **breaks** — the reader sees a degraded page until it is fixed. **teaching** — the page
renders, but the content could read better. **cosmetic** — presentation only.

---

## CF-001 — Lesson 2's sequence diagram cannot be drawn

**Lesson:** 2, _Give the browser an address—and something to answer_ (`LS-M020-02`)
**File:** `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md`, line 418, inside the `mermaid`
fence that opens at line 410 (§10, "Follow the file and process over time")
**Kind:** breaks — the reader gets the diagram's source code where the picture should be
**Found:** 2026-09-11, Milestone 1 slice 3
**Status:** accepted in `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft`, imported 2026-09-21

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

**2026-09-21.** The two releases received since (`FSSE-HTTP-FIRST-EIGHT`,
`FSSE-HTTP-FIRST-THIRTEEN`, both dated 2026-09-18) carry Lesson 2 byte-identical, so the defect
ships unchanged in the release the app now imports. Accepting this entry means taking it into the
_next_ reissue.

**What the reader sees until then.** The lesson is readable and loses no teaching: the page shows a
line saying the diagram could not be drawn, the diagram's source in a labelled block, and the
parser's reason behind a disclosure. Lessons 1 and 5 draw their diagrams normally — this is the
only one of the three affected.

**2026-09-21, accepted.** `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` ships the proposed comma
(`Stopped, the file remains`), lesson version `1.0.1-draft`, with the nested kit copy and both
hashes advanced together — exactly the four-part move "What accepting costs" describes, authorized
in the package's `content-corrections.json`. Verified drawn in real Chromium (Mermaid 11.17.2) at
three widths in both schemes by the screenshot gate.

---

## CF-002 — Lesson 7's prerequisite speaks in stable IDs

**Lesson:** 7, _Add opening hours—and check the promise_ (`LS-M020-07`)
**File:** `content/lessons/HTTP_Lesson_07_Student_Edition_v1.md`, line 10, in the front-matter
`prerequisites` list (thirteen-release copy; the same bytes ship in the 6–8 release)
**Kind:** teaching — the page renders, but the learner is shown an internal identifier
**Found:** 2026-09-21, Milestone 1 slice 5
**Status:** accepted in `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft`, imported 2026-09-21

Exact original:

```
  - "Follow path/method conditions, helper calls, and return in LS-M020-06"
```

Proposed:

```
  - "Follow path/method conditions, helper calls, and return in Lesson 6"
```

**Why.** The front-matter `prerequisites` are learner-facing: the app shows them in the lesson's
facts panel under "Before you start". `LS-M020-06` is the release's stable ingestion key — every
other prerequisite in all thirteen lessons speaks in the learner's terms ("Lesson 6", "Save a
source file…"), and this is the only place a stable ID appears in learner-facing front-matter
prose. A learner has no way to resolve it.

**What the reader sees until then.** The facts panel shows the line as authored, ID included. The
app deliberately does not rewrite it: showing the author's own words is the rendering contract,
and this register is where the wording question goes instead.

**2026-09-21, accepted.** `FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft` ships the proposed wording
("Lesson 6"), lesson version `1.0.1-draft`; the facts panel now shows it, pinned by a test in
`apps/server/src/modules/content/lessonView.test.ts`.

---

## What accepting a change costs

A one-character edit to a lesson is not a one-file change, because the release is content-addressed.
For CF-001, four things move together:

1. `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md` — the edit itself.
2. That lesson's `sha256` in `content/learning-release.json` (currently `38a49d31…`). Without this
   the import refuses the file outright: _"is not the file the release describes"_
   (`apps/server/src/modules/content/releaseFiles.ts:114`).
3. The same lesson file inside the Lesson 2 lab kit, which carries its own copy at
   `http-lesson-02-lab/` inside the kit zip.
4. The kit's zip and its `sha256` in `lab_downloads` (currently `5a6b0898…`), since the zip's bytes
   change with the file inside it.

That is a release reissue, and the release version should move with it. Since 2026-09-21 the
releases are cumulative — the same lesson bytes and kit zip ship in `FSSE-HTTP-FIRST-FIVE`,
`FSSE-HTTP-FIRST-EIGHT` and `FSSE-HTTP-FIRST-THIRTEEN` — so a reissue applies the edit to whichever
release is then current; the app imports one release directory at a time and does not need the
superseded manifests changed. It is the owner's call, not the implementation's.

## Adding an entry

Next free ID, appended in order. Keep the shape: lesson and file with a line number, the kind, the
**exact** original and proposed text in fenced blocks, the reason stated so someone who does not
know the tooling can judge it, and what the reader sees meanwhile. Add the row to the status table.
Exact text is the point — the owner has to be able to accept an entry by applying it verbatim.
