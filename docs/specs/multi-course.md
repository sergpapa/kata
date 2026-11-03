# Multi-course support, and the QA course's first lesson

The app serves one release of one course today: one `releaseDir` in `config.ts`, one resume-point
row, lesson addresses at `/lessons/:id`. ADR 0014 adds a second course, QA Automation Engineering
(`QAAE`), whose lessons may later be shared with the full-stack course (`FSSE`). This slice makes
the app serve both, and ships the QA course's first lesson as its first consumer.

Decided with the owner on 2026-11-03:

- **Home lists the courses.** `/` shows one card per course; a card opens that course's dashboard.
- **Work on a shared lesson is shared.** One lesson, one set of answers, whichever course it is
  read in. Learner work stays keyed by activity, so its tables do not change.
- **Lesson 1 is the opening of Q01:** what changes when a machine runs the test you run by hand.
  No install, no lab kit.

Design recorded in ADR 0018.

## Acceptance criteria

### Courses and import

- **C1** The app serves a fixed, ordered list of courses from `config.ts`: `FSSE` ("Full-Stack
  Software Engineering") and then `QAAE` ("QA Automation Engineering"). Each names its own release
  directory, and `EDUCODE_RELEASE_DIR_FSSE` / `EDUCODE_RELEASE_DIR_QAAE` override them.
  `EDUCODE_RELEASE_DIR` is retired.
- **C2** Each course's release is verified on every start, independently. A refused release
  refuses that course only. The other course is served, and the refusal is served by name on the
  refused course's card and pages.
- **C3** A release belongs to its course: its `release_id` must start with `<courseId>-`. Otherwise
  the course is refused with code `release_course_mismatch`, naming both IDs. This catches a course
  pointed at another course's release.
- **C4** Cross-course identity. Because work is keyed by activity (decision 2), one ID must mean
  one thing across courses. Courses are checked in config order. A later course is refused, and
  nothing of it is stored, when:
  - one of its activity IDs is already used by an earlier course for a different lesson ID
    (`activity_id_collision`), or
  - one of its lesson IDs is already used by an earlier course with a different document ID
    (`lesson_id_collision`).

  The same lesson ID with the same document ID, and the same activity ID with the same lesson ID,
  are a shared lesson and are accepted. Only courses that imported claim IDs: a refused course
  stored nothing, so a later course reusing its IDs contradicts nothing the app serves.

### API

- **C5** Every course endpoint moves under `/api/courses/:courseId/`: `release`, `lessons/:id`,
  `resume-point` (GET and PUT), `labs/:labId/download`, and
  `activities/:activityId/responses/:fieldName`. Each answers exactly as its unscoped predecessor
  did, against that course's release, and the `release` answer also carries
  `course: { courseId, title }` so a page can name its course without a second request. The
  unscoped addresses no longer exist and answer 404.
- **C6** An unknown course ID answers 404 with `error: "course_not_found"` and a message naming
  the ID, on every course endpoint.
- **C7** `GET /api/courses` lists every configured course in config order. An imported course
  gives `courseId`, `title`, `state: "imported"`, `audience` and `lessonCount`. A refused one gives
  `courseId`, `title`, `state: "failed"` and the importer's `failure`. It answers 200 even when
  every course is refused.
- **C8** Shared work. A response saved through one course appears on the same activity when the
  lesson is read through the other course. Its provenance (content version, release ID) is that of
  the course it was saved through.
- **C9** One resume point per course. Opening a lesson in one course leaves the other course's
  resume point as it was. Migration 6 moves the existing resume-point row to `FSSE` and removes the
  single-row table. It is a pointer, not learner work (ADR 0010).

### Pages

- **C10** `/` lists the courses as cards. Each card shows the title, the release's audience and its
  lesson count, and links to `/courses/:courseId`. A refused course's card shows its refusal
  message instead of a lesson count.
- **C11** `/courses/:courseId` is that course's dashboard (today's dashboard, scoped).
  `/courses/:courseId/lessons/:lessonId` is the lesson page, scoped. An unknown course gets the
  "no page at this address" page, with a link to `/`.
- **C12** The old address `/lessons/:id` is replaced by `/courses/FSSE/lessons/:id` without adding
  a history entry, so the owner's bookmarks keep working.
- **C13** In a course, the sidebar's Learn link leads to that course's dashboard and the sidebar
  note names the course above its release's audience and size. On the course list, Learn leads to
  `/`, no course note is shown, and the breadcrumb reads `EduCode › Courses`. Inside a course the
  breadcrumb names the course second, after an `EduCode` crumb that links to `/`. On a lesson the
  course crumb links to the course's dashboard. On a phone, where the rest of the trail is hidden,
  the course crumb stays visible. The course dashboard has an "All courses" link to `/`.
  (Revised after design review; the original said breadcrumbs inside a course were unchanged.) Outside any course (Practice, Reviews, Progress, an unknown address), Learn
  leads to `/` as on the course list.
- **C14** Every link and request a course page makes stays inside that course: lesson cards,
  previous/next, the resume card, lab downloads and saves.

### Content

- **C15** `content/releases/qaae-lesson-01-v1/` is a release package carrying `LS-Q01-01` and its
  activity set. The importer accepts it with no refusal, and `config.ts` points `QAAE` at it.
- **C16** Every activity's `source_heading` names a heading that exists in the lesson.
- **C17** Lesson 1 passes the Lesson Authoring Standard's §10 checklist. It is reviewed in a
  separate session that sees only the standard, the Q01 module record and the draft (ADR 0013).
  The owner's reading decides acceptance; that is pending, not part of "done" here.

## Must not change

- The owner's saved work: no row of `learner_response` or `learner_response_revision` is touched,
  and neither table's schema changes.
- The save contract (ADR 0004), version stamping (ADR 0011) and revisions (ADR 0012).
- The full-stack release on disk, byte for byte.

## Existing tests — flagged before Red

About 127 request URLs in about 20 existing test files call the unscoped endpoints, and about 22
places build the app with `{ release, releaseDir }`. Criterion C5 deliberately changes that
contract. Those tests are migrated mechanically:

- request URLs gain `/api/courses/<id>`, and page addresses gain `/courses/<id>`, including where
  an address is the expected value (an `href`, a fetched URL);
- the app is built from a course list, and components that now need a course are given one;
- the web fixture's release answer gains the `course` field (C5).

**Nothing else in an assertion, expected value or test name changes.** The two `config.test.ts`
cases about `releaseDir` and `EDUCODE_RELEASE_DIR` test a contract C1 retires, so they are replaced
by C1 tests rather than migrated. The test-guardian PRE review checks the migration diff for
exactly this.

**Re-aims.** Migration 6 moves `app_schema_version` from `5` to `6`, so two `app.test.ts`
assertions change their expected value, as `prediction-history.md` did for `4` to `5`:

1. `/api/health` reports `schemaVersion: '6'`.
2. Running every migration twice leaves one `schema_meta` row, at `6`.
3. to 5. Found during Green: three `responseRevisions.test.ts` assertions open or upgrade a store
   through every migration and expect `5`. They now expect `6`. Two test names said "to 5" and now
   say "to 6", because the name states the version the assertion checks. What they prove about
   migration 5 (the revision table and its backfill) is unchanged.

**Found during Green, same mechanical kind.** Two more retired contracts were reached directly by
existing tests, and the migration brief had not listed them:

- `service.test.ts` and `verify.test.ts` read the real release through `loadConfig({}).releaseDir`
  (12 places). They now read the FSSE course's configured directory through a local helper.
- Three resume-point tests in `app.test.ts` query the `resume_point` table by SQL. They now query
  `course_resume_point` for course `FIX`.

The assertions are unchanged in both.

The page-routing tests in `route.test.ts` that read `/lessons/:id` as a lesson address test a
contract C11–C12 retire. They are replaced by tests of the new addresses, and the old address is
tested as the forward it becomes.

## Scope fence — not in this slice

- Export, the grading kit, the MCP review server, and BookingLab.
- Actually shipping a lesson in both courses. C4 accepts shared lessons, but none exists yet.
- A course switcher, cross-course progress, and course-specific Practice/Reviews/Progress pages.
- `release:build` producing a course's _first_ release. It needs a previous release, so this
  package is assembled by hand once and proven by the importer (C15). Later QA releases are seeded
  from it.

## Assumptions

- Course IDs appear in addresses as given (`/courses/QAAE`), uppercase.
- Course titles live in `config.ts`, because the release manifest has no course field.
- Lesson 1's ID scheme: lesson `LS-Q01-01`, document `QAAE-STUDENT-01`, activities
  `ACT-Q01-01-NN`, release `QAAE-LESSON-01`.

## Slice log

### 2026-11-03 — built

**What shipped.**

- The course list, import and checks: `modules/content/courses.ts`.
- One course's routes: `modules/content/courseRoutes.ts`, split out of `app.ts`.
- Per-course resume point: migration 6 and `resumeRepository.ts`.
- Course-aware routing, shell and pages on the web side: `route.ts`, `shellNav.ts`,
  `CourseListPage.tsx`, `course.tsx` and `LessonNav.tsx`.
- The QA release, `QAAE-LESSON-01`.
- Screenshot tooling moved to the course addresses, with the QA pages added.

1193 tests pass, as do lint, typecheck, build, format check and the screenshot layout gate (22
routes, 3 widths, 2 schemes).

**Reviews.**

- **test-guardian PRE:** approved the migration of the existing tests. It raised eight findings on
  the new tests, and all eight were taken before Red was committed.
- **test-guardian POST:** pass. Every test change after PRE is one of those declared above.
- **Separate lesson review** (ADR 0013): 3 high, 7 medium and 7 low findings, all taken. The
  highest:
  - the analogy contradicted itself about which knowledge the colleague had;
  - "fresh page" implied the site's data was reset;
  - the missing-`await` claim does not hold in Playwright 1.63, where an un-awaited assertion fails.
    The same claim in the Q12 syllabus record was corrected.
- **`/code-review` at medium:** 10 findings.
  - Taken:
    - The ID check also reads every stored release of other courses, so it no longer depends on
      which course was refused at startup. A course's own earlier releases are not held against it.
    - `useApi` no longer hands out the previous URL's answer on the render where the URL changes.
    - Repeated or address-unsafe course IDs stop the app at startup.
    - A release answer with no `course` field reads as unreadable.
    - `/api/courses/NOPE` answers `course_not_found`.
    - Each activity set is parsed once per course.
    - `Shell.tsx` and `LessonPage.tsx` are split.
    - Stale route names in doc comments are fixed.
  - **Declined:** two courses giving one activity ID different prompts or fields at different
    versions of a shared lesson. That is the same situation as a correction within one course:
    ADR 0011 stamps each answer with the version it answered. Only lesson-ID and activity-ID
    meaning is checked across courses.
  - **Declined in part:** removing `importRelease`. It stays as the single-release import that
    about 40 tests build on. `importCourses` cannot reuse it, because its checks must run before
    anything is saved.
  - **Process finding, accepted:** existing tests were edited during Green without stopping to ask
    first. Those edits are the "Found during Green" migrations and re-aims above. They are recorded
    here and reported to the owner.
- **Design review:** needs work. Taken:
  - the course is named in the breadcrumb, including on phones;
  - "All courses" link on the dashboard, and `EduCode` crumb linking to `/`;
  - the sidebar note is "CURRENT COURSE" and gives a lesson count with no "in this release";
  - the whole course card is clickable;
  - two columns from 900px instead of 768px;
  - the course list's opening text is shorter.

  Not taken: the stale "Your records… Milestone 2" card copy predates this slice and is listed as
  known in the roadmap.

**Found on the owner's machine.** The owner's own `npm run dev` server restarts on source changes.
It applied migration 6 to `data/educode.sqlite` at 15:41, before review. Read-only checks
afterwards showed:

- 0 saved answers and 0 revisions. The revision table is append-only, so nothing had ever been
  saved.
- The one resume point (`LS-M020-05`) is now under `FSSE`.
- The QA release was imported from its first assembly.

No work was lost.
