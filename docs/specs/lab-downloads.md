# Lab downloads — Milestone 3, slice 1

**Status:** criteria approved 2026-09-23. Sources: `VS_Code_Coder_Handoff_v1.md` §"Labs and
downloads" ("Show the correct downloadable lab for each lesson and explain that commands run in the
learner's local terminal… A Copy button copies exactly the command or code shown. Do not run
submitted programs or automatically execute downloaded lesson code on the application server") and
its acceptance rows "Inspect Lessons 3–5" and "Rehearse accessibility";
`VS_Code_Coder_Handoff_Lessons_06_08_v1.md` §"Import and progression" item 5 and its acceptance
check "Each lesson downloads its declared kit; earlier kits remain available and their checksums
match"; `VS_Code_Coder_Handoff_Lessons_09_13_v1.md` §"Acceptance in your app" item 4 ("Download the
new lab and confirm its file hash matches the release manifest");
`VS_Code_Coder_Handoff_Lessons_14_15_v1.md` §"The deliberately faulty starter" ("Keep its lab ZIP
byte-for-byte as supplied") and §"Acceptance" item 4; ADR 0005 (content is untrusted data, rendered
inertly); ADR 0009 (received packages live under `content/releases/`); `docs/roadmap.md` Milestone 3
item 1.

Every kit the author shipped has been verified on every start since slice 1 and stored since then,
and no reader has ever been able to reach one. This slice opens that door — and only that door. The
app hands over bytes it has proved are the author's, says whose they are, and never runs them.

## Facts established before the criteria were written

Measured against `content/releases/http-first-fifteen-v1_0_1/` and the code at commit `f4a0713`:

- The release declares **five** lab kits in `lab_downloads` and the importer already verifies all
  five against their manifest SHA-256 on every start. `content_lab_kit` has held `lab_id`,
  `lab_version`, `source_path`, `sha256`, `byte_size` and `lesson_ids_json` since schema 2.
  **This slice adds no table, no column and no migration.** The schema stays at 4.
- `byte_size` is computed from the verified bytes at import (`verify.ts:277`), not claimed by the
  manifest. It is therefore a fact about the file, not about the paperwork.
- The five kits and who shares them:

  | Lab id                | Version     | File                                          | Bytes  | Lessons |
  | --------------------- | ----------- | --------------------------------------------- | ------ | ------- |
  | `FSSE-HTTP-LAB-02`    | 1.0.1-draft | `HTTP_Lesson_02_Local_Server_Kit_v1.zip`      | 23,056 | 2       |
  | `FSSE-HTTP-LAB-03-05` | 1.0.0-draft | `HTTP_Lessons_03_05_Local_Kit_v1.zip`         | 37,426 | 3, 4, 5 |
  | `FSSE-HTTP-LAB-06-08` | 1.0.1-draft | `HTTP_Lessons_06_08_Local_Kit_v1.zip`         | 39,167 | 6, 7, 8 |
  | `FSSE-HTTP-LAB-09-13` | 1.0.0-draft | `HTTP_Lessons_09_13_Local_Kit_v1.zip`         | 55,823 | 9–13    |
  | `FSSE-HTTP-LAB-14-15` | 1.0.0-draft | `HTTP_Lessons_14_15_Investigation_Kit_v1.zip` | 43,764 | 14, 15  |

  Lesson 1 declares `lab_id: null` and is the only lesson that does.

- Every lesson's front-matter `exercise_kit` filename agrees with the basename of its manifest lab
  path, all 14, checked before these criteria were written. That agreement is not guaranteed by the
  importer, so this slice pins it: a release where the page offers a different kit from the one the
  lesson names in prose is a release the reader would be misled by.
- `readVerifiedBytes(releaseRealDir, relativePath, expectedSha256)` in `releaseFiles.ts` already
  does the whole of the download's safety work: it refuses a path that escapes the release by
  either OS convention or by real path, and refuses bytes that do not hash to what the release
  says. The download route is that function plus headers.
- `AppDeps` carries `db`, `release` and an optional `webDistDir`. It does **not** carry the release
  directory, and the download needs it. It becomes a required field, not an optional one with a
  default — a default would let an unwired composition start and fail at runtime (CLAUDE.md).
- Only **5** of the 14 kit-bearing lessons name their kit in the body: 2, 3, 6, 9 and 14. Lessons 4,
  5, 7, 8, 10, 11, 12, 13 and 15 name it in front matter only, which `learnerFacingFacts` strips.
  This is what decides decision 1.
- The 15 lessons hold **160** fenced code blocks: 69 `sh`, 30 `javascript`, 25 `text`, 19 `http`,
  8 `json`, 5 `mermaid`, 2 `powershell`, 2 `html`. Every fence carries a language; none is bare.
- `LessonMarkdown`'s `pre` component already has the exact seam a Copy button needs: `fenceText(node)`
  returns the characters between the fences read from the mdast tree rather than from rendered React
  children, precisely because a fence's whitespace is load-bearing (criterion W1 of
  `docs/specs/markdown-rendering.md`). The copy takes the same string the Mermaid renderer takes.

## Decisions (asked 2026-09-23, one batch — all four defaults taken)

1. **The kit sits in a fixed place: below the facts, above the body.** Not at the first prose
   mention. Nine of the fourteen kit-bearing lessons never mention the kit in their body, so
   matching on the filename would place the panel for five lessons and fall back for nine — a
   control whose position depends on whether the author happened to repeat a filename. A fixed
   position is findable before the lesson is read, which is when the reader needs it: the kit has to
   be extracted and opened before most of these lessons make sense.
2. **Every fenced code block gets a Copy button**, not only `sh` and `powershell`. The handoff says
   "copies exactly the command or code shown", and the 19 `http` and 8 `json` blocks are copied as
   often as the commands — an HTTP request line is the thing a reader pastes into a client. A button
   that appeared on 71 of 160 blocks would teach the reader to look for it and then not find it.
3. **Kits are reachable through their lessons only.** No downloads index on the dashboard. "Earlier
   kits remain available" is satisfied by earlier lessons still being open to anyone: the 03–05 kit
   is on lessons 3, 4 and 5 for as long as those lessons exist. A dashboard list would put five lab
   ids, five versions and five hashes in front of a reader whose next action is to read lesson 1 —
   release administration in the student-facing path, which the 14–15 handoff asks to keep out.
4. **The suite's concurrency question was answered first**, before any test in this slice was
   written. Recorded in the slice log below and in commit `f4a0713`, not here, because it changed no
   behaviour this spec describes.

## Decisions (not asked — recorded with reasons)

- **The bytes are re-verified against the manifest hash on every download, not only at start-up.**
  The kits are 23–56 KB; hashing one costs under a millisecond. The start-up check proves the file
  was right when the process began, and the promise the handoffs actually ask for is "compare its
  SHA-256 with the registry" at the moment the reader takes it. A file changed under a running app
  is the case this catches, and it is exactly the case the 14–15 handoff's byte-for-byte contract
  exists for.
- **The download is a server route, never a static file mount.** Mounting the release directory
  would publish every lesson source, the activity file and the manifest at guessable URLs, and would
  hand out whatever bytes are on disk rather than the bytes the release describes. The route serves
  one thing: a kit named in `content_lab_kit`, looked up by lab id.
- **The lab id is looked up, never joined to a path.** `GET /api/labs/:labId/download` reads the
  stored row for that id and uses the row's `source_path`. A traversal attempt in the id therefore
  cannot become a path at all — it becomes a lookup that finds nothing. This is belt and braces over
  `readVerifiedBytes`'s own escape check, and the cheaper of the two to reason about.
- **`content-disposition: attachment`, with the author's own filename.** The reader is told by
  lesson 2 to use `HTTP_Lesson_02_Local_Server_Kit_v1.zip` by name; a download that lands as
  `download.zip` or `FSSE-HTTP-LAB-02.zip` makes the lesson's instruction wrong. `attachment` also
  keeps the browser from trying to render the bytes.
- **The panel states the kit's SHA-256 in full.** Four handoffs ask the integrator to compare the
  hash against the registry, and two ask the owner to. A truncated hash cannot be compared. It is
  set in a monospace block that wraps rather than a line that overflows at 375px.
- **The panel says the app never runs the kit.** The handoffs say it four times in four different
  ways, and it is the one thing a reader could reasonably assume wrong: an app that hands you a
  server kit might be expected to start it. It does not, and the panel says so where the button is.
- **Lesson 1 gets a sentence, not silence.** "This lesson needs no kit — there is nothing to
  install." Silence is indistinguishable from a page that failed to load its kit, and lesson 1 is
  the first page a reader ever sees.
- **The copy writes to the clipboard and does nothing else.** No fetch, no navigation, no change to
  the block's own text, no record. `type="button"` explicitly, because a button inside anything that
  becomes a form defaults to submit.
- **A refused clipboard is named, not swallowed.** `navigator.clipboard` is absent over plain HTTP
  on some browsers and can be denied by permission. The button says the copy did not happen and the
  text stays selectable, which is the honest fallback. Silently doing nothing would be the same
  false-success failure ADR 0004 forbids for saves, in a smaller place.
- **No ZIP is opened, listed, previewed or extracted by this app.** ADR 0005 says content is
  untrusted data. A ZIP is the most untrusted shape of it, and the 14–15 kit ships deliberately
  broken code on purpose. The app moves the bytes and nothing else.

## Assumptions

- No schema change. `content_lab_kit` already holds every field the panel and the route need.
- No new dependency. Fastify sends a `Buffer` with explicit headers; the clipboard is
  `navigator.clipboard.writeText`.
- `AppDeps.releaseDir` becomes required. Every composition root and test fixture that builds
  `AppDeps` must pass it, and the type error is the point.
- A kit is served whole, in one response. At 56 KB the largest, there is no range, resume or
  streaming question to answer.
- Export is not in this slice, and neither is prediction history. Milestone 2 still has both open;
  starting Milestone 3 here was the owner's call, and Export (Milestone 3 slice 2) will want
  prediction history to exist before it can carry revisions.
- The screenshot gate gains a kit check. It does not gain a download: a gate that downloads 15 ZIPs
  per width per scheme is 90 downloads to prove a link's `href`.

## Existing tests this slice re-aims or retires

**None.** Recorded here before the red commit with the greps that support it, because the standing
rule is that a test is never changed to make an implementation pass — and because the previous slice
put the sentence "None of them is weakened" in this section when one of them was. A claim in this
section is only worth what the search behind it is worth, so here is the search:

- **`AppDeps` gains a required `releaseDir`.** 31 `buildApp(` call sites across `app.test.ts`,
  `realReleaseActivities.test.ts`, `realReleaseNavigation.test.ts`, `responses.test.ts` and
  `index.ts` must each pass it. Every one is a mechanical addition of a directory that test already
  has in hand; no assertion changes, and the type error is the loud failure CLAUDE.md asks for
  instead of a silent default.
- **Nothing pins the lesson response exhaustively.** Every assertion on `GET /api/lessons/:id` in
  `app.test.ts` uses `toMatchObject`; there is no `toStrictEqual` and no `Object.keys` anywhere in
  the server tests. Adding `labKit` adds a key nothing forbids.
- **The Copy button goes outside the `pre`, so no code-block test moves.** Six existing assertions
  read code blocks by `container.querySelectorAll('pre')` and compare `textContent`
  (`realLessons.test.tsx` ×4, `MermaidDiagram.test.tsx` ×2), plus the gate's `white-space: pre`
  check in `screenshots.mjs`. The language label already sits outside the `pre` for exactly this
  reason — text inside the block becomes part of the sample — and the button joins it there. C7
  asserts that directly rather than leaving it to the existing six to notice.
- **No test counts the buttons on a lesson page.** The only exhaustive button assertion in the suite
  is `StandbyPage.test.tsx` — `queryAllByRole('button')).toHaveLength(0)` — on a page with no lesson
  body and no code blocks.
- **The screenshot gate gains a check; none of its existing checks changes.** `checkActivityPanels`
  counts `.activity-panel` and `.response-field textarea`, neither of which this slice touches.

## Criteria

### K — the kit beside its lesson

- **K1.** `GET /api/lessons/:candidateLessonId` carries a `labKit` object naming the lab id, its
  version, the authored filename, the byte size, the SHA-256 and the candidate lesson ids that share
  it. Every field is read from the stored release; nothing is taken from the request.
- **K2.** A lesson that declares no lab id answers `labKit: null`. It is not an empty object and not
  an omitted key.
- **K3.** Over the real release directory, all 15 lessons' `labKit` matches `learning-release.json`:
  fourteen kits across five distinct lab ids, and `null` for `LS-M020-01` alone.
- **K4.** Over the real release directory, every lesson's `labKit.fileName` equals its own
  front-matter `exercise_kit`, for all 14. A release where they disagree fails this test by name.
- **K5.** The lesson page shows the kit between the facts and the body, on every lesson that has
  one, naming the filename, the lab id, the version, the size and the full SHA-256.
- **K6.** A kit shared by more than one lesson says which lessons share it, by number.
- **K7.** The panel says the kit runs on the reader's own computer and that this app never runs it.
- **K8.** Lesson 1 shows a sentence saying it needs no kit, in the same place the panel would be.
- **K9.** While the release stands refused, no lesson page offers a kit.

### D — the download

- **D1.** `GET /api/labs/:labId/download` answers 200 with the exact stored bytes,
  `content-type: application/zip`, `content-length` equal to the stored `byte_size`, and
  `content-disposition: attachment` carrying the authored filename.
- **D2.** The response body hashes to the manifest's SHA-256. Asserted on the bytes received, not on
  the header.
- **D3.** Bytes on disk that no longer hash to the release's value are refused with
  `hash_mismatch`, naming both hashes, and **no body is sent**. A changed kit is never handed over.
- **D4.** An unknown lab id answers 404 naming the id it was asked for. No directory is listed and
  no other id is suggested.
- **D5.** A lab id containing `..`, a slash, a backslash or a drive letter answers 404 and reads no
  file. Asserted by proving the route never touches the filesystem for such an id.
- **D6.** While the release stands refused, the download answers the same named refusal the rest of
  the app answers, and no bytes are sent.
- **D7.** Over the real release directory, all five kits download, and each response body hashes to
  the value in `learning-release.json`. This is the 06–08 handoff's "earlier kits remain available
  and their checksums match", asserted rather than described.
- **D8.** The download reads the release directory and never writes to it. The file's bytes and
  mtime are unchanged after a download.

### C — copy exactly, and copy only

- **C1.** Every fenced code block in a lesson carries a Copy button, including the labelled source
  block a diagram falls back to. 160 fences in the shipped release; the 155 that are not `mermaid`
  are asserted over the whole release, and the five that are are asserted on the fallback path.
  A diagram that draws **replaces** its source block, so there is no block left to put a button on —
  counting all 160 in one sweep would pass or fail on whether Mermaid finished drawing inside jsdom,
  which is a fact about the test runner and not about the app.
- **C2.** The button copies the characters between the fences character for character: every space,
  every tab, every blank line, no trailing newline added and none removed. Asserted against the
  authored bytes of a real lesson, not against a fixture.
- **C3.** Pressing it writes to the clipboard and does nothing else — no fetch is made, no
  navigation happens, and the block's own text is unchanged afterwards.
- **C4.** After a copy the button says the text was copied, and returns to offering Copy.
- **C5.** A clipboard that is absent or refuses says so on the button. It never reports a copy that
  did not happen.
- **C6.** The button is reachable by keyboard, operable by Enter and Space, and its accessible name
  says which block it copies rather than being one of 160 buttons called "Copy".
- **C7.** The button's own text never appears in what is copied.

### V — visual and responsive

- **V1.** The panel uses the existing Engineering Practice tokens. It introduces no new colour that
  `theme.test.ts` does not measure in both schemes.
- **V2.** At 375, 768 and 1440 the panel and every Copy button stay inside the page with no
  horizontal page scroll. The SHA-256 wraps; it does not push the card wide.
- **V3.** The Copy button does not cover the code it copies, and does not shrink the block's own
  horizontal scroll region to less than the width it had before this slice.
- **V4.** The screenshot gate proves, per lesson per width per scheme, that a lesson with a declared
  kit shows exactly one kit panel naming that kit's filename, and that lesson 1 shows none. Proven
  by sabotage before the slice is called done.

## Explicitly not in this slice

- No ZIP is opened, listed, previewed, extracted or executed, ever.
- No downloads index on the dashboard (decision 3).
- No record that a kit was downloaded. Nothing about a download is learner work, and a "downloaded"
  marker would be a progress claim the app cannot stand behind — the same reason ADR 0010 keeps the
  resume point outside the save contract.
- No download progress, resume, or range requests.
- No checksum _verification UI_ — the panel states the hash; comparing it is the reader's step, and
  the app has already proved the bytes it served.
- Export, prediction history, and save-failure recovery.

## Slice log

- **2026-09-23 — the suite's concurrency question, answered before the slice.** The roadmap parked
  it here and the owner chose to take it first. One label, "flaky", turned out to cover two faults.
  The timeout was jsdom saturation: 22 environments built for 21 web files, 223s of construction
  inside a 64s wall clock. `pool: 'vmThreads'` builds one per worker and keeps per-file module
  registries — 64.4s to 9.8s. `isolate: false` was measured and rejected: it shares the environment
  across files and broke two `unsavedNavigation` assertions outright. Removing the saturation
  exposed a second failure it had been hiding, three `unsavedNavigation` cases failing on a **wrong
  value**, which is the signature of a real race. The unsaved registry was written in a passive
  effect while three synchronous handlers read it — the link veto in `navigate()`, `popstate` and
  `beforeunload` — so a field that had just rendered itself `saved` stayed registered as unsaved for
  one task, and a click or a refresh inside that task was refused over work that was safe. The write
  is now a layout effect, and `beforeunload` asks `hasUnsaved()` when the browser asks it rather
  than being attached and detached as the answer changes. 0 failures in 25 unloaded full-suite runs,
  against 1-in-3 before. Commit `f4a0713`.
