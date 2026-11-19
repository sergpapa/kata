# Release additions: a build that adds lessons and kits

Status: in progress, 2026-11-19.

## Why

`npm run release:build` rebuilds a release after a correction. It refuses a build that adds or
removes a lesson or a kit (`docs/specs/release-packaging.md`, scope fence), and the rest of the
build assumes every lesson and kit has a counterpart in the previous release. So no lesson written
in this repository can reach the app. Q01's remaining lessons (ADR 0023) are the first that need
to: four lessons, three kits and 21 activities, plus a three-sentence correction to QA Lesson 1.
QA Lesson 1 itself was assembled by a throwaway script, because a course's first release has no
previous release to build from.

The owner chose on 2026-11-19 that this slice extends the tool, builds the Q01 release with it, and
makes that release current for the QA course.

## Acceptance criteria

Criteria A1 to A8 are the tool. A9 to A11 are the first consumer.

- [ ] **A1. A lesson can be added.** A lesson in `release.json` `lessons` whose `lesson_id` the
      previous release does not have is built like any other lesson (C4 still derives its entry). It
      may sit at any position. Lessons that move to a new position keep their `status` from their
      bytes alone.
- [ ] **A2. A kit can be added.** A kit in `release.json` `labs` whose `lab_id` the previous release
      does not have is packed from its source folder: the authored members, the injected canonical
      copy of each lesson it serves (new or existing), and an honest `manifest.json` in either
      manifest shape (C5). Its members are ordered by path, compared byte by byte, and every member
      is dated at UTC midnight of `release.date` (C6). The same source gives a byte-identical zip
      whenever it is built, whatever the clock or the source files' modification times say. An
      existing kit that starts serving an added lesson is a changed kit: C7 applies to it unchanged.
- [ ] **A3. Additions are named in the change record.** In `release-changes.json`, an added lesson or
      kit has `status: "added"`, its version and `sha256`, and `previous_version` and
      `previous_sha256` set to `null`. Unchanged and changed entries are as before (C10).
- [ ] **A4. Versions are checked only where there is a previous version.** An added lesson or kit
      has no version to move from, so C7 does not apply to it. Every other C7 rule still applies.
- [ ] **A5. An addition is something to release.** A build whose only difference from the previous
      release is an added lesson or kit is not refused by C11.
- [ ] **A6. Removal is still refused.** A build that leaves out a lesson or a kit the previous
      release has is refused, naming it, and leaves nothing behind, including when another lesson
      or kit is added in its place.
- [ ] **A7. Generated folders never ship.** A kit folder is refused, naming the kit and the
      directory, when it holds at any depth either a `node_modules` directory or a directory its own
      `.gitignore` names. A `.gitignore` line names a directory when, after blank lines and `#`
      comments are skipped, it is a plain name with or without a trailing `/` (`results/` or
      `results`). Lines with glob characters or inner slashes are not interpreted. Without this,
      kits with npm dependencies pack `node_modules` whenever an author has run them in place.
- [ ] **A8. The command line names additions.** The build summary prints each added lesson and kit
      with its version and hash, marked as added, beside the changed ones.
- [ ] **A12. A malformed addition is refused by name.** Each of these is refused, naming the file
      or kit, and leaves nothing behind: a listed lesson file that is missing; two lessons with one
      `candidate_lesson_id`; an added kit whose source folder is missing; a kit manifest whose
      `lab_id` (or `kit_id`) differs from `release.json`; a kit whose `lesson_ids` names a lesson
      the release does not list; a kit manifest with no version; two kits sharing a `lab_id` or an
      `archive`.
- [ ] **A9. The Q01 release builds.** `content/source/qaae/`, seeded from `qaae-lesson-01-v1` and
      given the Q01 lessons, kits and activities, builds into `content/releases/qaae-q01-v1/`. The
      importer accepts it. Its change record lists Lesson 1 as changed (1.0.0-draft to 1.0.1-draft),
      four lessons and three kits as added, and the activity file as changed. No kit member path
      contains `node_modules/`, and the release in the repository is byte for byte what the source
      builds.
- [ ] **A10. It is the QA course's current release.** The QA course imports `qaae-q01-v1` beside the
      full-stack release, with neither refused. It carries five lessons in course order (`LS-Q01-01`,
      `LS-M001-01`, `LS-M001-02`, `LS-Q01-02`, `LS-Q01-03`), three kits, and every activity names a
      heading that appears exactly once in its lesson. Each new lesson is served through the QA course.
- [ ] **A11. The new lessons render in the app.** The screenshot gate opens each new lesson at its
      three widths and two schemes. Every lesson with a diagram draws it, and every lesson with a kit
      offers it.

## Scope fence

- **Removing a lesson or kit.** Still refused (A6). Nothing needs it yet.
- **A course's first release.** It still has no previous release to build from.
- **Splitting the two longest Q01 lessons.** That is the owner's call after reading. With this tool,
  a split is an ordinary reissue.
- **The full-stack course's own copy of the M001 lessons.** They ship in the QA release only (ADR
  0023).
- No change to the importer, to any existing release, or to the data model.

## Assumptions (defaults taken, not asked)

- **The release is renamed `QAAE-Q01`**, package `QAAE-Q01`, version `1.1.0-draft`. A release
  named `LESSON-01` holding five lessons would mislead. The full-stack course renamed its release
  each time it grew (FIRST-FIVE, FIRST-EIGHT, FIRST-THIRTEEN, FIRST-FIFTEEN). The importer only
  needs the `QAAE-` prefix, and learner answers keep the release ID they were given. The version
  continues the course's chain, so the tool's rule against reusing a version still means something.
- **Each course's editable source has its own folder**, `content/source/qaae/`, because two courses
  cannot share one `content/source/`. The authoring handbook's commands are updated to match.
- **`content/drafts/qaae-q01/` moves into the source and is removed**, together with the three
  ignore lines added for it. Its packaging brief, review record and verification record become the
  package documents `START_HERE.md`, `CHANGELOG.md` and `Verification_and_Known_Limits.md`.
- **Lesson 1's correction** is the three sentences listed in the drafts' packaging brief, and moves
  Lesson 1 and its three activities to `1.0.1-draft`.

## Slice log

- 2026-11-19: criteria written. Stage 1 (architecture) skipped: the tool's structure and the data
  model do not change. Design review skipped: no interface changes. The only user-facing change is
  content, which A11's screenshot gate covers.
