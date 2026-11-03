# Release packaging — build a reissue from an editable source tree

Authoring support, slice 1 (ADR 0013). Lessons are now written in this repo, but they still ship as
cumulative, hash-addressed release packages under `content/releases/`. Today a one-character
correction moves four things together: the lesson, its hash, the copy of it inside its lab kit,
and that kit's zip and hash (`docs/content-feedback.md`, "What accepting a change costs"). The old
author did that by hand. This slice makes it mechanical. Its first consumer is the next correction
reissue, which is expected from the owner's reading of Lessons 5–15.

Decided with the owner on 2026-11-03: edits happen in an editable **source tree**, and the tool
builds a fresh release from it. Releases stay read-only.

## The format, as received (checked 2026-11-03 against `http-first-fifteen-v1_0_1`)

- Package root: authored documents (`START_HERE.md`, `CHANGELOG.md`, review form, corrections
  records, `specifications/`), plus `package-manifest.json` (`package_id`, `version`, `date`,
  `read_first`, `release_manifest`, `files[{path, sha256}]`, which lists every file except itself)
  and `package-verification.json`.
- `content/` is what the importer reads: `learning-release.json`, `lessons/*.md` (15),
  `trial-activities.json` (45 activities, each with a `lesson_version`), and `labs/*.zip` (5).
- Each lesson entry is `order`, `lesson_id`, `document_id`, `version`, `module`, `title`, `path`,
  `sha256` and `lab_id`. All but `order`, `path`, `sha256` and `lab_id` come from the lesson's
  front matter and first H1. The importer refuses a disagreement between them.
- Each kit zip holds one top folder with no directory entries, deflated. It carries a byte-exact
  copy of every lesson it serves at that folder's root, and a `manifest.json` whose `files[]`
  hashes every member except itself. Two shapes exist: Lesson 2's kit uses
  `kit_id`/`kit_version` with `bytes` per file, and the other four use `lab_id`/`version`.

## Acceptance criteria

- [ ] **C1. Seed.** `npm run release:seed -- <package dir> <source dir>` writes a source tree from a
      release that verifies. Lessons and `trial-activities.json` are copied byte for byte. Each
      kit is unpacked into `labs/<archive name without .zip>/<inner folder>/` **without** its nested lesson
      copies. `release.json` records release-level fields, lesson order, each kit's `lab_id`,
      archive name and `lesson_ids`, `previous_release` (the seeded package) and `package_id`.
      Authored package documents go under `package/`. The generated files (`package-manifest.json`,
      `package-verification.json`, `release-changes.json`) are not copied.
- [ ] **C2. Seeding refuses rather than loses.** The seed refuses, naming the file, when the
      release does not verify, when a kit's nested lesson copy differs from the canonical lesson
      (dropping it would lose bytes), or when the target directory already exists.
- [ ] **C3. Build.** `npm run release:build -- <source dir> <output package dir>` writes a package
      in the format above. The importer's own `verifyRelease` accepts its `content/`, and the
      package then exists under its final name. A refusal leaves no output directory behind, and
      an existing output directory is refused, never overwritten.
- [ ] **C4. Lesson entries are derived, never typed.** Identity, version and title come from front
      matter and the H1. `order` comes from `release.json`, `lab_id` from the kit that lists the
      lesson, and `sha256` from the bytes.
- [ ] **C5. Kits carry the canonical lessons.** Every kit gets an exact copy of each lesson it
      serves at its folder root, injected at build. Its `manifest.json` `files[]` is rewritten to
      the members' real hashes (and `bytes`, where the entry has that field). All other manifest
      fields stay as authored.
- [ ] **C6. An unchanged kit keeps its exact bytes.** When a kit's assembled members match the
      previous release's members path for path and byte for byte, the previous zip is reused
      verbatim. A changed kit is repacked deterministically: same members, byte-identical zip,
      every time.
- [ ] **C7. Versions move with bytes.** A lesson whose bytes changed must carry a different
      front-matter `version` from the previous release. A changed kit must carry a different
      manifest version (`version` or `kit_version`). The release `version` must differ from the
      previous release's. Each violation is refused, naming the file and both versions.
- [ ] **C8. Activities follow their lessons.** Every activity's `lesson_version` must equal its
      lesson's current version. Otherwise the build refuses, naming the activity ID and the
      expected version. The activity file ships byte for byte; the tool never edits authored files.
- [ ] **C9. The change record names the bytes.** `release-changes.json` (listed in
      `package-manifest.json`) and the console summary give, for every lesson, kit and the
      activity file, its status (`changed` or `unchanged`) with previous and new version and
      hash, plus the release version transition and `accepted_feedback` from `release.json`.
- [ ] **C10. Nothing to release is refused.** A build in which no lesson, kit or activity byte
      changed is refused.
- [ ] **C11. Honest verification record.** `package-verification.json` records what the build
      checked (importer verification, nested copies injected, every hash recomputed) and states
      that Mermaid parse/render, browser rehearsal and kit runtime suites were **not run by this
      tool**.
- [ ] **C12. Round trip on the real release.** Seed 1.0.1. Change one line of Lesson 5, bump its
      version, that version in its 3 activities, and the 03-05 kit's version. Then build 1.0.2. The result: the importer
      accepts it; 14 lessons are byte-identical to 1.0.1; 4 kit zips are byte-identical; the 03-05
      kit differs only in Lesson 5's copy and its manifest; the change record lists exactly Lesson
      5, kit 03-05 and the activity file as changed.

## Scope fence — not in this slice

- **Adding or removing lessons or kits.** The build refuses both. Their first consumer is Lesson
  16, which gets its own slice.
- **Making a built release current** (flipping `config.ts`, `config.test.ts` and
  `content/RELEASES.md`). The build prints those steps. Doing them stays a deliberate act.
- **Content checks**: Mermaid, browser, and kit runtime suites. `tools/diagram-checks.mjs` and the
  screenshots gate already exist. This tool records that it did not run them.
- No change to the importer, to any existing release, or to the app.

## Assumptions (defaults taken, not asked)

- **Zip handling is our own code** on `node:zlib` (`deflateRawSync`, `inflateRawSync`, `crc32`), not
  a new dependency. The kits are ours, and the subset is small: stored or deflated, no zip64,
  encryption or multi-disk. Anything outside it is refused by name. Determinism comes by
  construction: members keep the previous archive's order and new ones are appended, the
  timestamp is fixed to the release date, and compression is set explicitly. Every real kit is a
  test input.
- **Code lives in `apps/server/src/authoring/`** so it can call `verifyRelease` directly, and runs
  through `tsx` (already a dev dependency) from two root scripts.
- **`content/source/` gets the release protections:** `-text` in `.gitattributes`, and ignore
  entries in `.prettierignore` and `eslint.config.js`. Kit code is deliberately faulty, and any
  line-ending conversion would change every hash (`core.autocrlf` is `true` on this machine).
- Package documents are carried as authored. A stale `START_HERE.md` shows up as `unchanged` in the
  change record. Rewriting it is the author's job.

## Slice log
