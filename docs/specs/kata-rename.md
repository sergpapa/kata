# Finish the rename from EduCode to Kata

**Status:** criteria agreed with the owner 2026-11-20. Follows `kata-brand.md`, whose B6 kept the
internal names on purpose. The repository is now `sergpapa/kata` and the clone's folder is `kata`.

## What changes

Every name that still says EduCode becomes Kata: the database file, the environment variables, the
workspace packages, the storage key, the export file name and heading, temp-directory prefixes, the
README and the brief.

## Acceptance criteria

- [x] **R1. Database file.** The store is `data/kata.sqlite`. On start, if `kata.sqlite` does not
      exist and `educode.sqlite` does, the server renames `educode.sqlite` (and a leftover
      `educode.sqlite-journal`) to the Kata name before opening it, so no saved answer is lost. If
      both exist, neither is touched, `kata.sqlite` is used, and the console says the old file was
      left alone. If neither exists, nothing is renamed and a fresh store is created as before.
- [x] **R2. Environment variables.** `KATA_PORT`, `KATA_DATA_DIR`, `KATA_RELEASE_DIR_FSSE`,
      `KATA_RELEASE_DIR_QAAE` and `KATA_CLAUDE_PATH` replace their `EDUCODE_*` names. The old names
      are no longer read (owner's choice: no fallback). The tools' `EDUCODE_SCREENSHOT_PORT` and
      `EDUCODE_ACCEPTANCE_PORT` become `KATA_SCREENSHOT_PORT` and `KATA_ACCEPTANCE_PORT`.
- [x] **R3. Export format.** New exports are named `Kata_<course>_Lessons_<from>-<to>_<date>.md`
      and start `# Kata export: <course title>`. Files already exported keep their old name. The name is
      fixed in `export.md` EX1 (ADR 0020 does not name the file), which gets an amendment note.
- [x] **R4. Internal names.** The workspace packages are `kata`, `@kata/server` and `@kata/web`. The
      browser storage key is `kata.feedbackModel`; a model chosen under the old key is forgotten
      once and the default applies.
- [x] **R5. Docs.** README and brief say Kata, and the README explains the R1 move. Historical records (roadmap history, earlier specs,
      ADRs) keep the name they were written under.

## Out of scope

Release content under `content/releases/` (verified, hashed packages), and the Q02 draft
README's `~/.cache/educode-m002`, which records a real folder on the owner's WSL install.

## Slice record — 2026-11-20

**Built.** `renameLegacyDatabase` (`apps/server/src/modules/lifecycle/legacyDatabase.ts`) runs in
`index.ts` before the store opens. `EDUCODE_*` became `KATA_*` in the server, Vite config, both
tools and the README; packages are `kata`, `@kata/server`, `@kata/web`; exports are `Kata_…md` with
`# Kata export`; the storage key is `kata.feedbackModel`. `npm install` relinked `node_modules/@kata`.

**Criteria.** R1: `legacyDatabase.test.ts` (5 tests) failed first on the missing module, then
passed. Booting the built server on a copy of the owner's store printed "Moved your saved work from
educode.sqlite to …\kata.sqlite", answered `/api/courses` with 200, and the moved file holds the
same 83 rows in 12 tables. R2: two new `config.test.ts` cases (kata.sqlite inside `KATA_DATA_DIR`;
old names ignored) failed first. R3, R4: the export and storage-key assertions failed on the old
names first. Typecheck, lint and `format:check` pass. Full suite: 1574 of 1575 pass; the one failure
is `lessonRegionNames.test.tsx` not finding the Practice B feedback region within `findByRole`'s
1000ms during the parallel run. Alone it passed 10 of 10 on clean `HEAD` and 10 of 10 with this
change at normal load (3.0s a run); an earlier batch at 90% CPU failed 7 of 10 on timeouts.

**Not run.** `npm run screenshots` and `npm run acceptance`; their only change is the variable and
file names. test-guardian and design review were skipped: a rename with no new UI.
