# Verification and known limits

Date: 2026-09-18. Status: authored owner-review candidate.

## Verified for the new lab

| Check | Actual result |
| --- | --- |
| Runtime used | Node.js v24.19.0 and curl 8.5.0 on Linux |
| Loopback HTTP protocol checks | 34 passed, 0 failed |
| Unchanged Lesson 12 starter | 4 passed, 10 intentionally failed |
| Worked Lesson 12 function | 14 passed, 0 failed |
| Wrong match-before-normal-checks implementation | Rejected by 4 of 14 cases |
| Wrong conditional-presence implementation | Rejected by 4 of 14 cases |
| curl workflow | 17 exchanges passed: saved validators, edits, weak/list/wildcard cases, HEAD, policies, and ordinary failure precedence |
| State commands | `show` was read only; baseline restored data and preserved observation files |
| Shutdown | Server stopped on SIGINT with exit code 0 |
| Distributed starting state | Baseline café data and incomplete practice function retained |

The protocol suite performs real local HTTP exchanges. It does not simulate browser-cache behavior. The curl rehearsal used a fresh capture path for each response because a body-free response must not be confused with old bytes in an output file. Structured results are included in the lab's `author-verification.json`.

## Package checks

`package-verification.json` records source/manifest hashes, archive integrity, lesson order and IDs, activity and feedback headings, and preservation of earlier material. The previous eight lesson files, three lab archives, and twenty-four activity records are compared with the supplied first-eight release. The six background specification documents are retained byte-for-byte.

These checks confirm this package's consistency. They do not independently validate every inherited lesson's educational effectiveness or re-run the older kits.

## Unverified work

- **Actual browser-cache rehearsal:** no browser binary was available in the author environment; the attempted download timed out. The expected sequences in Lessons 10 and 13 follow the documented browser cache modes, but must still be observed in an actual browser. A detailed procedure is in the lab's `Instructor_Notes.md`.
- **Native Windows and macOS execution:** instructions account for PowerShell's `curl.exe`, but these operating systems were not run here.
- **Integration into the existing course app:** the separate VS Code coder must perform import, UI, persistence, download, and rendering acceptance checks.
- **Independent learner outcomes:** no submission, score, competency, or learner browser run is asserted. The owner's positive content review reported so far covers Lessons 1–4.

Do not relabel expected browser behavior as a verified transcript. Do not substitute disabling caching for completing the cache experiment. If a browser differs, preserve the actual evidence and inspect the stated preconditions before revising the lesson.
