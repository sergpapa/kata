# Activity placement — Milestone 2, slice 1

**Status:** criteria approved 2026-09-22. Sources: `trial-activities.json`'s own `presentation`
rule ("Use `source_heading` to place recording fields beside the canonical lesson section. Do not
render `prompt_markdown` a second time when the section is already visible") and its
`prediction_policy` ("do not hide the authored walkthrough or impose an answer embargo");
`docs/roadmap.md` Milestone 2 item 1; `docs/brief.md` v1 scope item 4.

The release carries 45 activities the app has verified on every start since slice 1 and never
read. This slice reads them, and puts each one where its author said it belongs — beside the
lesson section it was written for. It puts no writing surface on the page: the acknowledged-save
contract is the next slice, and a box you can type into but that keeps nothing is the exact
dishonesty Milestone 2 exists to prevent.

## Facts established before the criteria were written

Measured against `content/releases/http-first-fifteen-v1_0_1/content`, the imported release:

- 45 activities, 3 per lesson, across all 15 lessons.
- Every `source_heading` matches **exactly one** heading in its lesson — 5 at depth 2, 40 at
  depth 3. No misses, no duplicates.
- All 40 non-null `feedback_source_heading` values also match exactly one heading.
- 45 distinct `activity_id`s; 45 distinct `(lesson_id, source_heading)` pairs.
- Every activity's `lesson_version` equals its lesson's manifest `version`.
- `title` equals `source_heading` on all 45.
- All 45 declare the same `response_fields`: `prediction`, `observation`, `explanation`,
  `help_used`.
- `trial-activities.json` is one of the eight manifest hashes already verified on every start, and
  its bytes are already stored — `content_activity_set` has existed since schema 2. **No migration
  is needed and none is added.**

## Decisions (asked 2026-09-22, one batch)

1. **No writing surface in this slice.** The panel names the activity and what it asks for, and
   says plainly that the app cannot record it yet. No textarea, not even a disabled one: a
   disabled box still reads as "type here" to somebody, and the honest statement costs less and
   claims less. The `--input` border deviation (`docs/specs/visual-design-integration.md` C2) stays
   due until the slice that adds the first real input.
2. **The panel sits at the end of its section** — after the section's own content, before the next
   heading at the same or a higher level. On Lesson 1 that puts Practice C's panel directly above
   the **Practice explanations** heading, so a reader meets the activity before the worked answers
   without anything being hidden from them (`prediction_policy`: no embargo).
3. **An activity whose `source_heading` the lesson does not carry is shown at the foot of the
   lesson, named.** The lesson stays readable and the activity stays offered; the panel says which
   heading it asked for and that the lesson has no such heading. The release is **not** refused
   over a renamed heading, and no lesson is withheld. A heading that appears twice is named the
   same way rather than guessed at.
4. **The sidebar contents list is untouched.** It keeps mirroring the authored headings exactly.
   Activities sit inside those sections, so they are already one click away, and the list stays a
   true picture of what the author wrote rather than app-authored decoration on it.

## Decisions (not asked — recorded with reasons)

- **Placement is computed on the tree that renders, client-side.** The same reasoning slice 4
  recorded for the contents list: an outline or a placement derived from a second parse of the
  source can drift from the page. The heading a panel is placed after is the heading element that
  was actually rendered, found after the sanitizer has settled the tree.
- **The panel is injected into the rendered tree, after sanitizing.** A rehype plugin ordered
  after `rehype-sanitize` inserts a placeholder element at the section's end; the component map
  renders it as the panel. Injecting after the sanitizer means the app's own marker can never be
  stripped by it, and the sanitizer still meets authored content with nothing of ours in it.
- **`prompt_markdown` is sent but rendered only when the activity could not be placed.** The
  presentation rule forbids a second rendering _when the section is already visible_; when the
  section is absent, the prompt is not on the page at all, and a panel with no prompt would be an
  activity nobody can do. It renders through the same `LessonMarkdown` pipeline — same guards,
  same sanitizer — and reports no outline, so an authored heading inside a prompt can never enter
  the sidebar.
- **An activity set that does not parse refuses the release by name**, code `activity_set_invalid`,
  naming the file and the parser's own complaint. This is the slice-6 precedent for a circular
  YAML alias: the app promises a named refusal, not a crash, and deriving views at request time
  means an unparseable set would otherwise throw on every lesson. It is a different case from
  decision 3 — there the data is intact and only an anchor is missing; here the file cannot be read
  at all.
- **An activity naming a `lesson_id` the release does not carry refuses the release by name**,
  code `activity_lesson_mismatch`. This mirrors the existing `lab_lesson_mismatch` exactly. The
  alternative is an activity that is silently never shown anywhere, which no reader could
  discover.
- **A repeated `activity_id` refuses the release by name**, code `duplicate_activity_id`, mirroring
  `duplicate_lesson_id` and `duplicate_lab_id`.
- **`lesson_version` is not validated at runtime.** A version-string slip in an activity record
  would refuse all fifteen lessons, and nothing in this slice reads the field. Author drift is
  caught by a test over the real release instead (criterion I6), where it fails a local run rather
  than blacking out the app.
- **The panel repeats the activity's title only when it differs from the heading it sits under.**
  Today those are equal on all 45, and printing the section's own name again a paragraph below it
  is noise. When a future release makes them differ, the title appears, so nothing is lost either
  way.
- **Section depth is the depth the reader sees.** A body-carried `h1` renders as `h2`
  (markdown-rendering R1), so it counts as depth 2 when deciding where a section ends — the same
  rule slice 4 used to decide what the contents list calls a section. A section therefore ends at
  the next heading a reader would see as a peer, not at the next one the tree calls a peer.
- **The panel invents no heading.** It opens with an eyebrow line, not an `h3`, so it adds no
  structure to a document the author wrote — the restraint dial from
  `docs/specs/edge-visual-refinement.md`.
- **An unrecognised `kind` or `response_field` is shown as its own token, unchanged.** A wrong
  friendly word is worse than a raw one the author can search for.

## Assumptions

- The activity set is parsed from the stored `source_text` on the way out, never re-read from
  disk: same derivation-at-serve rule as the lesson body (ADR 0005).
- Schema version stays `3`. No table is added, altered or dropped.
- The lesson answer gains an `activities` array; no existing field changes shape, so every
  contract slice 4 pinned still holds.
- Activities are matched to their lesson by `lesson_id` equal to the lesson's
  `candidate_lesson_id`, which is the release's own `lesson_key_field`.
- Activities are placed in the order the file lists them. Two activities naming the same heading
  would stack in that order; the shipped release has no such pair.
- No existing test is re-aimed by this slice. If that turns out to be wrong, the change and its
  reason are recorded here before the red commit and nowhere else.

## Acceptance criteria

### I — Import, integrity and refusal

- [ ] I1. The stored activity set parses into activities with `activity_id`, `lesson_id`, `kind`,
      `title`, `source_heading`, `prompt_markdown` and `response_fields`. A field that is absent,
      empty or of the wrong type is a refusal, not a coercion. (Wording widened after review: the
      code rejected `""` as well as a wrong type, and the criterion said only "wrong type". The
      code is right and the criterion was narrow — see the decline below.)
- [ ] I2. A set that is not JSON, or whose top level is not an object carrying an `activities`
      array, refuses the release with `activity_set_invalid`, the file named and the parser's own
      message carried.
- [ ] I3. An activity whose `lesson_id` names no lesson in the release refuses the release with
      `activity_lesson_mismatch`, naming the activity and the lesson id.
- [ ] I4. A repeated `activity_id` refuses the release with `duplicate_activity_id`, naming it.
- [ ] I5. Every refusal in I2–I4 stores nothing: the release is refused whole, as every other
      import failure is.
- [ ] I6. Over the real release directory: 45 activities, 3 per lesson across all 15 lessons, 45
      distinct `activity_id`s, and every activity's `lesson_version` equal to its lesson's manifest
      version. A future package that breaks any of these fails this test.

### A — The lesson answer

- [ ] A1. `GET /api/lessons/:candidateLessonId` answers an `activities` array holding that
      lesson's activities in file order, each with `activityId`, `kind`, `title`, `sourceHeading`,
      `responseFields` and `promptMarkdown`.
- [ ] A2. A lesson with no activities answers `activities: []`, not a missing field.
- [ ] A3. No activity from another lesson appears in a lesson's answer.
- [ ] A4. The answer carries no identity or grading fields the reader is not shown —
      `prompt_scope`, `grading`, `formal_evidence_award`, `attempt_provenance` do not travel.
- [ ] A5. Every field slice 4 pinned on this endpoint — lesson, facts, body, previous, next,
      release — is unchanged.

### P — Placement in the body

- [ ] P1. A panel is rendered immediately after the last element of the section its
      `source_heading` names, and before the next heading at the same or a higher depth.
- [ ] P2. A panel whose section is the lesson's last section renders at the end of the body.
- [ ] P3. `prompt_markdown` is not rendered for a placed activity: the authored excerpt on the page
      appears exactly once, and the panel adds no copy of it.
- [ ] P4. Over the real release directory, all fifteen lessons: every one of the 45 activities
      places, each after its own heading and before the next heading of the same or higher depth,
      and none falls back to the lesson foot. An off-by-one fails an assertion.
- [ ] P5. The sidebar contents list is byte-identical to what it was before this slice on every
      lesson, and no panel contributes an entry to it.
- [ ] P6. A heading matches its activity by its rendered text **or** by the Markdown the author
      wrote for it, whichever the `source_heading` equals. No shipped `source_heading` carries
      inline markup today, but the lessons do contain such headings (`What kind of action? \`GET\``),
      and which spelling the author would use for one is not knowable in advance. A heading that
      matches either way counts once, so this widens matching without inventing ambiguity.

### U — Activities that cannot be placed

- [ ] U1. An activity whose `source_heading` matches no heading in the rendered body appears at the
      foot of the lesson, after the body and before previous/next, naming the heading it asked for
      and saying the lesson has no such heading. The renderer reports it as `heading_missing`.
- [ ] U2. An activity whose `source_heading` matches more than one heading appears at the foot the
      same way, saying the lesson has more than one section of that name — it is never placed
      beside a guess. The renderer reports it as `heading_ambiguous`.
- [ ] U3. A panel unplaced as `heading_missing` renders its `prompt_markdown`, through the same
      sanitizing pipeline as the lesson body, so the activity is still readable and doable. A panel
      unplaced as `heading_ambiguous` does **not**: there the authored section is on the page —
      twice — so rendering the prompt would put the excerpt there a third time, which is the one
      thing the activity file's `presentation` rule forbids. (Amended after review; U2 and U3 as
      first written were in conflict.)
- [ ] U6. A rendered prompt carries no heading anchor ids. It is a second, independent Markdown
      pass, and `rehype-slug` only deduplicates within one pass, so a prompt heading matching a body
      heading would put the same id on the page twice and give a contents anchor two targets.
- [ ] U7. An activity naming a heading that exists but is nested inside a quote or a list item is
      reported as `heading_missing` and says "no section with that heading". Such a heading is in
      the contents list but opens no section, so the app must not tell the reader the lesson has no
      heading of that name when it plainly does.
- [ ] U4. A heading inside a rendered `prompt_markdown` never enters the sidebar contents list.
- [ ] U5. Nothing is dropped: for any release, the number of panels on a lesson page equals the
      number of activities the answer carried for it.

### C — What the panel says

- [ ] C1. The panel names the activity's kind in words (`prediction_and_observation` reads
      "Prediction and observation") and carries its `activity_id`.
- [ ] C2. The panel names what the activity asks to be recorded, derived from `response_fields` —
      "your prediction", "what you observed", "your explanation", "whether you used help" — in the
      file's order.
- [ ] C3. An unrecognised `kind` or response field is shown as its own token, unchanged.
- [ ] C4. The panel states that the app cannot record any of it yet and that nothing on the page is
      stored. No word on the page says saved, kept, recorded, submitted or complete about learner
      work.
- [ ] C5. The panel contains no `input`, `textarea`, `select`, `button` or `contenteditable` — not
      even a disabled one.
- [ ] C6. The panel repeats the activity's `title` only when it differs from the heading it is
      placed under — measured against **both** spellings of that heading, its rendered text and the
      Markdown the author typed. A title matched by the authored spelling still names the heading
      it sits beneath, and printing it back would show the reader the raw backticks.
- [ ] C7. Each panel carries an accessible name (its kind and its activity id), so a reader
      navigating by landmark does not meet three identical unnamed regions per lesson.

### V — Visible and responsive

- [ ] V1. At 375, 768 and 1440, in both schemes, a lesson page carrying panels has no horizontal
      page scroll (the gate's existing overflow check, now running over pages that carry panels),
      and every panel renders with a real box rather than collapsing to nothing.
- [ ] V2. The panel is visually distinct from authored content — it is the app speaking, not the
      author — and names no colour of its own: every value comes from a token `theme.css` declares
      and `apps/web/src/theme.test.ts` measures. It does not use `--input`, which is the deviation
      C2 leaves unredeemed.
- [ ] V3. The screenshot gate fails, per lesson, per width, per scheme, if the number of panels
      **beside their sections** is not what the app says that lesson has, if any panel is at the
      lesson's foot, if any placed panel sits under no heading, or if any panel offers somewhere to
      type. Placed and foot panels are counted separately, and the expected number is asked of
      `GET /api/lessons/:id` rather than written down: counting them together made the gate blind
      to every activity falling to the foot at once, and a hard-coded three made it a test of this
      one package. Proven by sabotage — breaking heading matching fails 96 of the gate's checks by
      name.

### G — Nothing regresses

- [ ] G1. Every criterion in `docs/specs/markdown-rendering.md` still holds; in particular raw
      HTML is still visible text, unsafe targets are still inert, and whitespace inside fences is
      still character-for-character.
- [ ] G2. Every criterion in `docs/specs/reader-navigation-and-resume.md` still holds: contents
      anchors, previous/next, and the silent resume write.
- [ ] G3. Every criterion in `docs/specs/mermaid-diagrams.md` still holds — a panel placed in a
      section containing a diagram does not disturb the diagram frame or its source fallback.
- [ ] G4. `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run format:check`
      and `npm run screenshots` all pass.

## Out of scope

- **Any saving.** No writing surface, no persistence of learner work, no save states, no conflict
  path. That is the next slice, with the acknowledged-save contract and ADR 0004's four states.
- **The `--input` token.** No input exists yet, so the C2 deviation is not redeemed here; it stays
  recorded as due.
- **A link to the worked answers** (`feedback_source_heading`). It would double the
  heading-matching surface for a link the reader reaches by reading on. Revisit when the panel
  becomes interactive.
- **`prompt_scope`, `attempt_provenance`, `prediction_policy`, `grading`,
  `formal_evidence_award`, `response_fields_required`** on screen. Each is either a note to the
  app's builder or a claim about a surface that does not exist yet.
- **Any activity index** on the dashboard or in the sidebar.
- **Activities from superseded releases.** Only the imported release's set is read.

## Done means

Open Lesson 1 in the running app. Below the Practice A prose and above the **Practice B** heading
there is a panel naming the activity, what it asks for, and that nothing is recorded yet. The same
below Practice B. Practice C's panel sits directly above **Practice explanations**, which is still
fully readable. Nothing anywhere invites typing. All fifteen lessons carry three panels each, 45
in total, none at a lesson's foot. At 375px in both schemes the page still does not scroll
sideways.

## Findings declined, with reasons

- **`/code-review` 6: a malformed activity record blacks out all fifteen lessons.** The reviewer's
  point is real — one bad character in `response_fields`, or a `""` title, refuses the whole
  release — and it is in tension with decision 3, where a renamed heading deliberately does _not_
  refuse anything. Declined, because the two cases are not alike. A renamed heading leaves every
  field intact and only the anchor missing; the lesson still reads and the activity is still
  offered in full. A malformed record means the app does not know what the activity is, and the
  panel would render a blank line or a missing sentence with nothing saying why. The line this
  slice draws is: **fields the app puts on screen are validated; fields it never reads are not** —
  which is also why `lesson_version` is left alone. The refusal names the file, the activity and
  the field, so the author can fix it in one edit. Criterion I1's wording was widened to match what
  the code actually does, since the reviewer was right that the two disagreed.
- **`/code-review` 7: the error message in `activitiesOf` reaches nobody.** True — Fastify answers
  500, `toLessonView` replaces the body with "The app answered with status 500", and the server
  logs nothing. Declined for this slice, because the same reviewer confirmed the path is
  unreachable by construction (`content_release` and `content_activity_set` are created in one
  migration, so no release row can predate the table), and making the client render server error
  bodies changes the error contract for every endpoint, not just this one. Recorded here rather
  than silently left: if a later slice gives the client a way to show a server's own words, this
  message is waiting for it.

## Slice record

**2026-09-22 — built, reviewed and closed.** 651 tests across 27 files (542 before the slice).
Stage gates: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`,
`npm run format:check` and `npm run screenshots` all pass locally.

**Process deviation, recorded because it changed what the reviews could prove.** Implementation was
started while the test-guardian PRE pass was still running. PRE then reported FAIL on two critical
findings, both about test strength, and both were fixed before the implementation was finished — but
the consequence is that the tests were edited while the implementation existed, so the red commit
(`b5bcb7f`) is a presentational split rather than a chronological one and
`git diff <red> <green> -- <tests>` proves nothing. POST was therefore run with the specific edits
named rather than handed an empty diff, and it verified each one: the `bodyOrder` helper's change
from a 24-character slice to full text is strictly stronger, the `theme.test.ts` extraction changed
no threshold or pairing, and the two commits touch disjoint file sets.

**test-guardian PRE — FAIL, two critical findings, both taken.** (1) The real-release placement
test asserted only that no shallower heading sat between an activity's heading and its panel, which
a panel inserted directly under the heading satisfies vacuously; 16 of the 45 activities sit in
multi-block sections where those are different pages. It now computes the section's end and requires
the panel to be its last element. (2) V1–V3 had no test at all. Also taken: `attempt_provenance` in
the hidden-field lists, the JSON parser's own message pinned, a stores-nothing test per refusal
code, the placed/unplaced partition asserted by id, and the reason strings named in this spec.

**test-guardian POST — PASS.** No implementation gaming found; the real-release tests over the
author's own 45 activities are what makes that checkable. It named three unexercised paths, all now
covered: two activities naming one section, a subsection and its parent both ending at the document's
end, and an empty `response_fields`.

**`/code-review` — five confirmed findings taken, two declined (above), one plausible taken.**

- The screenshot gate passed when placement failed completely. It counted placed and foot panels
  together and filtered to `.lesson-body` before asking whether a panel sat under a heading, so a
  release where every heading stopped matching showed three panels per lesson and zero unmoored.
  Fixed and proven by sabotage.
- The gate's expected count was the literal `3`, making it a test of this one package. It now
  asks the app.
- The foot panels were component state with no teardown on a page that is not remounted between
  lessons, so opening a second lesson drew the first lesson's activity and its whole prompt under
  the second lesson's title for one commit. `LessonPage` is now keyed by the lesson. The test that
  catches this had to watch every mutation: the settled DOM is correct, and React reuses the
  element rather than re-adding it, so neither a settled assertion nor an added-node observer sees
  it.
- `heading_ambiguous` rendered the prompt although the section was on the page twice. U2 and U3
  were in conflict; U3 was amended and the code follows it.
- A heading matched by its authored Markdown spelling made the panel reprint the section's own
  name with the backticks showing. Both spellings now travel with the marker.
- (Plausible, taken) A rendered prompt's heading ids could collide with the body's, since each
  Markdown pass slugs independently. Prompts now render without heading ids.
- A heading nested in a quote is in the contents list but opens no section, so an activity naming
  it was told "this lesson has no heading with that name" — visibly false. The wording is now
  "no section with that heading".

**Design review — ship with nits, three taken, one taken in spirit.**

- The one sentence that must not be missable was `--muted-foreground` at `0.925rem` while the line
  above it was `--foreground` at `1rem`: smaller and dimmer, which is the visual grammar for "skip
  this". It now carries the same weight as the rest of the panel.
- `ACT-M020-01-01` broke after its last hyphen at 375px. The id is now `white-space: nowrap`.
- The panel's lime left rule was a fifth use of a spot colour `docs/specs/edge-visual-refinement.md`
  reserves to four declared echoes, all meaning "you are here". Rather than adding a fifth echo,
  the lime was removed: the reviewer confirmed the fill and hairline already read as the app's own
  chrome without it. The unplaced panel keeps its `--quote-rule` edge, because that exception is
  worth marking.
- The panel was an unlabelled `<aside>`, so three identical unnamed landmarks per lesson. Each now
  carries its kind and id as an accessible name, with no visible heading added.

The reviewer also verified 480, 600, 601, 620, 900, 1024 and 1151px — the awkward widths between the
three standard ones — with no horizontal overflow in either scheme.
