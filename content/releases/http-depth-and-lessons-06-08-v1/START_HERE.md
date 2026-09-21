# HTTP curriculum revision and Lessons 6–8

This package makes the course's intended depth explicit, captures the teaching approach the owner enjoyed in Lessons 1–4, and supplies the next three complete student lesson drafts with a runnable local kit.

## For the course owner

Read `specifications/Curriculum_Depth_and_Progression_Map_v1.md` first. It shows the detailed HTTP route, later rate-limiting and security work, and a depth audit across all 27 competency domains. `Lesson_Authoring_Standard_v1.md` defines how future teaching should preserve clarity while developing more demanding mechanisms and investigations.

Finish Lesson 5 when ready, then continue with Lessons 6–8. Download and extract the new Lessons 6–8 kit; it uses a separate folder and port from the previous kit. Keep your earlier work. Use `Owner_Review_After_Lesson_08.md` to record feedback, especially hidden code prerequisites and whether the investigation helps connect mechanisms to evidence.

Lessons 6–8 build the foundation for deeper work. They are not being presented as the advanced HTTP endpoint. `HTTP_Deep_Investigation_Design_v1.md` defines the next demanding reference investigation; its prerequisite caching lessons and adapted fixture still need authoring.

## For the VS Code coder

Read `VS_Code_Coder_Handoff_Lessons_06_08_v1.md` before changing the app. Import the content release while preserving the established Engineering Practice UI and existing learner records. This is a curriculum/content update with a new downloadable lab. The release metadata is for ingestion and review, not a replacement learner-facing home page.

The package includes all eight canonical lesson files and all three required lab downloads for convenience. Lessons 1–5 and their earlier kits are byte-identical to the supplied first-five release. Their stable IDs and saved study records must remain intact. The new material is Lessons 6–8, the added kit, and the revised specifications.

## Files to use

| File or folder | Purpose |
| --- | --- |
| `specifications/Curriculum_Architecture_v1_1.md` | Full versioned architecture revision; preserves all 68 module IDs |
| `specifications/Learning_Design_Review_and_Curriculum_Refinement_v1_1.md` | Revised authority/status plus original research rationale and migration map |
| `specifications/Curriculum_Depth_and_Progression_Map_v1.md` | Mechanism-to-practice progression and later depth destinations |
| `specifications/Lesson_Authoring_Standard_v1.md` | Current normative authoring contract |
| `specifications/HTTP_Deep_Investigation_Design_v1.md` | Planned advanced reference experience; not completed student content |
| `specifications/Graduate_Competency_Standard_v1.md` | Unchanged graduate outcome standard, internal version 1.1 |
| `content/learning-release.json` | Canonical ordered lesson and lab inventory with hashes |
| `content/trial-activities.json` | Existing first-five activities plus nine new recording entry points |
| `content/lessons` | Student-facing Markdown sources |
| `content/labs` | Local kit ZIP downloads, including the new 6–8 kit |
| `Verification_and_Known_Limits.md` | What was checked and what still needs owner/app/environment review |
| `CHANGELOG.md` | Scope, compatibility, and sequencing changes |

The existing application requirements, technical architecture, and UI design handoff remain applicable. This package does not select a new app stack or redefine the website's visual design.
