# Verification and known limits

## Curriculum and teaching review

The existing 68-module architecture and all 27 graduate competency domains were reviewed for the route from foundations to later investigation and judgment. Module identities and graduate outcomes are retained. The new depth map details the next HTTP sequence and makes rate-limiting/security prerequisites explicit. This is a structural authoring review, not a completed validation of every future lesson dependency.

The teaching standard incorporates the owner's positive feedback on Lessons 1–4. Lesson 5 completion has not been assumed. Lessons 6–8 are new owner-review candidates; no effectiveness result has been invented for them. The deeper cache investigation remains a planned next reference experience.

## Local lab verification

Author rehearsal used **Linux, Node.js v24.19.0, and curl 8.5.0**. The eight-case contract was exercised across eight scenarios, for **64 test executions**:

| Scenario | Expected failed checks | Observed failed checks | Meaning |
| --- | ---: | ---: | --- |
| Lesson 7 unchanged starter | 4 | 4 | New hours behavior is absent |
| Lesson 8 original incident | 2 | 2 | Known hours path selects wrong content |
| Lesson 8 original transfer | 4 | 4 | Documented hours path is absent |
| Lesson 7 complete reference | 0 | 0 | All eight contract cases pass |
| Lesson 8 complete reference | 0 | 0 | Repair passes all eight cases |
| Transfer complete reference | 0 | 0 | Different repair passes all eight cases |
| Deliberately wrong weekend value | 2 | 2 | Content checks detect the mistake despite 200 |
| Incomplete fix returning hours for every known route | 1 | 1 | Menu regression is detected |

Expected failures verify that the exercise defects are observable. They are not release failures. The distributed starter and incident files retain those defects; the separate reference files contain the repairs.

Manual CLI rehearsal checked the main and incident entry points, curl GET/HEAD/POST responses, occupied-port and invalid-port handling, source edits not automatically changing an already-running process, Ctrl+C shutdown, and a subsequent connection failure. Tests exercised real loopback HTTP exchanges and HEAD body omission. Details are included in the lab's `author-verification.json`.

## Package checks

The packaging check verifies release IDs and order, source hashes, exact first-five compatibility, activity IDs and headings, lesson front matter, lab ZIP integrity, and the retained 68-module/206-competency structure. Its machine-readable outcome is included in `package-verification.json`.

Technical references were checked against the HTTP specifications and first-party language/runtime documentation while authoring. The lesson scenarios, code, contracts, and explanations are original course material. External references are linked at their point of use. The existing pedagogical research review is retained; this release does not claim a new research study.

## Remaining checks

- Native Windows and macOS execution have not been rehearsed for this kit.
- VS Code GUI actions and browser rendering have not been exercised here.
- Integration and state migration in the separate VS Code app remain the coder's task.
- Lessons 6–8 require owner review, especially the narrow JavaScript bridges and the usefulness of the investigation.
- The deeper caching sequence and advanced rate-limiting/security lessons are planned coverage, not completed instruction in this release.

Passing author checks does not independently verify a learner's execution, authorship, or competence. Preserve those distinctions in the app and in any progress claims.
