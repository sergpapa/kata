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

- [x] **C1. Seed.** `seedSource(<package dir>, <source dir>)` writes the source tree above from a
      package whose `content/` the importer verifies. Lessons and `trial-activities.json` are
      copied byte for byte. Each kit is unpacked without its nested lesson copies, every other
      member byte for byte. `release.json` is filled from the package as listed above. Every
      authored package document (everything except `content/` and the generated
      `package-manifest.json`, `package-verification.json` and `release-changes.json`) is copied
      byte for byte under `package/`.
- [x] **C2. Seeding refuses rather than loses.** The seed refuses, naming the file, when the
      release does not verify, when a kit's nested lesson copy differs from the canonical lesson
      (dropping it would lose bytes), or when the target directory already exists.
- [x] **C3. Build.** `buildRelease(<source dir>, <output package dir>)` writes a package in the
      format above. The importer's own `verifyRelease` accepts its `content/`, and the package then
      exists under its final name. A refusal leaves no output directory behind, nor any staging
      directory beside it. An existing output directory is refused, never overwritten.
- [x] **C4. Lesson entries are derived, never typed.** `lesson_id`, `document_id`, `version` and
      `module` come from front matter and `title` from the H1, so editing any of them in the lesson
      moves the manifest with it. `order` follows the position in `release.json` `lessons`,
      `lab_id` comes from the kit that lists the lesson, and `sha256` from the bytes.
- [x] **C5. Kits carry the canonical lessons and honest manifests.** Every kit gets an exact copy
      of each lesson it serves at its folder root, injected at build. Its `manifest.json` `files[]`
      is rewritten so every member's entry carries its real `sha256` (and `bytes`, where the entry
      has that field). This covers authored members as well as lesson copies. Every other manifest
      field stays exactly as authored.
- [x] **C6. Unchanged kits keep their bytes, changed kits are deterministic.** When a kit's
      assembled members match the previous release's members path for path and byte for byte, the
      previous zip is reused verbatim. A changed kit is repacked with the previous member order
      and every member dated at UTC midnight of `release.date`. The same source gives a
      byte-identical zip whenever it is built.
- [x] **C7. Versions move with bytes.** A lesson whose bytes changed must carry a different
      front-matter `version` from the previous release. A kit whose members changed for any reason
      (a lesson copy or an authored file) must carry a different manifest version (`version` or
      `kit_version`). The release `version` must differ from the previous release's. Each
      violation is refused, naming the file or kit and the version that failed to move.
- [x] **C8. Activities follow their lessons.** Every activity's `lesson_version` must equal its
      lesson's current version. Otherwise the build refuses, naming the activity ID and the
      expected version.
- [x] **C9. Authored files ship byte for byte.** Lessons, `trial-activities.json` and every file
      under `package/` arrive in the output exactly as they are in the source. The tool never
      edits an authored file.
- [x] **C10. The change record names the bytes.** `release-changes.json` is listed in
      `package-manifest.json`. For every lesson and kit it gives `status` (`changed` or
      `unchanged`) with previous and new version and `sha256`, and for the activity file its status
      and both hashes. It also gives the release ID, the version transition and
      `accepted_feedback`. `package-manifest.json` lists every file in the package except itself,
      with its real hash.
- [x] **C11. Nothing to release is refused.** A build in which no lesson, kit or activity byte
      changed is refused.
- [x] **C12. Honest verification record.** `package-verification.json` carries
      `importer_verification: "passed"`, `checks_run` (`importer_verification`,
      `nested_lesson_copies_match_canonical`, `all_hashes_recomputed`) and `not_run_by_this_tool`
      (`mermaid_parse_and_render`, `browser_rehearsal`, `kit_runtime_suites`). The two lists never
      share an item.
- [x] **C13. Round trip on the real release.** Seed 1.0.1. Change one line of Lesson 5, bump its
      version, that version in its 3 activities, and the 03-05 kit's version. Then build 1.0.2. The
      result: the importer accepts it; 14 lesson entries and files are identical to 1.0.1; 4 kit
      zips are byte-identical; the 03-05 kit differs only in Lesson 5's copy and its manifest; the
      change record lists exactly Lesson 5, kit 03-05 and the activity file as changed.
- [x] **C14. Command line.** `npm run release:seed -- <package dir> <source dir>` and
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

### 2026-11-03 — built, reviewed and corrected

Red commits `0e6ece8` (38 tests) and `3bb2ec6` (61 tests, after the guardian's PRE review), green
commit `3d184c1`, then a test-cost and correction commit. Final: **72 authoring tests, 1124 in the
whole suite**, with `npm run lint`, `npm run typecheck`, `npm run format:check` and `npm run build`
all passing under Node 24.12 (nvm). Under Anaconda's Node 22.13 the suite fails 156 tests because
`better-sqlite3` is built for Node 24, so that run is not evidence either way.

**test-guardian PRE — failed once, then passed.** The first suite let a wrong build through on
four counts: no test showed lesson entries were derived (C4), a stale hash for an authored kit
member passed, any clock gave the same "deterministic" zip, and authored files were never compared
with the source. It also found the `release.json` shape was a hidden contract. The spec gained the
source-tree contract and C14 (the command line). Item 11, a refusal after staging, is declined
with its reason in Assumptions. Its four PASS-time nits were left as pinned: two loose refusal
patterns that each fixture trips by one rule only, the independent-reader dependency on
`tar.exe`/`unzip`, and `zlib.crc32` needing Node 22.2 or later.

**test-guardian POST — skipped.** `git diff 3bb2ec6 3d184c1` over the approved tests is empty. The
later test-cost commit changes setup only: one shared build in `build.test.ts` and a seeded
template in the fixture. No `expect` line moved, which the diff shows.

**`/code-review` at medium — ten findings, seven taken, three declined.**

- **Taken:** a renamed kit folder duplicated or garbled members; the CLI never told the author to
  advance `previous_release`, so the next build would compare against a stale baseline and its
  version check could pass wrongly; malformed `release.json`, kit manifests and activity files
  crashed with a stack trace instead of refusing (now one `Refusal` type and `readJsonFile`/
  `parseJson` in `sourceTree.ts`); the is-main guard could silently do nothing on Windows (now a
  separate `main.ts`); a kit manifest listing itself is refused; doc comments were added. Each
  behaviour fix has a test in `build.review.test.ts`.
- **Declined:** "versions only checked for difference, not forward movement", because the spec asks
  for a different version and versions are author labels the importer imposes no order on;
  "repacks lose Unix file modes", because every member of all five real kits is `-rw-r--r--` and
  kits run through `node`; "an activity naming an unknown lesson is not checked", because the
  importer refuses it (`activity_lesson_mismatch`) and the build surfaces that as a refusal.

**Found while profiling, not by any review.** `writeZip` crashed on a date before 1980 and silently
wrote garbage for an invalid one. DOS timestamps hold 1980–2107 only. Both the writer and the build
now refuse such a date by name.

**The suite got heavier, and that was a real defect, not flakiness.** With the authoring tests in
the shared server project, two of nine full runs timed out a jsdom test in the web project
(`CopyBlock.test.tsx`, `realActivityPlacement.test.tsx`): always `Test timed out in 5000ms`,
never a wrong value, which `vitest.config.ts` already documents as harness saturation. Measured:
25s for the suite without the authoring tests, 32–34s with them. One authoring test copies a seeded
release of about 200 files (130ms on this disk) and most build one (60–400ms), and six such files
ran in parallel. A shared build and a seeded template did not reduce the load. The fix is a third
vitest project, `authoring`, with `fileParallelism: false`: **10 of 10 full runs clean** afterwards.
The cost is wall time: 44–51s instead of about 33s. Allowing two authoring files at once is the next
thing to try if that matters. The timeout was not raised.

**Verified end to end** with the real scripts on the real release. `npm run release:seed` seeded
1.0.1. An untouched build was refused (exit 1) and wrong arguments printed usage (exit 2). After
the Lesson 5 correction, `npm run release:build` produced 1.0.2-draft naming exactly LS-M020-05,
FSSE-HTTP-LAB-03-05 and the activity file. The app, started on that release (port 8320,
throwaway data dir), imported it, served Lesson 5 at 1.0.1-draft with the new sentence, and served
the rebuilt kit under its own filename with the expected hash. Windows `tar.exe` extracted the kit,
its nested Lesson 5 equalled the canonical lesson, and all 12 kit-manifest hashes matched.
Malformed and missing `release.json` were refused with exit 1. The throwaway tree under `data/`
was deleted afterwards (ESLint does not ignore `data/`, and the kit code in it is faulty on purpose).

**One unexplained run.** The first full run under Node 24 failed 6 tests, one per file, across
server files this slice cannot reach, and one file failed to load. It followed directly after the
crashed Node 22 run. Its signature was not captured, and the next 10 runs were clean. Like the
unexplained run in slice 11, it is not reproduced and not explained.

**Noticed, not fixed.** A built release carries `release.status` exactly as authored, so 1.0.2's
status still says "CF-001 and CF-002 corrected". Rewriting it per release is the author's job, and
the build does not flag a stale status. `build.test.ts` is 385 lines, over the ~350 guidance.
