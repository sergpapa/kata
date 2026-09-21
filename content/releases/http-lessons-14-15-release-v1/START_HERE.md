# HTTP investigation: Lessons 14–15

This package adds two complete student Markdown lessons and a new local investigation kit. It also includes Lessons 1–13 and their four lab archives unchanged, so the coder has one consistent fifteen-lesson release.

| Course order | Stable ID | New lesson |
| --- | --- | --- |
| 14 | LS-M021-06 | The notice changed. Why are returning visitors still seeing the old one? |
| 15 | LS-M021-07 | Repair the cause—and make the evidence survive your fix |

Lesson 14 uses a reported stale-notice incident to develop hypotheses, controlled comparisons, source tracing, and a supported diagnosis. Lesson 15 turns the failure into a regression, repairs it, checks alternatives, and adds a supported transfer problem with a different cause. Familiar mechanisms now interact in an unfamiliar service; explanations and full help remain available.

## Give this to the coder

Ask your VS Code coder to read `VS_Code_Coder_Handoff_Lessons_14_15_v1.md`, then import `content/learning-release.json` into the existing app. Keep the Engineering Practice visual UI and existing learner records. This package supplies content and local exercises; it is not a replacement app or a deployment request.

The release contains 15 lessons, 45 optional activity records, and five lab downloads. The new kit deliberately ships with faulty code. The coder must not “clean up” those faults in the downloadable starter; separate reference repairs are supplied for learning.

## Study directly

Read Lessons 14–15 in `content/lessons/`. Extract `content/labs/HTTP_Lessons_14_15_Investigation_Kit_v1.zip` into a new folder, open it in VS Code, and follow its README. The kit includes both new lesson files, the incident packet, tests, a regression worksheet, complete repairs, and optional investigation notes.

Lessons 9–13 teach the prerequisites. If those are unfamiliar, use the specific repair destinations at the beginning of Lesson 14. There is no requirement to guess an untaught header grammar or conceal that you used help.

## Checks and limits

The intentional failures were reproduced. Worked repairs pass all 30 incident/transfer checks. A completed regression fails before repair and passes after it. A 20-exchange curl rehearsal checked both original and repaired service behavior. Fresh-extraction verification is recorded in `package-verification.json`.

Actual browser-cache rehearsal, native Windows/macOS execution, and integration into the separate app remain unverified. The browser binary is unavailable in the author environment. Detailed acceptance instructions and actual CLI captures are supplied without claiming that they verify a learner or browser run.

Next planned content is M021-08 review/revision and M021-09 fresh independent transfer. The short transfer task in Lesson 15 is supported practice, not completion of that later assessment. See `specifications/Release_Status_and_Sequence.md` for the sequence clarification.
