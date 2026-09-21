# HTTP Lessons 1–15: content correction release 1.0.1-draft

This is the current cumulative fifteen-lesson release, reissued to accept CF-001 and CF-002. Lesson 2's sequence-diagram message now uses a comma; Lesson 7's prerequisite now says “Lesson 6.” Both lessons and their containing lab kits have patch versions and updated hashes. The other thirteen lessons and three lab archives are unchanged from release 1.0.0-draft.

Read `CONTENT_CORRECTIONS_1_0_1.md` first for the exact changes, import instructions, and verification limits. Give the coder this whole release directory rather than copying an edited lesson into a directory with the old manifest. Stable lesson/activity IDs remain unchanged; existing learner work must be preserved.

The latest investigation lessons remain included:

| Course order | Stable ID | New lesson |
| --- | --- | --- |
| 14 | LS-M021-06 | The notice changed. Why are returning visitors still seeing the old one? |
| 15 | LS-M021-07 | Repair the cause—and make the evidence survive your fix |

Lesson 14 uses a reported stale-notice incident to develop hypotheses, controlled comparisons, source tracing, and a supported diagnosis. Lesson 15 turns the failure into a regression, repairs it, checks alternatives, and adds a supported transfer problem with a different cause. Familiar mechanisms now interact in an unfamiliar service; explanations and full help remain available.

## Give this to the coder

Ask your VS Code coder to read `CONTENT_CORRECTIONS_1_0_1.md` and `VS_Code_Coder_Handoff_Lessons_14_15_v1.md`, then import `content/learning-release.json` into the existing app. Keep the Engineering Practice visual UI and existing learner records. This package supplies content and local exercises; it is not a replacement app or a deployment request.

The release contains 15 lessons, 45 optional activity records, and five lab downloads. The new kit deliberately ships with faulty code. The coder must not “clean up” those faults in the downloadable starter; separate reference repairs are supplied for learning.

## Study directly

Read Lessons 14–15 in `content/lessons/`. Extract `content/labs/HTTP_Lessons_14_15_Investigation_Kit_v1.zip` into a new folder, open it in VS Code, and follow its README. The kit includes both new lesson files, the incident packet, tests, a regression worksheet, complete repairs, and optional investigation notes.

Lessons 9–13 teach the prerequisites. If those are unfamiliar, use the specific repair destinations at the beginning of Lesson 14. There is no requirement to guess an untaught header grammar or conceal that you used help.

## Checks and limits

The preceding 1.0.0-draft release reproduced the intentional failures, checked all 30 incident/transfer cases after repair, checked the learner regression before/after repair, and rehearsed 20 curl exchanges. That lab archive is unchanged. The current patch checks lesson changes, nested copies, versions, hashes, and archive integrity; it does not claim a new runtime rehearsal. See `package-verification.json` and `Verification_and_Known_Limits.md`.

Actual browser-cache rehearsal, native Windows/macOS execution, and integration into the separate app remain unverified. The browser binary is unavailable in the author environment. Detailed acceptance instructions and actual CLI captures are supplied without claiming that they verify a learner or browser run.

Next planned content is M021-08 review/revision and M021-09 fresh independent transfer. The short transfer task in Lesson 15 is supported practice, not completion of that later assessment. See `specifications/Release_Status_and_Sequence.md` for the sequence clarification.
