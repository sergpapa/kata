# Prediction history — Milestone 2, slice 3

**Status:** criteria approved 2026-09-23. Sources: `docs/brief.md` §"What this checkpoint must do"
item 5 ("A submitted prediction is stored separately from any later correction") and its hard
constraint "**No rewritten history.** Importing a new content version must not overwrite an earlier
recorded prediction or change the question it answered"; `VS_Code_Coder_Handoff_v1.md` §"Records and
versioning" ("Importing a new version must not overwrite an earlier submitted attempt or change the
question against which it was answered"); `VS_Code_Coder_Handoff_Lessons_14_15_v1.md` §"Activities"
("Keep predictions separate from later observations and explanations") and its acceptance item 5
("Record a prediction and later explanation in a new activity, reload, and confirm their identities
and values remain intact. Earlier records must also remain attached to their original IDs");
`trial-activities.json`'s own `prediction_policy` ("Keep the original acknowledged prediction
separate from later explanation; do not hide the authored walkthrough or impose an answer
embargo"); ADR 0004 (server-acknowledged saves with compare-and-set); ADR 0011 (one live record per
field with the version stamped on each write); `docs/roadmap.md` Milestone 2 item 3.

Since slice 10 the app keeps one live record per field and replaces its text on every accepted
write. That is what the reader edits, and it is the right shape for a box — but it means the text
somebody committed to before they knew the answer is gone the moment they correct it. This slice
makes every accepted write a revision that is never edited and never deleted, and shows the reader
the earlier ones beside the box they superseded. It is also what Export has to carry: ADR 0011 says
in as many words that "a new version does not rewrite history" is honoured by the revision history
and not by the key, and until this table exists the export can only claim what the live stamp means.

## Facts established before the criteria were written

Measured against `content/releases/http-first-fifteen-v1_0_1/` and the code at commit `a3d10d5`:

- **Every one of the 45 activities declares all four fields** — `prediction`, `observation`,
  `explanation`, `help_used` — in that order. There is no activity in this release for which
  "prediction" is a special case of the storage, only of the pedagogy.
- The release carries **three distinct content versions** across its fifteen lessons: `2.0.0-draft`
  (lesson 1), `1.0.1-draft` (the two lessons the CF-001/CF-002 reissue corrected) and
  `1.0.0-draft` (the other twelve). A version named beside an earlier answer is therefore already
  informative, before any future correction moves one.
- `learner_response` has held `revision`, `content_version`, `release_id` and `candidate_lesson_id`
  since schema 4. The revision number a write takes is already the live record's own counter, so a
  revision row needs no counter of its own.
- `saveResponse` already runs both its branches inside one `db.transaction`, and both are
  conditional writes whose `changes` count decides the outcome (ADR 0004). An append inside that
  same transaction inherits that atomicity.
- `responseRepository.test.ts` pins that **`responseRepository.ts` is the only non-migration module
  in the server naming `learner_response`**, by a substring grep. `learner_response_revision`
  contains that substring, so the revision SQL belongs in that same module — which is where the
  transaction is anyway.
- `ResponseField.tsx` is **356 lines**, already over the ~350 guidance in CLAUDE.md.
- The screenshot gate boots the built app against a data directory it wipes first
  (`tools/screenshots.mjs:123`), so it can seed records through the app's own API without polluting
  anything a later run reads.

## Decisions (asked 2026-09-23, one batch — all four defaults taken)

1. **All four fields keep a revision history**, not `prediction` alone. The mechanism is identical
   for all four, the brief's "No rewritten history" is not scoped to predictions, and under the
   narrow option an owner who rewrites an observation loses the earlier one for good — with Export
   unable ever to carry it. `prediction` keeps the _pedagogical_ emphasis; the storage is uniform.
2. **Earlier versions reach the reader as a closed disclosure under the box they superseded.** A
   field with no superseded revision renders nothing at all, so a first read-through adds 0px to a
   panel the last design review already measured at 436px on a 375px phone. The disclosure is also
   this slice's first consumer of the table, which is what keeps the review honest: Export is a
   later slice, and a table with no caller can only be checked against imagined usage.
3. **A save whose text is character-for-character what the newest revision holds appends nothing.**
   The write is still accepted and the box still says Saved — nothing about the acknowledgement
   changes — but nothing about the _work_ changed either, so there is no new version of it. The
   alternative (a row per acknowledgement) is the more literal log, and it shows a reader who
   double-pressed Save a duplicate earlier version that reads as a defect.
4. **No Restore control this slice.** The earlier text is on screen, selectable and copyable by
   hand. Putting text back in a box is a copy affordance, and copy/download of unsaved text is the
   next slice's whole subject (Save failure recovery) — building one here means designing it twice.

## Decisions (not asked — recorded with reasons)

5. **The revision table is additive; `learner_response` is untouched.** No column is added, no
   constraint changes, and the compare-and-set contract of ADR 0004 and ADR 0011 is unchanged. The
   alternative — making `learner_response` itself append-only, with the live row being
   `MAX(revision)` — rewrites the key, the uniqueness constraint and the conflict path that 919
   tests currently pin, to buy nothing this slice needs.
6. **Every earlier-version line names the content version it answered.** In a release with three
   distinct versions, that pairing is the whole point of the record and the thing the owner's review
   has to be able to check. Showing it only where it differs from the current one would leave the
   common case with no provenance on screen at all, which is the defect the brief names.
7. **`releaseId` and `candidateLessonId` stay server-side**, exactly as `responseForPage` already
   keeps them. The page shows what the reader can act on; Export reads the repository directly.
8. **The client never computes history.** Both the 200 and the 409 answers of a `PUT` carry the
   field's earlier versions as the server holds them at that moment, so a page that saved twice
   without reloading, and a page whose conflict was resolved with Use stored, both show the server's
   last word rather than a list they assembled from what they remember sending.
9. **An earlier version is rendered as text, never as Markdown or HTML.** It is learner input, which
   is exactly as untrusted as content is (ADR 0005), and the conflict panel already renders stored
   text this way.
10. **`ConflictPanel` moves to its own file in this slice.** `ResponseField.tsx` is already over the
    size guidance and this slice adds to it. That is an extraction of code whose callers already
    exist, proven behaviour-neutral by the tests already on it — not new code (CLAUDE.md,
    `/feature` Stage 0).

## Assumptions

- Schema goes 4 → 5. One new table, `learner_response_revision`. Migrations 1–4 are not edited, so
  every release-import, resume-point and acknowledged-save claim already pinned still holds.
- The record store is still one local SQLite file opened by one process (ADR 0001, ADR 0002).
- A revision row's number is the number the live record took from that write. Because a no-op save
  appends nothing (decision 3), revision numbers in the history may have gaps. That is honest: the
  gap is a save that changed nothing.
- **The invariant this slice is built around:** the live record's text always equals the text of the
  newest revision row for that field. A write that changed the text appended that text; a write that
  did not append left the text equal to the previous row's.
- An unacknowledged text is never history. Typing, a failed save, and a conflict resolved by Use
  stored all record nothing, because the server never accepted any of them.
- Export is not in this slice. Save failure recovery is not in this slice.

## Existing tests this slice re-aims or retires

Recorded here before the red commit, because the standing rule is that a test is never changed to
make an implementation pass. **Three assertions move, all of them the stored schema version**, and
each is a constant the migration deliberately changes:

1. `apps/server/src/app.test.ts:73` — `toEqual({ status: 'ok', schemaVersion: '4' })` → `'5'`.
2. `apps/server/src/app.test.ts:87` — `expect(readSchemaVersion(db)).toBe('4')` → `'5'`.
3. `apps/server/src/modules/learner/responseRepository.test.ts:50` — **re-aimed, not moved.** It
   read `it('brings the schema to 4')` / `toBe('4')`, which is a claim about which migration ran
   last, and assertions 1 and 2 above are where that claim belongs. What this test is in that file
   to pin is that opening a store brings `learner_response` into existence, which every assertion
   below it depends on. It now asserts the version is **at least** 4 and that the table has
   columns, and it is renamed to say so. Nothing it used to catch goes uncaught: the exact new
   version is pinned by assertion 1, by assertion 2, and by S1 in
   `responseRevisions.test.ts`.

4. `tools/screenshots.mjs`'s "every `pre` is `white-space: pre`" check is **re-aimed at
   `.code-block` samples**, which is what it was always about — its own comment says "whitespace
   inside a code block is load-bearing in HTTP samples". Two `pre` elements on a lesson page are
   deliberately `pre-wrap`: the conflict panel's stored text, which has been so since slice 10 and
   which the gate has never rendered, and an earlier version, which V24's seeding now puts on
   lesson 1. Both are free prose the owner typed, which has to wrap in a 375px column rather than
   scroll. The narrowing is guarded: the same check now also fails if any `.code-block` holds no
   sample, so the selector cannot match nothing and report success.

The claim that nothing else moves was made by grepping for the four shapes that could break, because
the previous two slices each got this claim wrong by aiming the grep one level away from the thing
that actually broke:

- deep equality on a response or lesson payload — `toEqual({` in the four response test files hits
  only **request** bodies (`{ text, expectedRevision }`), which this slice does not change;
- assertions on `.response-field`'s children or count — all are counts of the fields themselves;
- `details`/`summary` assertions — all are in `DashboardPage`, `LabKitPanel` and `MermaidDiagram`,
  none of which this slice touches, and `MermaidDiagram.test.tsx:135`'s `closest('details') === null`
  concerns code blocks inside lesson Markdown, which never appear inside a history disclosure;
- `activityPanelStyles.test.ts`'s "paints nothing this file has not named" — satisfied by reusing
  `--muted-foreground` on `--background`, `--foreground` on `--card` and the already-named edge
  tokens. **A new token here needs a new measured pair, and that would be a fourth entry on this
  list.**

The screenshot gate's lesson-01 captures change, because V1 seeds three accepted writes on that
lesson's first activity. That is a deliberate change of what the capture shows, not a regression,
and it is named here so a reviewer reading a "Saved" state on lesson 1 knows where it came from.

## Criteria

### S — what is stored

- **S1.** The schema goes 4 → 5 through one new forward-only migration. A store created fresh and a
  store already at 4 both end at 5 with the same tables, and migrations 1–4 are byte-for-byte
  unchanged.
- **S2.** An accepted write whose text differs from the field's newest recorded revision appends
  exactly one row, carrying: the revision number the live record just took, the text character for
  character, and the `candidate_lesson_id`, `content_version` and `release_id` the server stamped on
  the live write — never anything the client supplied.
- **S3.** An accepted write whose text is character-for-character the field's newest recorded
  revision appends nothing, and the caller is still told `saved`. The live record still moves.
- **S4.** A write refused as a revision conflict appends nothing.
- **S5.** The append and the live write are one transaction. If the append fails, the live record is
  unchanged and the caller is not told the save succeeded. (Provable: the table's own uniqueness
  constraint refuses a row planted at the revision the next write will take.)
- **S6.** For any sequence of accepted writes, the live record's text equals the newest revision's
  text.
- **S7.** History survives the process. A database reopened over the same file reads back every
  revision with its original text, number, timestamp and stamp.
- **S8.** Nothing edits or deletes a revision. The repository exposes no function that does, and
  importing a corrected release leaves every existing revision row untouched with the version it was
  written under — the case the brief's "No rewritten history" names.
- **S9.** The revision rows of one field are independent of another's: writing `observation` never
  appends to, renumbers or reads `prediction`'s history, and two activities never share a history.

### A — what the server answers

- **A10.** `GET /api/lessons/:id` carries, on each stored response, `earlierVersions`: every recorded
  revision of that field **except the newest**, newest first, each with its `revision`, `text`,
  `writtenAt` and `contentVersion`. A field with one recorded revision carries `[]`.
- **A11.** The 200 answer of an accepted `PUT` carries that field's `earlierVersions` recomputed
  after the write.
- **A12.** The 409 answer of a refused `PUT` carries that field's `earlierVersions` as the server
  holds them at that moment, beside the `stored` record it already carries. Nothing was written.
- **A13.** `earlierVersions` never carries `releaseId` or `candidateLessonId`, and the server never
  reads either from the request.
- **A14.** A field the reader has typed into but never saved, and an activity with nothing stored,
  carry no `earlierVersions` entry at all rather than an empty record.

### P — what the reader sees

- **P15.** A field whose answer carries no earlier versions renders no disclosure: no summary, no
  empty container, no count of zero.
- **P16.** A field with N ≥ 1 earlier versions renders one closed `details` whose summary reads
  `Earlier versions (N)` and names its field and activity to a screen reader.
- **P17.** Opened, it lists the earlier versions newest first. Each names when it was saved, in the
  same wording the saved state uses (`at 14:02` today, `on 23 Sep at 14:02` otherwise), and the
  content version it answered; each shows its text character for character with whitespace
  preserved.
- **P18.** Saving new text moves the previously acknowledged text into the list without a reload:
  the count goes N → N+1 and the newest entry is the text that was in the box before.
- **P19.** Saving unchanged text leaves the list exactly as it was.
- **P20.** Nothing in the disclosure is editable, and there is no control that restores, edits or
  deletes an earlier version.
- **P21.** An earlier version containing Markdown or HTML appears as the characters the owner typed,
  never rendered and never executed.
- **P22.** Opening or closing the disclosure is not an edit: it never registers the field as unsaved
  and never blocks navigation.
- **P23.** The disclosure is reachable and operable by keyboard alone.

### V — visual and responsive

- **V24.** In the screenshot gate, a field seeded with three accepted writes — two distinct texts and
  one repeat — shows `Earlier versions (2)` at all three widths in both schemes, and every other
  field on that lesson shows no disclosure.
- **V25.** Opened at 375px, it makes no horizontal page scroll, and an earlier version's text wraps
  inside its own block rather than pushing the page wide.
- **V26.** Every colour the disclosure paints is a token the theme declares and this slice's style
  test measures as a pair, in both schemes.

## Explicitly not in this slice

- **Export.** It is the next-but-one item and the reason this one exists; nothing here may foreclose
  it, and `earlierVersions` is deliberately a page payload rather than the export format.
- **Copy or download of an earlier version**, and copy/download of unsaved text — the next slice.
- **Restore** (decision 4), diffing two versions, and pruning or deleting history (S8 forbids it).
- **History for the resume point.** It is a pointer, not work (ADR 0010).
- **Any change to the live record's key, the compare-and-set contract, or the five visible save
  states.**

## Slice log

**2026-09-23 — test-guardian PRE: FAIL on two findings, both taken with nothing built.**

1. **V26's test could not fail against a broken implementation.** It asked whether the string
   `.response-history` appeared anywhere in `activities.css` and whether `--card` was painted
   anywhere in the file. `--card` is already painted four times by rules that have nothing to do
   with the disclosure, so that half was true before the slice began and would stay true whatever
   the disclosure was painted with; and a substring match on a selector is satisfied by
   `.response-history {}` or by a comment. An implementation that added an empty rule and nothing
   else — a disclosure with no styling at all, which at 375px is an earlier answer running off the
   side of the page — would have gone green on `npm test`, because V25 only runs under
   `npm run screenshots`. Rewritten to read the `.response-version-text` rule's own declaration
   body, as the file's own `declarationsOf` helper already does two describes down, and to require
   the wrapping the criterion is about.
2. **P17's date assertions were satisfied by the raw wire format.** They asked for `/2020/` and
   `/\d{1,2}:\d{2}/` in the entry, and `2020-01-02T14:02:00.000Z` printed straight into the DOM
   contains both. So a test named for the wording it uses would have passed an entry that never
   reached a formatter. And the "today" half of the criterion had no fixture at all. Both closed:
   the not-today case now also refuses an ISO date, and a second test pins an entry saved today as
   a time with no date.

   The same weak shape exists in `ResponseConflict.test.tsx:359`, from slice 10. Not changed here
   — it is not this slice's test and it is not wrong, only weak — and named so it can be.

PRE also confirmed what the four server tests and two web tests that pass in the red run are: five
preservation guards and one paired negative whose positive control (`shows one on a field that does
have earlier versions`) fails correctly. It found no criterion without a test and no test without a
criterion, and read the Playwright gate checks as non-vacuous.

It independently repeated the typecheck audit this slice ran, because `apps/server/tsconfig.json`
excludes `src/**/*.test.ts` — **server test files are never typechecked by `npm run typecheck`**,
which is the gap that hid six TS2554 errors in the previous slice. The only errors in this slice's
new server tests were the intended missing export and four consequent implicit-`any` parameters.
