# Export

Milestone 3. The owner downloads their actual work for a range of lessons as one Markdown file, with
the lesson, activity, content-version and release context the content author needs, so it can
travel with an owner review form (`Owner_Review_After_Lesson_05.md`, `_08`, `_13`, `_15`). The
owner chooses, per export, whether Claude's practice feedback goes with it.

## Decisions taken with the owner (2026-11-19)

1. **Conversations are a choice at export time.** A checkbox beside Export, off by default. Checked,
   each activity carries its current conversation under its answers. Conversations hidden by
   Start over never go.
2. **One export covers a lesson range.** From/to pickers on the course page, defaulting to the whole
   course, so one file can match one review form (Lessons 6–8, say).
3. **Answers carry their history.** The current text first, then each earlier version with its date
   and the content version it answered.

## Acceptance criteria

### The file

The file's shape, so its reader (and the tests) can find a fact beside the thing it describes:
everything before the first `## ` heading is the context block; each lesson is a `## <title>`
section, each activity a `### <title>` section inside it, and each field a `#### <label>` section
inside that. The conversation is a `#### AI feedback (…)` section after the fields, and the closing
dropped-work section is a `## ` section. Lesson titles are the titles the app shows (the lesson's
own H1).

- **EX1.** `GET /api/courses/:courseId/export?from=<lessonId>&to=<lessonId>&conversations=<0|1>`
  answers `200`, `Content-Type: text/markdown; charset=utf-8`, and `Content-Disposition:
attachment; filename="EduCode_<courseId>_Lessons_<from order>-<to order>_<YYYY-MM-DD>.md"`
  (orders two digits, the date the UTC day of the export, e.g.
  `EduCode_FSSE_Lessons_06-08_2026-11-19.md`).
- **EX2.** The context block has these lines, each optionally a `- ` list item:
  `Course: <id> — <title>`; `Release: <release id> version <version> (<date>)`;
  `App version: <package.json version>`; `Exported: <ISO 8601 time>`;
  `Lessons: <from order> <from title> to <to order> <to title>`;
  `AI feedback conversations: included` or `AI feedback conversations: not included`; and the
  sentence "Only work the app acknowledged as saved is included." These are the fields the review
  form's Context section asks for.
- **EX3.** Every lesson from `from` to `to` inclusive appears, in release order (the manifest's
  `order`, not id order), and no other. Its section, under its `## <title>` heading, has the lines
  `Order: <two digits>`, `Lesson id: <candidate_lesson_id>`, `Content version: <content_version>`
  and `Document id: <document_id>`. A lesson with no activities says "This lesson has no recording
  activities."
- **EX4.** Every activity of each lesson appears, in activity-set order, its `### <title>` section
  having the lines `Activity id: <activity_id>`, `Kind: <kind>` and
  `Source heading: <source_heading>`. Under it, every field the activity declares appears, in
  declared order, headed by the label the app gives it (`Your prediction`, … — unknown names as
  written).
- **EX5.** A field with a live record shows its text, the time it was saved, and the content
  version and release it was saved against. A field never answered shows "No answer recorded." A
  live record whose text is empty shows "Emptied" and still shows its earlier versions.
- **EX6.** Under a field's current text, each earlier revision appears, newest first, with its
  revision number, written time, and the content version and release that revision was saved
  against (not the current ones). A field with one revision shows none. Every text block (current,
  earlier, or a conversation turn) has its description on the last non-blank line before its
  opening fence, so a reader never has to guess which version a text answered.
- **EX7.** Text the owner or Claude wrote — answers, earlier versions, sent fields, follow-ups and
  replies — is reproduced byte-for-byte inside a backtick fence longer than any backtick run in that
  text (at least three), so no text can break the file's structure. Headings, list markers and HTML
  in it stay literal.
- **EX8.** Answers whose `activity_id` the current release no longer lists, but whose
  `candidate_lesson_id` is a lesson in the range, appear only in a closing section "Work this
  release no longer shows", grouped by activity id, with the same field headings and history as
  EX5–EX6. Answers to a field a listed activity no longer declares go there too, under that
  activity's id. Only this course's work counts: a row saved through another course (its release id
  does not start with `<courseId>-`, the rule ADR 0018's import enforces) is never this course's
  dropped work. When there are none, the section is absent. Conversations of a dropped activity are not
  carried: there is no activity left to put them under, and they are generated assistance, not
  work.

### Conversations

- **EX9.** With `conversations=0` (and when the parameter is absent) the file contains no turn text,
  no failure text and no model name.
- **EX10.** With `conversations=1`, each activity with a current conversation shows it after its
  fields, headed "AI feedback (generated by Claude, not a review by the author)". Each turn has one
  line `Turn <n> · You · <time>` or `Turn <n> · Claude · <model> · <time>` (`model not reported`
  when the store has none), ending ` · Failed: <failure>` for a failed Claude turn. Line breaks in any value on such a line
  (a failure, a model, a title) become single spaces, so the line stays one line. A learner turn's
  text, when it has any, is a block under that line; one with none has no block of its own. A
  learner turn that sent fields gives each its own block, described by the field's label (a description line, not a heading). Turns appear in
  the order they were taken. A Claude
  turn's text, even partial, is a block under its line; an empty one has no block.
- **EX11.** A conversation hidden by Start over never appears, with either setting. An activity
  whose only conversations are hidden shows none.

### Consistency and refusals

- **EX12.** The export reads the store inside one transaction with no `await` inside it, so a save
  that lands while the export is being built is either wholly in the file or wholly absent. With
  synchronous SQLite in one process no test can interleave a save, so this is checked in review.
- **EX13.** These answer `400` with a JSON `{ error, message }`: `from` or `to` missing, empty or
  given twice (the message names the parameter in backticks, `` `from` `` or `` `to` ``, and not the
  other); `from` or `to` not a lesson of this course's release, including another course's lesson
  (the message names the value); `from` after `to` in release order (the message names both); and
  `conversations` other than `0` or `1`, including empty (the message names `` `conversations` ``).
- **EX14.** A course whose release failed to import answers the same `failed` state its other
  routes give.

### The page

- **EX15.** The course dashboard's "Your records" card — whose text still says notes "are not
  recorded yet" — is replaced by an Export card headed "Export your work": From and To selects
  listing the course's lessons by order and title (defaulting to the first and last), an "Include
  AI feedback conversations" checkbox (unchecked), and an Export button. This re-aims
  `DashboardPage.test.tsx` "says plainly what is kept and what is not recorded yet", whose claim
  stopped being true in Milestone 2.
- **EX16.** Pressing Export fetches the file and hands it to the browser as a download under the
  server's filename. The card's status line (`role="status"`) says "Preparing…" with Export
  disabled, then "Downloaded", and is empty again after the app's usual settle time (2 s). The
  status element is always present, empty when idle, so a screen reader hears each change. Failures
  go in an alert, claim no download, and leave Export enabled with no "Preparing…":
  - a refusal with a JSON `message` shows that message;
  - any other non-200 answer shows "The app refused the export (status <n>). Nothing was
    downloaded.";
  - no answer, or a body that stops arriving, shows "The export did not arrive. Nothing was
    downloaded.";
  - a browser that will not take the file shows "Your browser did not save the file. Nothing was
    downloaded."
- **EX17.** Whenever From is after To — whichever was changed last — "From must be at or before
  To." shows beside the selects and Export is disabled until fixed. From equal to To is a valid
  one-lesson range.
- **EX18.** Every control is reachable and operable by keyboard with a visible focus, each select
  and the checkbox has a label, and the card fits 375, 768 and 1440 with no horizontal page scroll.

## Assumptions (defaults, not asked)

- Markdown only. REQ-49's JSON and manifest belong to the hosted product's data-rights work, not
  this owner-only build.
- The file is built on the server from the store (prediction-history said Export reads the
  repository directly). The page's in-memory text is not used: leaving a lesson with unsaved text
  is already guarded, and the file says it carries acknowledged work only.
- One course per export. A lesson shared between courses (ADR 0018) shows the same answers in each
  course's export, because answers are keyed by activity.
- Times are written as stored (UTC ISO 8601). No local-time conversion.
- The Export card is on the course dashboard only, not on each lesson page.

## Out of scope

JSON export. Exporting the review form itself or filling it in. Hidden conversations. Exporting
across courses in one file. Any upload or send — the owner attaches the file themselves. Import of
an export. The accessibility pass of the whole app (the next Milestone 3 item).

## Done means

On the FSSE course page the owner picks Lessons 6 to 8, ticks Include AI feedback conversations,
and presses Export. A file named `EduCode_FSSE_Lessons_06-08_<today>.md` lands in Downloads. Opened,
it names the release and app version, lists Lessons 6, 7 and 8 with every activity, shows each
answer with the content version it was written against and any earlier wording, and shows the
Lesson 6–8 feedback conversations labelled as AI feedback. Without the tick, the same file has no
conversations.

## Slice record

**2026-11-19.** Built in one session, the day practice feedback landed.

- **Stage 0.** Three forks asked in one batch; the owner took all three recommendations:
  conversations are a choice at export time (off by default, hidden ones never), one export covers
  a lesson range, and answers carry their earlier versions. ADR 0020 records the format.
- **test-guardian PRE:** FAIL on 11 findings, all taken before implementation. The ones that
  mattered: `to` could be ignored (every test ended at the last lesson), lesson ids sorted in
  manifest order so an id-ordered file would pass (lesson 3 is now `FIX-A3`), and facts were checked
  "somewhere in the file" rather than beside their item, which is why the file's heading structure
  and labelled lines are now pinned. Second pass: PASS, four low items, all taken. Tests pinned in
  `19309e5`.
- **Green:** 55 server tests passed on the first full run; the page needed one fix of my own (a
  wrapping `<label>` would have put every option's text into the select's name). The download
  hand-over was extracted from `useFileDownload` into `handFileToBrowser`, so the recovery
  download and Export share it.
- **test-guardian POST:** skipped. `git diff 19309e5 18842de` over the test files is empty.
- **`/code-review` (medium):** three defects and four nits, all taken. The defects, each with a
  failing test first (`99b612b`): an answer to a field an activity no longer declares vanished from
  the file; another course's work on a shared lesson id showed up as this course's dropped work;
  and a multi-line failure message could open a heading or a fence in the middle of the file. The
  nits: a header-safe course id in the filename, a ref-based double-press guard, doc comments, and
  three test files over 350 lines, split in `1202d46` with every describe body unchanged.
- **Design review:** ship with nits. Taken: a changed choice clears a stale "Downloaded"; the
  Export button takes the lime primary's shape in the quieter `--primary`; a shorter lede; the
  range error says how to recover; the full title on each option's `title`. **Declined:** dropping
  "Lesson N:" from the option text. The pinned tests choose options by that text, and lessons 9–15
  would still share leading words after the number.
- **Hygiene:** two raw NUL bytes, written by a shell edit into the field keys of `exportData.ts`,
  made git and grep treat the file as binary; a `fieldKey` helper now writes the escape. Two
  heading constants were exported for nobody.
- **Verified in the real app** (built, port 8319, scratch store, Chromium): Lessons 6–8 with
  conversations ticked downloaded as `EduCode_FSSE_Lessons_06-08_2026-11-19.md` with Lessons 6–8
  only, the current and earlier answer, an owner's own code fence intact inside a four-backtick
  fence, and the seeded conversation under its label; the status settled to empty; a keyboard-only
  export (Space, Tab, Enter) had no conversations; a backwards range held Export; no sideways
  scroll at 375 or 768. The conversation was written into the scratch store directly, so no Claude
  run was started. `npm run screenshots` passed on 22 routes × 3 widths × 2 schemes.
- **Known:** the field labels are still written twice, now `apps/server/src/modules/learner/
fieldLabels.ts` and `apps/web/src/activities/fieldLabels.ts` (the server's two copies became
  one). `realActivityPlacement.test.tsx` "places all three of LS-M020-02…" hit its 5 s timeout in
  two full runs while another project's `pytest -n auto` was loading the machine; it passed 10 of
  10 alone (3.7–8.5 s) and in the final full run. Its budget was not widened.
