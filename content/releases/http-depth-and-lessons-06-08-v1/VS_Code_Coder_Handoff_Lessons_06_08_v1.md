# VS Code coder handoff: HTTP Lessons 6–8

## Task

Integrate this content release into the existing application. Keep the established Engineering Practice navigation, dashboard, visual system, lesson reader, and learner records. Use the existing UI design export where needed. The new content belongs inside that experience.

Read `START_HERE.md`, the revised curriculum/depth documents, and the authoring standard. The existing Application Requirements and Technical Architecture from the first-five handoff still govern product behavior. This handoff changes lesson content, metadata, and lab availability; it does not authorize a new generic lesson-index UI.

## Authority and precedence

| Concern | Current authority |
| --- | --- |
| Graduate outcomes / existing scales | `Graduate_Competency_Standard_v1.md`, internal version 1.1, unchanged |
| Module architecture | `Curriculum_Architecture_v1_1.md`, version 1.1, replacing the 1.0 copy for future work |
| Teaching rules | `Lesson_Authoring_Standard_v1.md`, version 1.0.0 |
| Detailed first HTTP sequence and depth | `Curriculum_Depth_and_Progression_Map_v1.md` |
| Research rationale / old exercise migration | `Learning_Design_Review_and_Curriculum_Refinement_v1_1.md` |
| Student prose, diagrams, examples, and answers | The Markdown paths and hashes in `content/learning-release.json` |
| UI design and product workflows | Existing app/technical specifications and Engineering Practice UI design handoff |

The deeper caching design is author material. Do not display it as a completed student lesson or invent its content. Older prototype cache tabs have different instructional purposes and must not replace the canonical first eight lessons.

## Import and progression

1. Verify the release paths and hashes. Use `lesson_id` / `candidate_lesson_id` as the content key. Do not identify lessons solely by display order or title.
2. Preserve existing content IDs, activity IDs, versions, and progress for Lessons 1–5. Their source bytes and lab bytes are unchanged. Append LS-M020-06, LS-M020-07, and LS-M020-08 with the supplied metadata.
3. Merge the new release into existing stored state rather than clearing local storage, replacing accounts, or resetting an owner's observations. A learner's current place should remain their current place. Make Lesson 6 available through normal navigation; do not mark Lesson 5 studied merely because new material was imported.
4. Use the supplied lesson titles in the UI. Describe the available block as HTTP foundations, Lessons 1–8. Make later caching/security/reliability work visibly planned if the app has that feature, but do not count unwritten lessons as available.
5. Display the new kit download for Lessons 6–8. It is a separate archive with default port 4317 and does not replace the 3–5 kit on 4315. Render the relevant download link where the lesson introduces it.
6. Preserve the Markdown explanations, code, tables, and Mermaid diagrams. Provide a readable text fallback for diagrams. Do not shorten a lesson into a summary or turn a worked explanation into an unexplained quiz.
7. Keep front matter, hashes, release IDs, draft provenance, and technical ingestion fields in author/admin views. They must not dominate the student's dashboard or interrupt the lesson narrative.

## Activities and solutions

The existing 15 activities are retained exactly. Nine added activities point to authored headings in Lessons 6–8. Place recording fields at those sections using `source_heading`. Avoid duplicating the lesson's prompt when it is already visible. Preserve predictions separately from later observations and explanations. Optional notes must not become mandatory forms for reading the course.

All worked explanations remain available. The new lab contains a hints/walkthrough file and complete reference replacements. These are legitimate learning resources, not hidden assessment secrets. If the app uses collapsible solutions, the learner must be able to open them without a timer or score gate.

The new activity records do not award formal mastery or verify runtime execution. Tests run on the learner's computer. An uploaded transcript or statement is learner-reported evidence. Existing review/appeal behavior remains governed by the application specification. Do not execute uploaded student code or fabricate review findings from a canned result.

## App acceptance checks

- Existing dashboard/navigation/visual styling remain present with the new release imported.
- Existing Lessons 1–5 progress and notes survive the import; new lessons begin with their actual unstudied state.
- A learner at Lesson 4 can resume there and later move through 5, 6, 7, and 8 without a duplicate-ID collision.
- All eight titles match the release manifest; the new lessons render in full with code, tables, and diagram fallback.
- Each lesson downloads its declared kit; earlier kits remain available and their checksums match.
- Activity anchors resolve to actual headings, help remains available, and responses persist under stable IDs.
- Technical release metadata stays out of the normal learning narrative.
- A user can distinguish study progress from verified competence; local test reports are not automatically labeled independently verified.

These checks need to be performed in the actual app. They were not executed during content authoring because the separate VS Code app implementation is not part of this workspace handoff.
