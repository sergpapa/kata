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
  are a shared lesson and are accepted.

### API

- **C5** Every course endpoint moves under `/api/courses/:courseId/`: `release`, `lessons/:id`,
  `resume-point` (GET and PUT), `labs/:labId/download`, and
  `activities/:activityId/responses/:fieldName`. Each answers exactly as its unscoped predecessor
  did, against that course's release. The unscoped addresses no longer exist and answer 404.
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
- **C13** In a course, the sidebar's Learn link leads to that course's dashboard, the sidebar note
  names the course and its release, and the breadcrumb reads `EduCode › <course title> › <page>`.
  On the course list, Learn leads to `/` and no course note is shown.
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
contract. Those tests are migrated mechanically: the URL gains `/api/courses/<id>`, and the app is
built from a course list. **No assertion, expected value or test name changes.** The test-guardian
PRE review checks the migration diff for exactly that.

## Scope fence — not in this slice

- Export, the grading kit, the MCP review server, and BookingLab.
- Actually shipping a lesson in both courses. C4 accepts shared lessons, but none exists yet.
- A course switcher, cross-course progress, and course-specific Practice/Reviews/Progress pages.
- `release:build` producing a course's *first* release. It needs a previous release, so this
  package is assembled by hand once and proven by the importer (C15). Later QA releases are seeded
  from it.

## Assumptions

- Course IDs appear in addresses as given (`/courses/QAAE`), uppercase.
- Course titles live in `config.ts`, because the release manifest has no course field.
- Lesson 1's ID scheme: lesson `LS-Q01-01`, document `QAAE-STUDENT-01`, activities
  `ACT-Q01-01-NN`, release `QAAE-LESSON-01`.

## Slice log
