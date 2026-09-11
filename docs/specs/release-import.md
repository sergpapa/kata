# Spec — Release import (Milestone 1, slice 1)

**Status:** agreed 2026-09-11. Source: `docs/roadmap.md` Milestone 1 bullet 1, `docs/brief.md` §v1
scope 1, `VS_Code_Coder_Handoff_v1.md` §4 and §6, ADR 0005.

The app reads the supplied release, proves every file is byte-for-byte what the author published,
stores it against the keys that later work hangs off, and shows the owner either the five lessons or
the exact reason the release was refused.

## Decisions taken at Stage 0

1. **A refused release does not stop the app.** The server starts, serves no lessons, and the page
   states which file failed and why. A process that exits puts the only explanation in a terminal
   the owner may never read; a server that logs quietly produces an empty-looking app, which is the
   failure shape this slice exists to make impossible.
2. **The importer ships with its first consumer.** `GET /api/release` and a lesson list on the page
   land in this slice, so the import is verified end to end rather than against imagined usage.
3. **Every hash in the manifest is verified — all eight.** Five lessons, two lab kits, one activity
   file. Lesson Markdown and the activity file's text are stored; the lab zips stay on disk behind a
   verified metadata row, because nothing downloads them until Milestone 3.

## Assumptions (not asked, recorded instead)

- **The release is re-read and re-verified on every start.** Verification is against received bytes,
  so a cached "it was fine last time" is not verification. Storing is idempotent: an identical
  release produces no new rows.
- **Content rows are append-only and keyed by release ID, `candidate_lesson_id` and content
  version.** A new content version inserts new rows beside the old ones. Nothing overwrites a row an
  earlier prediction was recorded against — that is the brief's no-rewritten-history constraint, and
  an upsert would violate it the first time a lesson is revised.
- **The lesson's stable key is `candidate_lesson_id` from the file's front matter.** The manifest's
  `lesson_id` is cross-checked against it, never preferred over it (handoff §4).
- **YAML front matter is parsed with the `yaml` package.** The blocks contain nested lists and
  quoted scalars; a hand-rolled subset parser silently mis-reads exactly those.
- **`GET /api/release` answers 200 for a refused release,** with `state: "failed"` in the body. The
  request succeeded and the outcome is the resource; a 5xx would make the client report a broken
  server instead of a refused release.

## Acceptance criteria

### Verification

- [ ] A1. Every path in the manifest is resolved inside the release directory. A path that escapes it
      — `../`, an absolute path, a drive-qualified path, or a symlink pointing outside — is refused
      with `path_escapes_release` naming the path.
- [ ] A2. Each referenced file's SHA-256 is computed from the bytes actually read and compared with
      the manifest. A mismatch is refused with `hash_mismatch` naming the file, the expected hash and
      the received hash.
- [ ] A3. A referenced file that is absent is refused with `file_missing` naming the path.
- [ ] A4. All eight hashes are checked: five lessons, two lab kits, the activity file.
- [ ] A5. A manifest whose `schema_version` is not `1.x` is refused with
      `unsupported_manifest_schema`, rather than being read on a guess.
- [ ] A6. An absent manifest is refused with `manifest_missing` naming the path it looked for.
      Malformed JSON, or a manifest missing a required field, is refused with
      `manifest_unreadable` / `manifest_invalid` naming what was wrong.

### Identity conflicts

- [ ] B1. Two lesson entries sharing a lesson ID are refused with `duplicate_lesson_id` naming the ID.
- [ ] B2. Two lesson entries sharing an `order` value are refused with `duplicate_lesson_order`.
- [ ] B3. A lesson file whose front-matter `candidate_lesson_id` differs from the manifest's
      `lesson_id` is refused with `conflicting_lesson_id`, naming both values and the file.
- [ ] B4. A front-matter `document_id` or `version` that differs from the manifest entry is refused
      with `conflicting_document_id` / `conflicting_version`. This is the check that catches an old
      lesson substituted under a current manifest entry.
- [ ] B5. A lesson file with no front matter, unparseable front matter, or no `candidate_lesson_id`
      is refused with `front_matter_missing` / `front_matter_invalid`, naming the file.
- [ ] B6. A lesson body with no H1 is refused with `title_missing`. The display title is the first
      H1, never the filename.
- [ ] B7. A `lab_id` on a lesson with no matching `lab_downloads` entry is refused with
      `lab_not_found` naming the lab and the lesson.
- [ ] B8. Two lab entries sharing a `lab_id` are refused with `duplicate_lab_id`.
- [ ] B9. A lab whose `lesson_ids` do not match exactly the set of lessons pointing at it is refused
      with `lab_lesson_mismatch`, naming both sides.

### Storage

- [ ] C1. A verified release stores: the release identity (`release_id`, version, date, status,
      audience, manifest hash); one row per lesson keyed by release, `candidate_lesson_id` and
      content version, carrying order, document ID, module, manifest title, display title, source
      path, SHA-256, the preserved front matter, and the lesson source text; one row per lab kit with
      its version, path, hash and byte size; one row for the activity file with its hash and text.
- [ ] C2. Importing the identical release twice adds no rows the second time and changes no existing
      row.
- [ ] C3. Importing a changed lesson (new content version) leaves the earlier lesson row untouched
      and adds a new one.
- [ ] C4. A refused release writes nothing. Import is one transaction.
- [ ] C5. No SQL appears outside `modules/content/repository.ts` (ADR 0002).

### Consumer

- [ ] D1. `GET /api/release` after a verified import returns `state: "imported"`, the release
      identity, and the five lessons in manifest order with their `candidate_lesson_id`, content
      version, document ID, display title and lab ID (`null` for Lesson 1).
- [ ] D2. `GET /api/release` after a refused release returns 200 with `state: "failed"` and the
      failure's code, message and the file it names.
- [ ] D3. The page lists the five lesson titles in manifest order with the release ID and version,
      or states the named failure. No lesson body is rendered in this slice.
- [ ] D4. The real supplied release at
      `VS_Code_App_and_First_Five_Lessons_v1/vs-code-first-five-v1/content` imports clean: exactly
      five lessons, IDs `LS-M020-01` … `LS-M020-05` in order 1–5, Lesson 1 at `2.0.0-draft` and
      Lessons 2–5 at `1.0.0-draft`, Lesson 1 with no lab.

### Honesty

- [ ] E1. No generated or placeholder lesson is ever substituted for a missing or failing one. A
      refused release yields zero lessons, not four.
- [ ] E2. Every failure message names the specific file and the specific reason, in plain words the
      owner can act on.

## Out of scope for this slice

Markdown rendering, sanitization and Mermaid (Milestone 1 slices 2–3). Contents navigation and
resume (slice 4). Activity placement and any activity modelling — the file is verified and stored as
text only (Milestone 2). Lab downloads and copy-exact commands (Milestone 3). Notes, saves, export.
Any second content release or the historical `LS-HTTP-*` IDs.

## Done means

`npm run dev`, open the page, and read the five authored lesson titles in manifest order under the
release ID. Change one byte of a lesson file and reload: the page names that file and says the hash
did not match, and no lesson is listed.

## Slice log

- 2026-09-11. Spec agreed. Stage 0 questions answered: fail-visible at startup, importer ships with
  `GET /api/release` and the page list, all eight hashes verified with labs stored by reference.
