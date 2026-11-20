# Acceptance run — the four HTTP handoffs

Run 2026-11-20 on `main` at `b01fc9c` (the accessibility-pass merge), Windows 11, Node 24.12, the
built app (`npm run build`) driven by Playwright's Chromium. Roadmap: Milestone 3, "Acceptance run".

**Result: 32 of 35 checks pass. 3 pass in part.** The accessibility rehearsal passes in part
because the app has no separate help feature to rehearse and no screen reader has been run. The two
browser-cache rehearsals ran in an automated Chromium and every step behaved as the instructor notes
expect. Nobody has yet run them by hand in an installed Chrome with DevTools open. **No app defect
was found.**

## How it was run

One throwaway store, grown the way the owner's store grew. The server started on the first-five
release with an empty data directory, then restarted on 6–8, 9–13 and the first-fifteen 1.0.1
release in turn, over the same store (`EDUCODE_RELEASE_DIR_FSSE`, `EDUCODE_DATA_DIR`). Work was typed
into the lesson pages through the UI and saved with the Save button. Between restarts, every saved
field (text, revision) and the resume point were read through the API and compared byte for byte.
The owner's `data/educode.sqlite` was not touched.

**To run it again:** `npm run build`, then `npm run acceptance`. The scripts are in
[`tools/acceptance/`](../../tools/acceptance/). `run.mjs` drives the app through the four releases
and records 63 observations. `kits.mjs` extracts the downloaded kits and checks their starting test
counts. The two `rehearse-*.mjs` scripts run the browser rehearsals and check every step against its
expected result. The command exits 1 if anything differs. Results, downloads, exports and the
throwaway store go to `data/acceptance/`, which git ignores.

All 63 observations passed on the run reported here. A first run had 12 failures, all traced to the
script's own measurement and corrected: a diagram's source block counted as a code block, diagrams
drawn in a sandboxed iframe the script did not look inside, the provenance read from the API instead
of the export, and Windows' CRLF clipboard compared against LF source.

The rendering comparison counted, for every lesson, the `##`–`####` headings, tables, code blocks
and Mermaid blocks in the source (front matter removed), and the same things in the rendered lesson
body outside the activity panels. All 15 lessons match exactly, at every release they appear in.

Width, focus and accessibility evidence comes from the screenshot gate run the same day on the same
commit: 26 routes × 375 / 768 / 1440 × light and dark, axe-core clean at 375 and 1440, 44px
targets at 375, and Tab walks of the course list, dashboard and Lesson 6 with a visible focus at
every stop.

## First-five handoff (`VS_Code_Coder_Handoff_v1.md` §6)

| Check                       | Result            | Evidence                                                                                                                                                                                                                                                                                                           |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Import the supplied release | Pass              | 5 lessons, `LS-M020-01@2.0.0-draft`, `02`–`05@1.0.0-draft`, in order, each hash equal to the manifest. No other lesson present.                                                                                                                                                                                    |
| Inspect Lesson 1            | Pass              | 23 headings, 2 tables, 7 code blocks, 1 diagram, as in the source; the diagram drew. Opens with the authored first paragraph.                                                                                                                                                                                      |
| Inspect Lesson 2            | Pass, with a note | 41 headings, 3 tables, 19 code blocks, 1 diagram, as in the source. At 1.0.0-draft its diagram did not draw: that is the semicolon defect CF-001, corrected in 1.0.1, where it draws (see 14–15 check 8).                                                                                                          |
| Inspect Lessons 3–5         | Pass              | Structure matches the source. Lessons 3, 4 and 5 each link `FSSE-HTTP-LAB-03-05` 1.0.0-draft, hash equal to the manifest.                                                                                                                                                                                          |
| Change lessons              | Pass              | Answers saved in Lessons 1, 2 and 4; each lesson returns only its own activity's answers.                                                                                                                                                                                                                          |
| Save, refresh, restart      | Pass              | After a reload the Lesson 4 box holds the saved text, state "Saved at …". After a server restart all 3 fields and the resume point (Lesson 4) are identical. Edited text without Save shows "Not saved yet".                                                                                                       |
| Simulate a save failure     | Pass              | With the network refusing the save, the field says "The save did not go through" and "Your text is still here, and you can try again."; the box keeps the edit; the store keeps the earlier answer. Save after the network returns stores the edit. Unsaved text is not in an export; it is recovered by retrying. |
| Show answers                | Pass              | No lock, timer or score wording on the page and no disabled disclosure; "Practice explanations" is ordinary lesson content.                                                                                                                                                                                        |
| Export the trial            | Pass              | The dashboard's Export downloads `EduCode_FSSE_Lessons_01-05_2026-11-20.md` with the answer, activity ID, content version and release ID. The review notes are the owner's own form, outside the app.                                                                                                              |
| Update content              | Pass              | After the 1.0.1 import, Lesson 2 is "Content version: 1.0.1-draft" in the export, and its old answer reads "saved … against content version 1.0.0-draft of release FSSE-HTTP-FIRST-FIVE (revision 1)".                                                                                                             |
| Inspect review/progress     | Pass              | The app has no review, studied or mastery feature. The dashboard says "Last opened", and holds none of mastery, graduate, verified, competence, passed.                                                                                                                                                            |
| Rehearse accessibility      | Pass in part      | Navigation, notes, downloads and export: Tab walks and axe in the gate. Diagrams: each has its author's "In words:" text. **Help:** the app has no help feature; help is the lessons' own troubleshooting sections. **No screen reader has been run.**                                                             |

## Lessons 6–8 handoff ("App acceptance checks")

| Check                                            | Result | Evidence                                                                                                          |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Dashboard, navigation and styling remain         | Pass   | The 8 titles on the dashboard match the manifest; the gate captured every route.                                  |
| Lessons 1–5 work survives; new lessons unstudied | Pass   | All saved fields and the resume point identical across the import; Lessons 6–8 hold no answers.                   |
| Resume at Lesson 4, then 5, 6, 7, 8              | Pass   | The continue card reads "LAST OPENED LESSON 04"; its button opens Lesson 4; Next walked 4 → 5 → 6 → 7 → 8.        |
| Titles match; new lessons render in full         | Pass   | Titles equal the manifest. Lessons 6–8 structure equal to the source; Lesson 6's diagram drew.                    |
| Each lesson downloads its kit; checksums match   | Pass   | Downloaded through each lesson's link: Lesson 2, 3–5 and 6–8 kits, SHA-256 equal to the manifest.                 |
| Anchors, help, stable IDs                        | Pass   | Lesson 6's 3 activity panels sit inside the lesson body; answers are keyed by activity ID and field.              |
| Metadata out of the narrative                    | Pass   | No 64-hex hash and no document ID in the visible lesson; lesson facts and the kit hash sit in closed disclosures. |
| Study progress versus verified competence        | Pass   | Nothing in the app claims competence or verification (see "Inspect review/progress").                             |

## Lessons 9–13 handoff ("Acceptance in your app")

| Check                                                              | Result       | Evidence                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Thirteen lessons in order; 8 → 9; 13 → end                      | Pass         | Order equals the manifest. Lesson 8's Next is Lesson 9; Lesson 13 has no Next; `LS-M021-06` answered 404 under this release.                                                                                    |
| 2. Same state before and after; re-import adds nothing             | Pass         | Saved fields and resume point identical before import, after it, and after a second start on the same release. The app has no completed-lesson or bookmark records to compare.                                  |
| 3. Table, Lesson 11 diagram, Lesson 12 code at desktop and narrow  | Pass (gate)  | The gate covers every lesson at 375 / 768 / 1440 with no sideways page scroll and focus visible in the Tab walks; Lesson 11's diagram drew in this run.                                                         |
| 4. Download the lab; hash; baseline data; incomplete practice file | Pass         | SHA-256 equal to the manifest. The extracted kit has `data/cafe.json` and `practice/decision.mjs`; `node --test checks/practice.test.mjs` gives 4 pass, 10 fail, which is the starting state its README states. |
| 5. Prediction, then observation; navigate away; reload             | Pass         | `ACT-M021-01-01` prediction and observation both stored and shown after a reload; earlier records unchanged.                                                                                                    |
| 6. No release metadata as content; no competency award             | Pass         | As in the 6–8 checks.                                                                                                                                                                                           |
| 7. Browser-cache sequence in `Instructor_Notes.md`                 | Pass in part | Steps 1–8 run in automated Chromium; every step as expected. See "Browser rehearsals" below.                                                                                                                    |

## Lessons 14–15 handoff (`http-first-fifteen-v1_0_1`, "Acceptance")

The roadmap counted seven checks from the earlier 14–15 package. The current 1.0.1 package has
eight; this run used those.

| Check                                                                                    | Result            | Evidence                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Fifteen lessons; 2 and 7 at 1.0.1; 13 → 14 → 15                                       | Pass              | Lessons 2 and 7 at 1.0.1-draft, the rest unchanged, each hash equal to the manifest. Next goes 13 → 14 → 15; Lesson 15 has none; `LS-M021-08` answers 404.                                                                                                                                                                                 |
| 2. Work survives an import and a second identical import                                 | Pass              | 5 saved fields and the resume point identical across both.                                                                                                                                                                                                                                                                                 |
| 3. Code and tables at both widths; copy keeps characters                                 | Pass              | Every copy button on Lessons 14 and 15 (18 blocks; 8 multi-line, 9 with quotes or backticks) put text on the clipboard that appears verbatim in the source. Widths and focus from the gate.                                                                                                                                                |
| 4. Archive hash; starter defects; skipped worksheet                                      | Pass              | SHA-256 equal to the manifest. Extracted: incident 17 pass / 5 fail, transfer 3 pass / 5 fail, learner regression 1 skipped, as its README states. Reference repairs sit apart in `reference/`. The earlier 02, 06–08 (1.0.1) and 09–13 kits still download with matching hashes.                                                          |
| 5. Prediction and explanation in a new activity; reload                                  | Pass              | `ACT-M021-06-01` both fields stored and shown after a reload; earlier records unchanged.                                                                                                                                                                                                                                                   |
| 6. Evidence sources kept apart                                                           | Pass (inspection) | Author scenarios and CLI captures are lesson text; the learner's words are in fields labelled "Your prediction", "What you observed"; Claude's replies are labelled "AI feedback · <model>"; the export labels each answer with when, which content version and which release. The app merges none of them into a claimed evidence source. |
| 7. Browser steps in the lab's `Instructor_Notes.md`                                      | Pass in part      | Steps 1–6 run in automated Chromium; every step as expected. See "Browser rehearsals" below.                                                                                                                                                                                                                                               |
| 8. Five Mermaid blocks parse with the pinned version; Lesson 2 drawn with the correction | Pass              | Mermaid 11.17.2 (pinned `^11.17.2`). Lessons 1, 2, 5, 6 and 11 all drew; none fell back. Lesson 2's drawing holds "Stopped, the file remains" and not the old "Stopped; the file remains".                                                                                                                                                 |

## Browser rehearsals

**Setup.** Both ran in Playwright's Chromium 153.0.8010.12, headless, on Windows 11, driven by
script. Each run used a new browser context, with its own empty HTTP cache, and no request
interception, which would have switched the cache off. DevTools was not open, so "Disable cache" was
never on. No service worker was registered on either origin. Each kit was the extracted download,
with its hash already checked. The 14–15 repairs were applied to a copy, by copying the two
`reference/` files to the destinations its README names. The origin column below is the kit's own
request log: incoming `If-None-Match`, then status. The page column is what the lab page shows to
page code.

**Why this is "in part".** The notes ask for "an actual Chrome/Chromium installation". This was a
real Chromium with its real HTTP cache, but automated, headless and fast: the 9–13 run took 7
seconds, well inside the 5-minute freshness window. A person at an installed Chrome, with DevTools
open and normal timing, has not run either sequence.

### Lessons 9–13 kit, port 4320

| Step | Action                      | Policy   | Source              | Origin                          | Page                                                                                         |
| ---- | --------------------------- | -------- | ------------------- | ------------------------------- | -------------------------------------------------------------------------------------------- |
| 2    | Start with a current copy   | fresh    | 17:00               | no condition → 200              | 200, 17:00                                                                                   |
| 2    | Read normally               | fresh    | 17:00               | no request                      | 200, 17:00                                                                                   |
| 3    | Read normally               | fresh    | 18:00               | no request                      | 200, 17:00 (retained)                                                                        |
| 3    | direct `curl`               | fresh    | 18:00               | → 200                           | curl reads 18:00                                                                             |
| 4    | Bypass storage              | fresh    | 18:00               | no condition → 200              | 200, 18:00                                                                                   |
| 4    | Read normally               | fresh    | 18:00               | no request                      | 200, 17:00 (old entry kept)                                                                  |
| 5    | Validate the stored copy    | fresh    | 18:00               | old tag `d5e2f2…` → 200         | 200, 18:00                                                                                   |
| 5    | Validate the stored copy    | fresh    | 18:00               | new tag `6bb357…` → 304         | 200, 18:00                                                                                   |
| 6    | Start with a current copy   | validate | 17:00               | no condition → 200              | 200, 17:00                                                                                   |
| 6    | Validate the stored copy    | validate | 17:00               | `d5e2f2…` → 304                 | 200, 17:00                                                                                   |
| 7    | Read normally               | validate | 17:00               | `d5e2f2…` → 304                 | 200, 17:00                                                                                   |
| 7    | Read normally, after `note` | validate | 17:00, note changed | `d5e2f2…` → 304 (tag unchanged) | 200, 17:00                                                                                   |
| 8    | Validate, server stopped    | validate | —                   | no request                      | "The request failed (TypeError). The panel below still shows the previous completed result." |
| 8    | Read normally, restarted    | validate | 17:00               | `d5e2f2…` → 304                 | 200, 17:00                                                                                   |

On the first run the kit's log showed two origin requests during step 4's bypass. The first was
step 3's `curl`, whose log line reached the script late. The bypass itself made one request, and
`rehearse-09-13.mjs` now waits for the `curl` line before the next step.

### Lessons 14–15 kit, incident on 4322, transfer on 4324

| Step | Action                                  | Source                      | Origin                      | Page                                                |
| ---- | --------------------------------------- | --------------------------- | --------------------------- | --------------------------------------------------- |
| 2    | Start with a current copy               | original; 17:00             | no condition → 200          | 200, 17:00, `private, no-cache`, tag `4dcd85…`      |
| 3    | Read normally                           | original; time only → 18:00 | `4dcd85…` → **304 (false)** | 200, 17:00                                          |
| 4    | Bypass storage                          | original; 18:00             | no condition → 200          | 200, 18:00                                          |
| 4    | Read normally                           | original; 18:00             | `4dcd85…` → **304 (false)** | 200, 17:00: the bypass did not repair the validator |
| 5    | Start with a current copy               | repaired; 17:00             | no condition → 200          | 200, 17:00, tag `12a41b…`                           |
| 5    | Read normally                           | repaired; time only → 18:00 | `12a41b…` → 200             | 200, 18:00, new tag `1ce526…`                       |
| 5    | Read normally                           | repaired; 18:00             | `1ce526…` → 304             | 200, 18:00                                          |
| 6    | Bypass, morning then evening            | original transfer           | → 200, → 200                | 11:00, then **11:00** (evening asked)               |
| 6    | Bypass, evening then morning, restarted | original transfer           | → 200, → 200                | 21:00, then **21:00** (morning asked)               |
| 6    | Bypass, morning then evening            | repaired transfer           | → 200, → 200                | 11:00, then 21:00                                   |
| 6    | Bypass, evening then morning, restarted | repaired transfer           | → 200, → 200                | 21:00, then 11:00                                   |

Morning is "Breakfast is served until 11:00", evening "Dinner is served until 21:00". The original
transfer serves whichever edition was asked for first, in either order. The repaired one serves each
edition correctly in both orders.

## Observations that are not defects

- Copy on Windows puts CRLF line ends on the clipboard. That is the operating system's clipboard,
  not the app: the copied characters are otherwise the source's exactly.
- A failed save keeps the text in the box and offers retry, but an export taken while a save is
  failing carries the last stored answer, not the unsaved text.
- Every check above ran on Windows 11 only.
