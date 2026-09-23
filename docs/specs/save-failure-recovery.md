# Save failure recovery — Milestone 2, slice 4

**Status:** criteria approved 2026-09-23. Sources: ADR 0004, whose decision names four states "with
the learner's text still present **and recoverable** in the failed state" — the second half of that
sentence has never been built; `VS_Code_Coder_Handoff_v1.md` §6's acceptance row "Simulate a save
failure | Existing acknowledged work remains intact; **the learner can recover or export the
unsaved text**"; `docs/brief.md` v1 scope item 6 and its "no false save" hard constraint;
`docs/specs/acknowledged-saves.md` §Assumptions, which defers "copy-to-clipboard and download of
unsaved text" to this slice by name; `docs/specs/prediction-history.md` and
`ResponseHistory.tsx`'s own comment, which defers a copy affordance on an earlier version to this
slice by name; `docs/roadmap.md` Milestone 2 item 4.

Since slice 10 a refused save keeps the reader's text in the box and says so. That is the _present_
half of ADR 0004's sentence. The _recoverable_ half is still the reader's own selection and Ctrl-C,
and there are two places where the app itself takes typed work away: **Use stored** in the conflict
panel replaces the box with the stored text and nothing survives the press, and a **Leave anyway**
out of the dialog drops every unsaved box on the lesson. This slice gives the reader a way to get
their characters out of the app before either of those happens, and out of a failed save at all.

It closes Milestone 2. Nothing here is Export: Export (Milestone 3) carries the owner's
_acknowledged_ work with the review forms, and is a different artefact for a different reader.

## Facts established before the criteria were written

Measured against the code at commit `5dc6414`:

- **`ResponseField.tsx` is 300 lines**, under but near the ~350 guidance in CLAUDE.md. It already
  owns five states, a conflict record, a history list and the unsaved registry. Anything added here
  goes in its own file.
- **`CopyBlock.tsx` already holds the exact copy state machine this slice needs** — `idle` /
  `copied` / `failed`, a 2000ms settle, a timer cleared on press rather than on entry (a fix its
  own comment explains: a second press otherwise fires the first press's timer inside the second's
  window), a clipboard read at press time because it can be absent over plain HTTP, and a
  `role="status"` region rendered only while there is something to say. A second copy of that,
  written fresh, would lose all four of those decisions.
- **`ResponseField` today receives `activityId`, `fieldName` and `stored`, and nothing else.** The
  lesson number, title, candidate lesson id, content version, release id and release version all
  live on `LessonPage`'s `view.lesson` and `view.release`, four component boundaries up
  (`LessonPage` → `LessonMarkdown` → `ActivityPanel` → `ResponseField`), plus a second path through
  `UnplacedActivities` → `ActivityPanel`.
- **`LessonMarkdown` has 65 render sites across 10 files**, and about 55 of them pass no activities
  at all — they are markdown-rendering tests that have no lesson to name.
- **`.response-save` and `.response-secondary` carry `padding: 0.4rem 0.9rem` and no `min-height`.**
  ~~This measures about 30px, short of the 44px guideline.~~ **Corrected at Stage 4 by measuring
  instead of calculating: all three buttons in the row measure exactly 44px in real Chromium at
  375px.** `.response-actions` is `display: flex` with the default `align-items: stretch`, so every
  button in the row takes the height of the tallest. The arithmetic above counted padding and line
  height and never looked at the flex context, which is why an estimate stood in for a measurement
  and was wrong. The guideline is met, not compromised.
- **jsdom does not implement `URL.createObjectURL`.** Every download assertion in this slice is
  therefore about the file's _bytes and name_, stubbed at that boundary — not about the browser
  actually writing a file. That limit is stated in the verification report, not papered over.
- `stubFetch` in `testkit/responseFieldHarness.tsx` throws on any request it was not queued to
  answer. That strictness is what proves criterion A2 for free.
- The release carries three content versions across fifteen lessons (`2.0.0-draft`, `1.0.1-draft`,
  `1.0.0-draft`), so the version named in a recovery file is already informative today.

## Decisions (asked 2026-09-23, one batch — all three defaults taken)

1. **Nothing is stored in the browser.** The failed box offers Copy and Download; the reader acts
   before they leave, and `beforeunload` already stops a refresh while anything is unsaved. A
   `localStorage` draft cache was the alternative and was refused for the third time in this repo's
   history — ADR 0001 refused device-local state as the architecture, ADR 0004 refused optimistic
   local-first because it shows a state the write has not earned, ADR 0010 refused `localStorage`
   for the resume point. A draft cache would add a second place text can live and a new
   stale-draft-versus-server question on every load, which is a new way for work to _look_ safe.
   **The cost is real and is stated rather than hidden:** a reader who dismisses the browser's own
   refresh warning still loses the text. This slice makes recovery possible, not automatic.
2. **Three surfaces get a recovery affordance**, because each is a distinct place work is lost: the
   **failed field** (the acceptance check's own case), the **conflict panel** (where Use stored
   discards the reader's text with no undo — a loss path slice 10 opened and did not close), and
   **each earlier version** (which `ResponseHistory.tsx` defers here in as many words). The
   **leave-anyway dialog** was offered and not taken; it stays out, and so does any page-level
   "download everything unsaved".
3. **A download is Markdown carrying the full context**, not a bare `.txt`. Lesson, activity, field,
   content version, release and the time, then the text verbatim. The handoff's word is "export",
   and four unlabelled lines in a file called `download.txt` cannot be placed back into a lesson a
   week later. It is explicitly **not** Milestone 3's Export.
4. **Copy takes the characters alone; Download takes the characters plus context.** Copy exists to
   be pasted straight back into a box or a notes app, where a header would be in the way. That
   asymmetry is deliberate and is the same split `CopyBlock` already makes.
5. **Earlier versions get Copy and no Download.** That text is on the server already and is not at
   risk of being lost — it is the one text on the page that cannot be. A Download on each of N
   revisions inside an opened disclosure is machinery for a danger that does not exist there.
6. **Recovery controls appear only in the `failed` and `conflict` states.** A box in the plain
   `unsaved` state has Save right beside it and pressing it is the recovery; adding two permanent
   buttons under all twelve boxes is the density the acknowledged-saves design review already
   declined to add to. A page where nothing has gone wrong gains 0px.
7. **The new buttons match the existing button family's height.** Same row, same treatment; a row
   of three where the heights disagree reads as broken. Written expecting that to mean _settling
   for_ about 30px, which is what the fact above assumed — the Stage 4 measurement showed the row
   stretches every button to the tallest, so all three come out at 44px and the guideline is met
   outright. The decision stands; only the reason it was thought to cost something was wrong. These
   appear only once something has already failed, so they are not a control repeated down a healthy
   page either way.

## Assumptions

- **No server change, no schema change, no new endpoint.** Schema stays at 5. The page has already
  fetched everything a recovery file names — that is how it rendered — so the file is built from
  data in hand. This is the point: the save failing is frequently the server being unreachable, and
  a recovery path that needs the server is not one.
- **The copy state machine is extracted from `CopyBlock`, not rewritten.** Its callers already
  exist, so the extraction is wired in the same slice. This is the extraction exception, not new
  code.

  **Correction, after test-guardian POST.** This assumption went on to say "`CopyBlock.test.tsx`'s
  existing assertions are what prove it behaviour-neutral", and that overstated what that file
  proves. Of the three decisions the extracted code's own comment names, the suite covered one — the
  named refusal. It never varied `navigator.clipboard`'s presence between render and press, so a
  regression that captured the clipboard once would have passed; and nothing anywhere in the repo
  fired two presses close enough together to exercise the settle timer, so **deleting the
  `clearTimeout` that the comment exists to explain would have left all 1037 tests green**. The file
  is still untouched and the extraction is still faithful — `/code-review` checked it line for line
  — but the proof was thinner than the sentence claimed. Both gaps are now covered, in
  `saveFailureRecovery.test.tsx`'s review-findings block rather than in `CopyBlock.test.tsx`, which
  stays untouched.

- **Lesson context becomes a required prop wherever activities are rendered**, expressed as a
  union so that passing `activities` without `lessonContext` is a type error rather than a runtime
  hole (CLAUDE.md: a new dependency at a composition root is required, not optional-with-default).
  The ~55 call sites that render no activities are untouched.
- Auto-retry after a failure stays out. ADR 0004 forbids a save the reader did not ask for, and a
  timer is that claim with a shorter fuse.
- Restoring an earlier version into the box stays out. `ResponseHistory` has no Restore by decision
  (ADR 0012); Copy is the affordance, and the reader pastes if they want it back.

## Acceptance criteria

### The failed field

- [ ] **F1. A refused save offers Copy and Download, and no other state does.** In `failed` the
      action row carries Save, Copy and Download. In `unsaved`, `saving` and `saved` it carries Save
      alone. Asserted by counting the buttons in the row in each of the four states, so a control
      that leaks into the healthy page fails here.
- [ ] **F2. Copy writes exactly what is in the box.** Character for character, including leading and
      trailing whitespace, runs of spaces and a trailing newline. Not the acknowledged text, not the
      stored text — the textarea's own value.
- [ ] **F3. A copy that cannot happen says so.** No `navigator.clipboard`, or a `writeText` that
      rejects, leaves the button reading "Could not copy" and announces it. Never silence: a button
      that reports nothing is a button the reader believes worked, which is the same false success
      ADR 0004 forbids for saves.
- [ ] **F4. Download writes a Markdown file carrying the text and its provenance.** The header names
      the lesson number and display title, the candidate lesson id, the activity id, the field's
      label and its authored name, the content version, the release id and version, the time the
      file was written, and states in a sentence that the app never acknowledged this text. Then a
      `---` rule, a blank line, and **the text verbatim to the last character** — not fenced, not
      escaped, not trimmed, with nothing appended. Fencing is specifically refused: a reader whose
      answer contains three backticks would have their file broken by it.
- [ ] **F5. The file is named for what it holds, and the name is safe.** `unsaved-lesson-04-ACT-M020-04-02-prediction.md`
      in shape. Every character outside `A–Z a–z 0–9 . _ -` is replaced, because an activity id and
      a field name are both content and nothing in the release format promises either is free of a
      `/`, a space or a colon. Proven with an activity id that carries all three.
- [ ] **F6. A download that cannot happen says so, and a download that can leaves nothing behind.**
      If `URL.createObjectURL` is missing or throws, the button reads "Could not download" and no
      file is claimed. On the success path the object URL is revoked.
- [ ] **F7. Both controls read the box at press time, not at render time.** Type, fail a save, type
      more, then press: what leaves the app is the newer text. The same rule, and the same reason,
      as `CopyBlock` reading the clipboard at press time.

### The conflict panel

- [ ] **C1. The reader can take their own text out before choosing.** The conflict panel carries
      Copy and Download of **what the reader typed** — the text in the box, not the stored text
      shown beside it — above the two choices. Use stored is the only control in this app that
      destroys typed work, and it must not be the only thing on offer beside it.
- [ ] **C2. Use stored still replaces the box, and Keep mine still re-sends.** Recovery is offered,
      not imposed. Pinned so that adding C1 cannot quietly change what either button does.

### Earlier versions

- [ ] **H1. Every earlier version carries a Copy that copies that version.** Revision 2's button
      writes revision 2's text, character for character — never the box's text and never another
      entry's. Proven with two entries whose texts differ.
- [ ] **H2. An earlier version carries no Download.** Decision 5. Asserted as part of H1's survey of
      the buttons in an entry, so the line is documented in the suite rather than only here.

### What must not change

- [ ] **A1. A refused save leaves the stored record and its history exactly as they were.** The
      acceptance row's first half: after a 400, a 409 and a dropped connection, the live record's
      text, revision and `updatedAt` are unmoved and no revision row was appended. Checked against
      the existing server suite first; written only where it is not already pinned.
- [ ] **A2. Copy and Download send nothing.** No request leaves the page on either press, in any
      state. The strict fetch stub turns an unexpected request into a failure rather than a pass.

### Reach and shape

- [ ] **D1. Every new control is reachable by keyboard and named for its own field.** A lesson can
      show these under any of twelve boxes; a bare "Copy" says nothing about which answer. Each
      accessible name carries the field label and the activity id, as every other control on the
      panel already does.
- [ ] **D2. The new controls add no sideways scroll at 375px, and none to a healthy page.** The
      action row already wraps; three buttons must still fit. A lesson where nothing has failed
      gains no height at all (decision 6), which the screenshot gate measures.
- [ ] **D3. The outcome of each press is announced, not only drawn.** A `role="status"` region
      carrying the outcome, rendered only while there is something to say — the convention
      `ResponseField` and `CopyBlock` both already follow, and for the reason recorded there.

## Existing tests this slice re-aims or retires

**Correction, written during implementation.** This section first said "None", and that was wrong —
written from the criteria rather than from the suite, and found only when the test went red. One
test is re-aimed, and the claim it protects is named below with what changed and what did not.

1. `ResponseHistory.test.tsx` — _"offers nothing that would edit, restore or remove an earlier
   version"_. **Re-aimed, claim unchanged, assertion narrowed to an allow-list.** ADR 0012's rule —
   nothing edits or deletes a revision, including the app, and there is no Restore — still holds and
   is still what this test is for. What moved is the _proxy_. When the test was written, an entry
   had no controls of any kind, so "no buttons at all" and "nothing that mutates" were the same
   sentence. Decision 5 puts a Copy on each entry, and a Copy takes a revision out of the app
   without being able to change one, so the emptiness check is now false while the claim is not.
   The assertion becomes an exact list of the buttons an entry may carry (`['Copy', 'Copy']` for two
   entries), which fails on a Restore, a Delete or an Edit added later — the three things the test
   names. Its `textbox` and `contenteditable` halves are untouched.

   Recorded in full because slice 12's own spec recorded the lesson that makes it necessary: a
   re-aim that keeps a test's name and changes one of its assertions reads, in a diff, like the same
   test.

Two mechanical changes touch existing test files without changing what they assert, and both are
listed here so that a diff showing movement in a test file has a stated reason:

1. **`testkit/responseFieldHarness.tsx` and the ~10 call sites that pass `activities`** gain a
   `lessonContext` prop. It is a new required argument, not a changed expectation; every assertion
   in those files stands untouched.
2. **`CopyBlock.tsx`** moves its copy state machine into a shared hook. `CopyBlock.test.tsx` is
   **not** edited — it is the proof that the extraction changed no behaviour. If it needs editing,
   the extraction was wrong.

## Slice log

_(appended as the slice runs)_

### 2026-09-23 — built, reviewed and corrected

Red commit `1c3dc47` (56 tests, 34 of them failing), green commit `dfceddc`, review fixes after
that. Final: **1052 tests across 45 files**, `npm run typecheck`, `npm run lint`,
`npm run format:check`, `npm run build` and `npm run screenshots` all pass locally, plus an 11-check
end-to-end run in real Chromium (below).

**test-guardian PRE — pass, two findings taken before any implementation.** The conflict panel's
Copy had no press-time test though its box stays editable through a conflict — the same claim F7
makes for the failed field, on the surface where the stakes are higher. And F6's two failure paths
checked that the button said "Could not download" without checking that no file was claimed.

**test-guardian POST — pass, no test weakened.** It confirmed the one re-aim is a genuine re-aim
(the allow-list still fails on a Restore, a Delete or an Edit), that the locator widening could only
ever have made a test throw rather than pass falsely, and that the four mechanical files changed no
assertion. Its own finding is recorded as the correction in Assumptions above: the claim that
`CopyBlock.test.tsx` proved the extraction behaviour-neutral was thinner than stated, and deleting
the settle timer's `clearTimeout` would have broken no test in the repo. Both gaps are now covered.

**`/code-review` at medium — five findings, all five taken.** Every one of them is a way for a
control to say it worked when it did not, which is the dishonesty ADR 0004 forbids of a save, in the
machinery built to rescue one.

1. **The download anchor was clicked while detached from the document.** Chromium obliges; Firefox
   and several WebViews ignore it entirely, so the reader would get "Downloaded" and no file. The
   anchor is now put in the document for the press and taken out again in a `finally`. Invisible to
   every test that existed, because the jsdom stub records the press either way — now pinned by
   `isConnected` at click time.
2. **The object URL was revoked one task after the click.** Nothing promises the browser has started
   reading the blob by then, and losing the race gives an empty file under a button that says
   Downloaded. It now waits 60 seconds, which is not a guess at the read time but long enough that
   no read is outstanding; the cost is a few kilobytes of the reader's own prose held that long.
3. **The dropped-answers fix rested on two `useMemo` caches, which React documents as
   discardable.** This was the sharpest finding and it reopened a defect this slice had already
   fixed once. `LessonMarkdown` built its component map inside a memo, so the map's identity — and
   therefore React's identity for the activity panels — depended on a cache nobody promises to keep.
   An eviction remounts every panel and drops every box of typed text. The memo on the lesson view
   fixed the _trigger_; it did not remove the _hazard_, and the hazard predates this slice. The
   panel component is now defined once at module scope and reads what changes out of a React
   context, so its identity is a constant and a data change re-renders rather than remounts. Pinned
   by three tests that hand the same lesson down again in fresh objects and require the typed text,
   and the box element itself, to survive.
4. **Untrusted header values could forge the file's boundary rule.** A lesson title, activity id or
   version carrying a newline and three dashes would write a `---` of its own, and the contract that
   everything after the rule is the reader's characters would quietly stop being true. Content is
   untrusted (ADR 0005) and this is content. Header values are now forced onto one line, replacing
   rather than deleting, as the rest of the app does.
5. **The copy had no in-flight guard across its `await`.** Two presses can settle in either order,
   so an older one landing last wrote its outcome over a newer one's — "Could not copy" on a copy
   that worked, and the reverse. This is the read → await → write pattern CLAUDE.md names, inherited
   from `CopyBlock`, where the same race has always been. Only the latest press may now report, and
   an overtaken press does not restart the settle timer either.

**The defect that mattered was not in this feature.** It was finding 3, and it was found twice: once
by `unsavedNavigation.test.tsx` going red two runs in ten when a derived `lessonContext` made
`toLessonView` allocate per render, and once by `/code-review` pointing out that the fix for that was
itself only as durable as a cache React may throw away. The visible symptom both times is the worst
one this milestone has: a reader types into twelve boxes, the page re-renders for any reason, and
every word is gone — in the slice whose whole subject is not losing the reader's text. The accident
that hid it for three slices is that `toLessonView` used to return the parsed body itself, so the
view was stable without anybody deciding it should be.

**Verified end to end in real Chromium** (`data/verify-recovery`, port 8319, outside the screenshot
gate): a refused save keeps the text character for character; the row reads Save / Copy / Download;
Copy reaches the real system clipboard with only Windows' own CRLF difference; Download writes a
real file to disk named `unsaved-lesson-01-ACT-M020-01-01-prediction.md` whose tail is the reader's
answer byte for byte and whose header names the lesson, field, release and that nothing was stored;
the store holds nothing after the refusal; a healthy lesson shows twelve buttons, all Save; and at
375px there is no sideways scroll and all three buttons measure 44px.

**Not covered, and stated rather than left to be discovered.** The screenshot gate still never
simulates a failed save, so no capture in `screenshots/` shows these controls — the design review
below was done from code and measurements, not from a picture of the thing. Nothing here protects a
reader who dismisses the browser's own refresh warning; decision 1 accepts that cost by name.
