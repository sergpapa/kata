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
  front matter and first H1. The importer refuses a lesson ID, document ID or version that
  disagrees with the front matter. It reads the display title from the H1 itself.
- Each kit zip holds one top folder with no directory entries, deflated. It carries a byte-exact
  copy of every lesson it serves at that folder's root, and a `manifest.json` whose `files[]`
  hashes every member except itself. Two shapes exist: Lesson 2's kit uses
  `kit_id`/`kit_version` with `bytes` per file, and the other four use `lab_id`/`version`.
- **The importer checks none of the following.** Kit-internal manifests, nested lesson copies and
  activity `lesson_version` are not its concern. Only this tool enforces them.

## The source tree (the contract between seed, build and the author)

```text
<source>/
  release.json            the release's own metadata, edited by the author
  lessons/<file>.md       canonical lessons, one per entry in release.json "lessons"
  labs/<archive>/<inner>/ one per kit: archive name without .zip, then the kit's single top folder,
                          holding every member except the nested lesson copies
  trial-activities.json   the activity set, shipped byte for byte
  package/                authored package documents, shipped at the package root byte for byte
```

`release.json` fields:

- **`package_id`, `read_first`**: carried into `package-manifest.json`.
- **`previous_release`**: the package this one supersedes, as a path relative to the source
  directory. It is the comparison baseline for C6, C7 and C10.
- **`accepted_feedback`**: register entries this release accepts. Seeded empty.
- **`release`**: every top-level field of `learning-release.json` except `lessons`,
  `lab_downloads` and `activities`, in the same order. `release.version` and `release.date` are
  the release's version and date.
- **`lessons`**: lesson file names in course order. Position gives `order`.
- **`labs`**: `{ lab_id, archive, lesson_ids }` per kit, in `lab_downloads` order.

## Acceptance criteria

- [ ] **C1. Seed.** `seedSource(<package dir>, <source dir>)` writes the source tree above from a
      package whose `content/` the importer verifies. Lessons and `trial-activities.json` are
      copied byte for byte. Each kit is unpacked without its nested lesson copies, every other
      member byte for byte. `release.json` is filled from the package as listed above. Every
      authored package document (everything except `content/` and the generated
      `package-manifest.json`, `package-verification.json` and `release-changes.json`) is copied
      byte for byte under `package/`.
- [ ] **C2. Seeding refuses rather than loses.** The seed refuses, naming the file, when the
      release does not verify, when a kit's nested lesson copy differs from the canonical lesson
      (dropping it would lose bytes), or when the target directory already exists.
- [ ] **C3. Build.** `buildRelease(<source dir>, <output package dir>)` writes a package in the
      format above. The importer's own `verifyRelease` accepts its `content/`, and the package then
      exists under its final name. A refusal leaves no output directory behind, nor any staging
      directory beside it. An existing output directory is refused, never overwritten.
- [ ] **C4. Lesson entries are derived, never typed.** `lesson_id`, `document_id`, `version` and
      `module` come from front matter and `title` from the H1, so editing any of them in the lesson
      moves the manifest with it. `order` follows the position in `release.json` `lessons`,
      `lab_id` comes from the kit that lists the lesson, and `sha256` from the bytes.
- [ ] **C5. Kits carry the canonical lessons and honest manifests.** Every kit gets an exact copy
      of each lesson it serves at its folder root, injected at build. Its `manifest.json` `files[]`
      is rewritten so every member's entry carries its real `sha256` (and `bytes`, where the entry
      has that field). This covers authored members as well as lesson copies. Every other manifest
      field stays exactly as authored.
- [ ] **C6. Unchanged kits keep their bytes, changed kits are deterministic.** When a kit's
      assembled members match the previous release's members path for path and byte for byte, the
      previous zip is reused verbatim. A changed kit is repacked with the previous member order
      and every member dated at UTC midnight of `release.date`. The same source gives a
      byte-identical zip whenever it is built.
- [ ] **C7. Versions move with bytes.** A lesson whose bytes changed must carry a different
      front-matter `version` from the previous release. A kit whose members changed for any reason
      (a lesson copy or an authored file) must carry a different manifest version (`version` or
      `kit_version`). The release `version` must differ from the previous release's. Each
      violation is refused, naming the file or kit and the version that failed to move.
- [ ] **C8. Activities follow their lessons.** Every activity's `lesson_version` must equal its
      lesson's current version. Otherwise the build refuses, naming the activity ID and the
      expected version.
- [ ] **C9. Authored files ship byte for byte.** Lessons, `trial-activities.json` and every file
      under `package/` arrive in the output exactly as they are in the source. The tool never
      edits an authored file.
- [ ] **C10. The change record names the bytes.** `release-changes.json` is listed in
      `package-manifest.json`. For every lesson and kit it gives `status` (`changed` or
      `unchanged`) with previous and new version and `sha256`, and for the activity file its status
      and both hashes. It also gives the release ID, the version transition and
      `accepted_feedback`. `package-manifest.json` lists every file in the package except itself,
      with its real hash.
- [ ] **C11. Nothing to release is refused.** A build in which no lesson, kit or activity byte
      changed is refused.
- [ ] **C12. Honest verification record.** `package-verification.json` carries
      `importer_verification: "passed"`, `checks_run` (`importer_verification`,
      `nested_lesson_copies_match_canonical`, `all_hashes_recomputed`) and `not_run_by_this_tool`
      (`mermaid_parse_and_render`, `browser_rehearsal`, `kit_runtime_suites`). The two lists never
      share an item.
- [ ] **C13. Round trip on the real release.** Seed 1.0.1. Change one line of Lesson 5, bump its
      version, that version in its 3 activities, and the 03-05 kit's version. Then build 1.0.2. The
      result: the importer accepts it; 14 lesson entries and files are identical to 1.0.1; 4 kit
      zips are byte-identical; the 03-05 kit differs only in Lesson 5's copy and its manifest; the
      change record lists exactly Lesson 5, kit 03-05 and the activity file as changed.
- [ ] **C14. Command line.** `npm run release:seed -- <package dir> <source dir>` and
      `npm run release:build -- <source dir> <output package dir>` exit 0 on success. A build
      prints each changed lesson and kit with its version and hash transition, followed by the
      steps that would make the release current. A refusal prints the reason and exits 1. Wrong
      arguments print usage and exit 2.

## Scope fence — not in this slice

- **Adding or removing lessons or kits.** The build refuses all four cases, naming the lesson or
  kit. Their first consumer is Lesson 16, which gets its own slice.
- **Making a built release current** (flipping `config.ts`, `config.test.ts` and
  `content/RELEASES.md`). The build prints those steps. Doing them stays a deliberate act.
- **Content checks**: Mermaid, browser, and kit runtime suites. `tools/diagram-checks.mjs` and the
  screenshots gate already exist. This tool records that it did not run them.
- No change to the importer, to any existing release, or to the app.

## Assumptions (defaults taken, not asked)

- **Zip handling is our own code** on `node:zlib` (`deflateRawSync`, `inflateRawSync`, `crc32`), not
  a new dependency. The kits are ours, and the subset is small: stored or deflated members, and no
  zip64, encryption, multi-disk, directory entries, or absolute, backslash or `..` paths. Anything
  outside it is refused by name. The writer emits no extra fields and no archive comment. Every
  real kit is a test input, and an independent reader (Windows `tar.exe`, or `unzip` elsewhere)
  checks the writer.
- **Code lives in `apps/server/src/authoring/`** so it can call `verifyRelease` directly, and runs
  through `tsx` (already a dev dependency) from two root scripts.
- **The seed verifies `content/` with the importer.** It does not check `package-manifest.json`:
  the importer is the authority on what the app will accept.
- **`content/source/` gets the release protections:** `-text` in `.gitattributes`, and ignore
  entries in `.prettierignore` and `eslint.config.js`. Kit code is deliberately faulty, and any
  line-ending conversion would change every hash (`core.autocrlf` is `true` on this machine).
- Package documents are carried as authored. A stale `START_HERE.md` arrives unchanged in the
  output. Rewriting it is the author's job.
- **A refusal after staging cannot be forced by any test.** Every check that could fail at the
  final `verifyRelease` is made earlier by the tool itself. The staging directory is removed in a
  `finally`, and the test-guardian's request for a test of that path is declined for this reason.

## Slice log
