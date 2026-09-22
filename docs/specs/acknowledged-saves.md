# Acknowledged saves — Milestone 2, slice 2

**Status:** criteria approved 2026-09-22. Sources: ADR 0004 (a save is acknowledged by the server,
and writes are compare-and-set); `docs/brief.md` v1 scope item 6 and its "no false save" hard
constraint; REQ-46 ("Honest saving and conflict recovery") and UX-03 in
`Application_Requirements_and_UX_Specification_v1.md`; acceptance case AC-03; the
`VS_Code_Coder_Handoff_v1.md` §6 checks "Save, refresh, restart" and "Simulate a save failure";
`trial-activities.json`'s own `prediction_policy`; `docs/roadmap.md` Milestone 2 item 2.

Slice 9 put 45 activity panels beside their sections and said, in the panel, that the app could not
store an answer. This slice makes that sentence false and removes it. Each panel gets the four
writing surfaces its author declared, and every one of them is backed by a server write the reader
can see land — or see refused, with their text still in front of them.

## Facts established before the criteria were written

Measured against `content/releases/http-first-fifteen-v1_0_1/content/trial-activities.json` and the
code as it stands at commit `3edefec`:

- 45 activities, 3 per lesson, across all 15 lessons. All 45 declare **the same four**
  `response_fields`, in the same order: `prediction`, `observation`, `explanation`, `help_used`.
  That is 180 recorded fields in the shipped release, 12 per lesson.
- The file's `presentation` rule is about placement and was satisfied in slice 9. Its
  `prediction_policy` — "Keep the original acknowledged prediction separate from later explanation"
  — is satisfied here by `prediction` and `explanation` being separate records that cannot
  overwrite each other, and completed in the next slice, where an acknowledged prediction becomes
  its own revision.
- `attempt_provenance` ("The app records supplied-example study versus learner-reported local
  observation; an export alone does not independently verify execution") is an **export** concern
  and is not built here. It is named so the next reader does not think it was missed.
- The schema is at version 3 (`migrations.ts`, migration 3 `resume_point`). There is no table for
  learner work. This slice adds migration 4 and moves the schema to 4.
- `theme.css` declares no `--input` token. `docs/specs/visual-design-integration.md` C2 records why
  (the published `#c8d1e4` measures 1.53:1 on white, where WCAG 1.4.11 asks 3:1 of a control's
  boundary) and names the replacements already measured: `#767f93` at 4.02:1 on white and 3.75:1 on
  the canvas; `#5c6b94` at 3.07:1 on the dark card. That debt comes due here, in this slice, because
  this slice adds the first input.
- `navigate()` in `route.ts` is the single choke point for in-app navigation; `RouteLink` is the
  only caller path a reader can click. `popstate` reaches the route store directly.
- `ActivityPanel` renders `activity-asks` ("This activity asks for …") and `activity-no-store`
  ("The app cannot store any of it yet…"). Both are replaced by the fields themselves.

## Decisions (asked 2026-09-22, one batch — all four defaults taken)

1. **A save covers one field.** Each of the four `response_fields` is its own stored record with its
   own revision, its own Save action and its own state. ADR 0004 says every recorded field is a
   server write; UX-03 says "Predictions have a labeled response field, Save prediction action and
   acknowledged-save state. Observation/reflection is separate"; AC-03 requires the original
   prediction and the later reflection to "remain distinct". A per-activity record would have to be
   split again next slice to make a prediction independently immutable.
2. **One live record per field, with the version stamped on each write.** The record is keyed by
   `(activity_id, field_name)`. Every accepted write records the `candidate_lesson_id`,
   `content_version` and `release_id` it was made under — which is the context export carries. An
   authorized correction (the 1.0.1 reissue is the precedent) therefore leaves the owner's answer on
   screen and editable rather than presenting an empty box beside a read-only ghost. "A new version
   does not rewrite history" lands in the next slice, where each revision carries its own version.
3. **A conflict shows both texts and the reader chooses.** On a revision mismatch the field enters a
   conflict state showing what is stored now and what the reader typed, with **Keep mine** and **Use
   stored**. Keep mine re-sends against the stored revision — a deliberate overwrite the reader
   asked for, which is not the silent one ADR 0004 forbids. Nothing is discarded without a click.
4. **Leaving a lesson with unsaved text stops and asks.** A dialog names what is unsaved and offers
   Stay or Leave anyway. Honest labelling alone would let typed work vanish on a link click; this
   slice's goal is that work survives.

## Decisions (not asked — recorded with reasons)

- **Saving is an explicit action, never a timer.** No autosave, no debounce. ADR 0004's rejected
  alternative is optimistic local-first precisely because it shows a state the write has not earned;
  a debounce is the same failure with a shorter window, and it makes "unsaved" mean "unsaved, or
  about to be saved, or being saved" — three things in one word.
- **Five visible states, not four.** REQ-46 distinguishes "local editing, saving, acknowledged save,
  offline/failed save and conflicting revisions". The roadmap's four plus "a visible conflict path"
  is the same list. A conflict rendered as a generic failure would tell the reader to retry, and
  retrying is the one thing that must not silently work.
- **The client never sends the lesson, content version or release.** It sends the field's text and
  the revision it believes it is editing. The server derives everything else from the activity in
  the imported release. A client-supplied provenance is a provenance the client can get wrong, and
  this is the record the owner review depends on.
- **Stored responses ride on the lesson answer, not a second request.** `GET /api/lessons/:id`
  gains a `responses` array. The page already blocks on that request, so the boxes are drawn once,
  filled — a box that renders empty and fills a moment later reads as work that was lost and came
  back, which is a lie in the other direction.
- **A field the activity does not declare is refused, by name.** The author's `response_fields` is
  the contract for what this app may record against an activity; storing anything else would put a
  field in the export that no activity asked for.
- **Text is bounded at 100,000 characters and a longer save is refused, by name.** The reader keeps
  their text and is told why it was not stored. Silent truncation would be a false save of a
  different shape — the server acknowledging something other than what it was sent.
- **An empty save is a save.** Clearing a previously stored field and pressing Save stores the empty
  string at a new revision. It is an edit the reader made, and refusing it would leave no way to
  withdraw an answer.
- **Rows for activities a later release drops are kept, not deleted.** They are simply not shown.
  Nothing in this app deletes learner work; the append-only rule in `docs/brief.md` covers content,
  and the same restraint is right here.
- **Back and forward are guarded the same way as a link.** `popstate` restores the address it left
  and opens the same dialog; Leave anyway then performs the navigation. A guard that only catches
  clicks would let the commonest way out of a lesson — the back button — drop the work silently.
- **A refresh or a tab close gets the browser's own prompt**, via `beforeunload`, registered only
  while something is unsaved. The app cannot draw its own dialog there, and the browser's is
  honest.
- **The state line is a polite live region per field.** Twelve regions per lesson sounds like a lot;
  each changes only when the reader acts on that field, so nothing is announced that the reader did
  not just cause.
- **The panel stops saying what the activity asks for.** With four labelled fields on screen, the
  sentence "This activity asks for your prediction, what you observed …" names what the reader is
  looking at. It goes.

## Assumptions

- Schema goes 3 → 4. One new table, `learner_response`. No existing table is altered or dropped, so
  every release-import and resume-point claim already pinned still holds.
- The record store is the same single local SQLite file, opened by one process (ADR 0001, ADR 0002).
  Compare-and-set is therefore about two browser tabs, not two servers — which is exactly the case
  REQ-46 and AC-03 name.
- Revisions start at 1 on the first acknowledged write. A client that believes nothing is stored
  sends `expectedRevision: 0`.
- Copy-to-clipboard and download of unsaved text are **not** in this slice. They are the roadmap's
  own next-but-one item, "Save failure recovery". Here, a failed save keeps the text in the box,
  names the failure and offers Save again.
- Prediction immutability and history are **not** in this slice. Nothing here may foreclose them:
  per-field records and a per-write version stamp are what the next slice appends revisions to.
- Export is not in this slice.

## Existing tests this slice re-aims or retires

Recorded here before the red commit, because the standing rule is that a test is never changed to
make an implementation pass. These four are changed because **the spec deliberately removes the
behaviour they pinned** — F9 takes the panel's two sentences away — and each one's underlying claim
is named below with where it now lives. None of them is weakened.

1. `ActivityPanelCopy.test.tsx` — _"names what the activity asks for, in the file's own order"_.
   **Re-aimed, claim strengthened.** The prose sentence goes; the claim it protected (the author's
   own field order is what the reader meets) moves to F1, where it is asserted over the labelled
   controls themselves rather than over a sentence about them.
2. `ActivityPanelCopy.test.tsx` — _"says the app cannot record it yet, and claims nothing about
   saving"_. **Retired.** Its list of forbidden words included `/\bsaved\b/`, which this slice makes
   legitimate — a panel that may never say "saved" is exactly what stops being true here. The claim
   underneath it, that the app never says saved without having saved, is not dropped: it becomes F3
   (saved shown only while the box matches the acknowledged text), F5 and F6 (the word appears
   nowhere in the failed state), which are stronger because they tie the word to a server
   acknowledgement rather than banning it.
3. `ActivityPanelCopy.test.tsx` — _"says nothing about what an activity asks for when it asks for
   nothing"_. **Re-aimed.** An activity declaring no `response_fields` now renders no writing
   surfaces at all; the test asserts that absence instead of the absence of a sentence.
4. `activityPanelStyles.test.ts` — _"does not style the no-store sentence more quietly than the line
   above it"_. **Retired with its subject.** `.activity-no-store` no longer exists. The design
   review finding underneath it — the panel's one load-bearing claim must not be set as small print —
   transfers to the save-state line, and is asserted there in the same file.
5. `ActivityPanelCopy.test.tsx` — _"offers nowhere to type, not even a disabled box"_. **Inverted.**
   This is the assertion slice 9 existed to make and this slice exists to undo, so it becomes its
   own opposite: one box per declared field, and still nothing `contenteditable`. Decision 1 of
   `docs/specs/activity-placement.md` said the writing surface waits for the slice that can
   acknowledge a save. This is that slice.
6. `activityPanelStyles.test.ts` — _"does not reach for the input border the design package ships
   broken"_. **Inverted, for the same reason.** The panel must now use `--input`, at the measured
   value, and `theme.test.ts` pins what that value is.
7. `tools/activity-checks.mjs` — the gate's _"N panels offer somewhere to type, and nothing is saved
   yet"_ check. **Inverted.** It becomes an equality against the number of fields the app itself
   says the lesson's activities declare, plus a label check and a save-control check. Written as an
   equality rather than `> 0` deliberately: `> 0` would pass a page that rendered one box out of
   twelve, which is the same blindness `/code-review` found in this check's placement half last
   slice.

8. `app.test.ts` — _"answers /api/health with the schema version actually stored in the database"_,
   which pins `schemaVersion: '3'`. **Re-aimed to `'4'`, claim unchanged.** Missed when this list
   was first written and found by the PRE audit, which is the finding that best justifies the list
   existing: migration 4 moves the stored version, so this test would have gone red during
   implementation for a reason nobody had recorded, and the standing rule would then have been
   broken after the fact rather than before it. The test's claim — that the endpoint reports what
   the database actually holds, not a constant — is exactly what it was; only the number moves, and
   S1 now asserts the same thing from the other side.

No other existing test is re-aimed. If that turns out to be wrong, the change and its reason are
recorded here before the red commit and nowhere else.

## Acceptance criteria

### S — Storage and the compare-and-set contract

- [ ] S1. Migration 4 creates `learner_response` and sets `app_schema_version` to `4`. Migrations
      1–3 are not edited. `GET /api/health` reports `4`.
- [ ] S2. A record is unique on `(activity_id, field_name)` and carries `text`, `revision`,
      `updated_at`, and the `candidate_lesson_id`, `content_version` and `release_id` the latest
      accepted write was made under.
- [ ] S3. The first accepted write for a field inserts at revision 1. Each accepted write after it
      stores the new text at exactly one revision higher.
- [ ] S4. A write whose expected revision does not equal the stored revision is **refused** and
      changes nothing: the stored text and revision are byte-identical afterwards.
- [ ] S5. The compare-and-set is atomic in SQL — a conditional write whose own report of how many
      rows it changed decides the outcome. A read-then-write with a gap between them fails this
      criterion even if it passes every other test.
- [ ] S6. A write for a field with no stored record and an expected revision other than 0 is
      refused, not silently inserted.
- [ ] S7. Acknowledged work survives process restart: written through one database handle to a real
      file, read back through a second handle opened on the same file after the first is closed.
- [ ] S8. The repository module is the only place that speaks SQL about learner responses (ADR
      0002).

### A — The HTTP contract

- [ ] A1. `GET /api/lessons/:candidateLessonId` answers a `responses` array carrying, for every
      stored field of that lesson's activities, the `activityId`, `fieldName`, `text`, `revision`
      and `updatedAt`. A field never saved is absent from the array rather than present and empty.
- [ ] A2. A lesson's answer carries responses for its own activities only, including activities
      shown at the lesson's foot. A response stored against another lesson's activity never appears.
- [ ] A3. `PUT /api/activities/:activityId/responses/:fieldName` with `{ text, expectedRevision }`
      stores the text and answers `{ state: 'saved', revision, updatedAt }` on acceptance.
- [ ] A4. A revision mismatch answers **409** with `error: 'revision_conflict'` and the **current**
      stored `text`, `revision` and `updatedAt`, so the page can show the reader what is there
      without a second request.
- [ ] A5. An `activityId` the imported release does not carry answers 404 `activity_not_found`.
- [ ] A6. A `fieldName` the activity does not declare in its own `response_fields` answers 404
      `field_not_declared`, naming the fields it does declare.
- [ ] A7. A non-string `text`, or an `expectedRevision` that is not a non-negative integer, answers
      400 `response_invalid` — each naming which part was wrong. No coercion.
- [ ] A8. Text longer than 100,000 characters answers 400 `response_too_long`, naming the limit and
      the length received, and stores nothing.
- [ ] A9. While the release stands refused, the PUT answers the refusal in the server's own words
      and writes nothing — the same shape the other endpoints already use.
- [ ] A10. The provenance stored is the server's: the lesson key, content version and release ID it
      reads from the imported release for that activity, regardless of anything in the request body.
- [ ] A11. Two writes racing on the same field leave the store consistent — one accepted, one
      refused with the conflict, and the stored text is the accepted one.

### F — The field on the page

- [ ] F1. Every placed panel renders one labelled writing surface per declared response field, in
      the author's own field order, each with a visible label a reader can click to focus the box.
- [ ] F2. A field with stored text renders it, already in the box, on first paint of the lesson —
      never empty-then-filled.
- [ ] F3. **Saved** is shown only while the text in the box is character-for-character the text the
      server acknowledged. Typing one character after a save moves the field to unsaved, with no
      request sent.
- [ ] F4. Pressing Save moves the field to **saving** while the request is in flight, and the Save
      action cannot be fired again from that state.
- [ ] F5. An acknowledged save moves the field to **saved** and records the revision the server
      returned, so the next save carries it.
- [ ] F6. A failed request — network refusal, 5xx, or a refusal from A5–A9 — moves the field to
      **failed to save**, names the reason in the server's own words where there is one, **leaves
      the reader's text in the box**, and offers Save again. The word "saved" appears nowhere in
      that state.
- [ ] F7. A save that is refused for any reason leaves the field's stored revision untouched, so a
      later successful save is still a compare-and-set against what the server actually holds.
- [ ] F8. Each field's state is announced politely to assistive technology, and names the field it
      is about — a bare "Saved" beside twelve boxes names nothing.
- [ ] F9. The panel no longer claims the app cannot store an answer, and no longer lists what the
      activity asks for in prose.
- [ ] F10. An activity shown at the lesson's foot (its section absent or ambiguous) gets the same
      writing surfaces. Work is recorded against the activity, not against where the panel landed.
- [ ] F11. Fields are independent: saving one leaves every other field on the page in the state it
      was in, and a conflict on one does not block a save on another.

### C — The conflict path

- [ ] C1. A 409 moves that field to a **conflict** state that is visibly distinct from failed to
      save, and is announced as an alert rather than politely.
- [ ] C2. The conflict state shows the stored text and the reader's text at the same time, each
      labelled for what it is, with neither replacing the other.
- [ ] C3. **Keep mine** re-sends the reader's current text against the revision the conflict
      reported. On acceptance the field becomes saved at the new revision.
- [ ] C4. **Use stored** puts the stored text in the box at the stored revision and the field
      becomes saved, with no further request.
- [ ] C5. A second conflict during Keep mine is itself a conflict against the newer stored text —
      never an overwrite, and never a loop that gives up and writes anyway.
- [ ] C6. Nothing in the conflict path discards either text without the reader choosing.
- [ ] C7. End to end against the real app: a second client saves a field, the first client's save is
      refused with the current text, and the store holds exactly one of the two texts at every
      point.

### N — Leaving with unsaved work

- [ ] N1. Following an in-app link while any field on the lesson has unsaved text opens a dialog
      naming what is unsaved, and does not navigate.
- [ ] N2. **Stay** closes the dialog, leaves the address unchanged, and leaves every field's text
      and state exactly as it was.
- [ ] N3. **Leave anyway** performs the navigation that was blocked.
- [ ] N4. Back and forward are guarded the same way: the address the reader left is restored, the
      dialog opens, and Leave anyway performs the navigation.
- [ ] N5. With nothing unsaved, navigation is unchanged — no dialog, no extra click. Saving the last
      unsaved field removes the guard.
- [ ] N6. A `beforeunload` handler is registered only while something is unsaved, so a refresh or a
      tab close warns, and an ordinary page with nothing typed does not.
- [ ] N7. The dialog is a real modal: focus moves into it, Tab is trapped inside it, Escape is Stay,
      and focus returns to whatever the reader was on.
- [ ] N8. The dialog names the fields by their label and their activity, not by a count.

### D — Design and access

- [ ] D1. `--input` is declared in both schemes at values that meet WCAG 1.4.11 (3:1) against every
      surface the control sits on: `#767f93` light, `#5c6b94` dark. Asserted numerically in
      `theme.test.ts` against `--card`, `--background` and the panel surface, in both schemes — not
      by eye. The C2 deviation in `docs/specs/visual-design-integration.md` is closed there.
- [ ] D2. Every state line, label, button and conflict surface uses declared tokens and meets the
      contrast the existing `theme.test.ts` pairs list enforces, in both schemes.
- [ ] D3. Every control is reachable and operable by keyboard alone: Tab into each box, Tab to its
      Save, activate by Enter or Space, and the focus ring is visible on all of them.
- [ ] D4. No page scrolls sideways at 375, 768 or 1440px in either scheme, with every field
      rendered — the existing screenshot-gate check, extended to a lesson with its boxes on screen.
- [ ] D5. The screenshot gate proves the writing surfaces are actually there: per lesson, per width,
      per scheme, the number of response fields on the page equals four times the number of
      activities `GET /api/lessons/:id` says that lesson has, and every one carries a label. The
      expected count is asked of the API, never written down.
- [ ] D6. The gate check in D5 is proven by sabotage: breaking field rendering fails it by name,
      rather than passing green on zero.

### R — Nothing already built regresses

- [ ] R1. Every criterion in `docs/specs/activity-placement.md` still holds — in particular that
      panels sit at the end of their own sections, that the prompt is never rendered a second time
      where the section is visible, and the placed-versus-foot counts the gate measures.
- [ ] R2. Every criterion in `docs/specs/reader-navigation-and-resume.md` still holds: the contents
      list, previous/next, and the resume point, including that a transient Start card cannot record
      over the reader's place.
- [ ] R3. Every criterion in `docs/specs/markdown-rendering.md` and `docs/specs/mermaid-diagrams.md`
      still holds. Nothing this slice adds enters the sanitized authored tree as content.
- [ ] R4. The release-import refusals and the eight-hash verification are untouched; a refused
      release still refuses every page in the server's own words.
- [ ] R5. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format:check`
      and `npm run screenshots` all pass locally.

## Slice record

_(appended as the slice runs)_
