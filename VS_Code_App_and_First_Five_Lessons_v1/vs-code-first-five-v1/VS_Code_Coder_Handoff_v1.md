---
document_id: FSSE-CODER-HANDOFF-001
version: "1.0.0"
date: "2026-09-11"
audience: "The owner's VS Code AI coder"
purpose: "Application implementation alongside independently authored lessons"
first_checkpoint: "Owner completes HTTP Lessons 1–5 and returns an experience review"
status: "Implementation handoff; application work is owned by the external coder"
---

# Application handoff for the five-lesson learning trial

## 1. The agreed division of work

The owner will give this package to their VS Code AI coder to build the application. Curriculum and lesson authoring continue separately. The owner will import each authored release into the application, complete the first five HTTP lessons as a student, and return observations before the curriculum expands further.

Your responsibility is application behavior, content import, presentation, reliable work storage, and a usable learning journey. The supplied lessons own the explanations, examples, commands, practice, and solutions. Preserve them faithfully. If implementation reveals an ambiguity, record a concrete content question instead of silently rewriting the lesson.

Build toward the full application specification, with the first usable checkpoint focused on these five lessons. The checkpoint is an owner learning rehearsal, not a public course launch or a validated qualification service.

## 2. Read the specifications in this order

The accompanying archive places these documents in `specifications/` and the learning release in `content/`.

| Document | Read it for |
| --- | --- |
| This handoff | Current work split, first delivery checkpoint, and content integration rules |
| `Application_Requirements_and_UX_Specification_v1.md` | Product requirements, learner flows, persistence, review, assistance, and acceptance scenarios |
| `Learning_Design_Review_and_Curriculum_Refinement_v1.md` | Later teaching corrections: ordered lessons, explicit prerequisites, revised HTTP sequence, and lesson-specific prompts |
| `Technical_Architecture_and_Implementation_Plan_v1.md` | Proposed application boundaries, records, implementation stages, and operational requirements |
| `Curriculum_Architecture_v1.md` | Overall module map, projects, prerequisites, and the distinction between planned and authored material |
| `Graduate_Competency_Standard_v1.md` | Outcome and assessment authority; the document is internally version 1.1 despite its historical filename |

Source precedence is: the owner's current instructions; graduate outcome/evidence rules; the later learning-design corrections for teaching sequence; the compatible authored lesson release; application behavior and implementation choices. This handoff clarifies the immediate checkpoint and import format. It does not remove the full specification's requirements for later shared operation or formal assessment.

The older documents refer to eight `LS-HTTP-*` lessons and a conditional-caching investigation. The supplied first-five release uses **`LS-M020-01` through `LS-M020-05`**. These are distinct identities. Do not import the old first lesson over the rewritten one or automatically carry its exercises, cached predictions, grades, or progress into the new sequence.

`specifications/Representative_Learning_Package_v1.zip` is included only because the architecture links to that earlier reference package. It is historical context, not a second active content release. Import the first-five manifest in `content/`; it is the only release selected for this checkpoint.

The architecture also describes a Sites-hosted workflow prototype. Its synthetic role switching, scripted reviews, browser-local records, and platform-specific deployment configuration are historical prototype details. Use its described workflows as context; choose a supported implementation for the owner's actual VS Code repository and deployment environment. Record material architecture choices and the exact dependency versions used.

## 3. What the first usable checkpoint must support

### Read and navigate

Present the five lessons in order with a readable central column, ordinary section headings, a contents list, useful code blocks, real tables, and rendered Mermaid diagrams. Keep the prose equivalent beside each diagram. Allow the learner to resume their place, return to an earlier explanation, and read ahead.

Do not collapse the lesson into the old First model / Technical reality / Where it breaks tabs. The authored order deliberately interleaves explanation, example, prediction, observation, and feedback. Preserve that order and the full wording. Navigation may summarize titles, but it must not replace lesson prose with an AI-generated summary.

### Work locally

Show the correct downloadable lab for each lesson and explain that commands run in the learner's local terminal. Code examples remain inert in the platform. A Copy button copies exactly the command or code shown. Do not run submitted programs or automatically execute downloaded lesson code on the application server.

Lesson 1 needs no local kit. Lesson 2 has its own preserved kit. Lessons 3–5 share a later kit with more routes and a small example page. Do not overwrite a learner's existing source to upgrade a kit; downloads are separate versions with explicit instructions.

### Record the learner's actual work

Support notes, a prediction, an observation, and a reflection attached to the specific lesson and activity. Store a submitted or acknowledged prediction separately from later corrections. Learners may add an updated explanation without erasing the original prediction.

Use `content/trial-activities.json` for stable activity IDs and authored prompts. Those prompts are convenience entry points into the activities already present in the Markdown. They do not replace inline practice or constitute a formal grading rubric.

The activity file selects 15 recording points. Its `source_heading` identifies the canonical section; `prompt_markdown` is an exact excerpt, sometimes including a worked example or feedback. Place recording fields beside that section rather than displaying a duplicate copy or treating the excerpt as a closed assessment. Response fields are optional and relevant only to the activity at hand.

The learner must see whether work is unsaved, saving, saved, or failed to save. A refresh and application restart must preserve acknowledged work in the documented supported mode. Provide an export of progress and work so the owner can send their review back to the content author.

For a local owner-only implementation, durable storage on that machine is a possible first delivery mode if clearly documented. Do not imply cross-device recovery. If the app is remotely hosted or shared, implement the applicable authenticated ownership and private-storage requirements before collecting actual work. The prototype's persona selector is not authentication.

### Provide explanations and feedback honestly

Keep the authored full explanations accessible in learning mode. Additional hints may be linked only when authored or clearly labelled generated assistance. Do not fabricate hint ladders, rubrics, grades, or competency awards.

If real in-app review is ready, attach its feedback to the actual submitted revision and preserve later responses/revisions. Otherwise, export the learner's work for review in the existing author conversation and identify that handoff clearly. Do not display a canned review as if someone assessed the owner's work.

The first five lessons provide conceptual and guided operational practice. “Studied,” “practice recorded,” and “feedback received” are useful states. None means broad HTTP mastery or independent engineering competence.

## 4. Portable content contract

### Source files and metadata

Each lesson is UTF-8 Markdown with YAML front matter. The Markdown is canonical; compiled JSON or database views are disposable derivatives.

The current files carry `document_id`, `version`, `module`, and `candidate_lesson_id`. Use `candidate_lesson_id` as their stable lesson key. A future `lesson_id` alias may be supported, but conflicting values must produce an import error. The first H1 is the display title; do not derive it from the filename.

Preserve the original metadata and source hash. Some prerequisites and outcomes are prose lists rather than formal concept IDs. Display them as authored text. Do not pretend to validate a complete prerequisite graph or convert a prose sentence into a new competency identifier.

Lesson 1 is `2.0.0-draft`; Lessons 2–5 are `1.0.0-draft`. A greater revision number is not a later position in the course. Order comes from the release manifest. Draft status means these are owner-review candidates, not independently approved public releases.

### Release manifest

`content/learning-release.json` supplies:

- A release ID, version, intended audience, and trial status.
- Ordered lesson entries with stable IDs, document IDs, versions, titles, source paths, and SHA-256 hashes.
- Explicit lab-download entries and their hashes.
- Each lesson's linked lab ID, or `null` for a reading-only lesson.
- A reference to `trial-activities.json` and its hash.

Paths in that manifest are relative to the directory containing it. Resolve them within the supplied release directory; reject a path that escapes it. Validate hashes before importing. This manifest describes the owner trial only and is not a serialization of the graduate standard's evidence schema 2.0.

An import with missing files, conflicting IDs, mismatched hashes, duplicate lesson IDs, or missing referenced labs should fail with a specific explanation. Do not fill gaps with generated lessons. Lessons not yet supplied remain planned.

### Rendering

Support CommonMark/GitHub-style paragraphs, headings, emphasis, ordered and unordered lists, blockquotes, tables, fenced code, and Mermaid. HTML examples inside code fences must remain escaped code, not become running page elements. Treat imported content as data; sanitize rendered markup and use Mermaid's supported safe configuration.

Show a labelled text fallback if a diagram cannot render, along with the adjacent prose. Keep code blocks horizontally scrollable without forcing the whole page to scroll sideways. Preserve line breaks and whitespace where they matter in HTTP messages, JSON, commands, and sample output.

Resolve relative asset links through the release. Keep external references usable. Do not ship `sandbox:` links or author-workspace absolute paths into the portable application's navigation. Render front matter as selected learner-friendly facts, rather than a raw configuration dump above the lesson.

### Versioning and ownership

Store study/work records against lesson ID, content version, release ID, and activity ID where relevant. Importing a new version must not overwrite an earlier submitted attempt or change the question against which it was answered. A learner can deliberately start a new attempt against updated content.

Keep sources and release manifests in version control. Adding the next lesson should be a content import and review action, not a custom UI implementation for each subject. Return any proposed teaching change to the owner with the exact original and proposed text.

## 5. Suggested implementation sequence

1. Inspect the repository and read the provided specifications. Record the implementation's intended local or hosted mode and any compatibility questions.
2. Implement content import and the lesson reader. Verify the long real lessons, tables, command blocks, answers, and diagrams rather than relying on placeholder text.
3. Connect the exact lab downloads and activity records. Keep tasks independent across lessons.
4. Implement acknowledged saving, resume, export, and the appropriate real-review or manual-review handoff.
5. Rehearse the complete first-five journey, including errors, narrow screens, keyboard interaction, and restart/recovery. Give the owner a working launch path and an honest verification report.

The full product specification remains the roadmap. Payment systems, editor extensions, MCP integrations, broad automated assessment, and formal graduate decisions do not need to delay this first five-lesson checkpoint.

## 6. Acceptance checks for this handoff

| Check | Required result |
| --- | --- |
| Import the supplied release | Exactly five current lesson IDs, correct order and versions; no old caching lesson substituted |
| Inspect Lesson 1 | Full developed analogy and message explanations remain intact |
| Inspect Lesson 2 | Tables, terminal commands, multiline output, diagram, and setup-repair sections are usable |
| Inspect Lessons 3–5 | New content is imported unchanged; the shared lab download is linked to the correct version |
| Change lessons | Predictions and notes remain tied to their own lesson/activity |
| Save, refresh, restart | Acknowledged work and reading position survive in the supported mode; unsaved work is not falsely labelled saved |
| Simulate a save failure | Existing acknowledged work remains intact; the learner can recover or export the unsaved text |
| Show answers | Full explanations are available without an artificial waiting period or a fabricated penalty |
| Export the trial | The owner receives their actual work with lesson/activity/version context and review notes |
| Update content | Old submitted work retains its original context; a new version does not rewrite history |
| Inspect review/progress | No scripted sample is labelled a real review; studying five lessons creates no mastery or graduation claim |
| Rehearse accessibility | Core navigation, notes, downloads, help, and export work by keyboard; diagram meaning remains available as text |

These checks supplement the larger specification. Report what was actually exercised and what remains unverified. A successful build alone is not an end-to-end learner rehearsal.

## 7. What the owner should bring back after Lesson 5

Export the actual notes and use `Owner_Review_After_Lesson_05.md` to record specific points of friction. Include the lesson and section, what you expected, what happened, what help you needed, and your local environment. Keep content confusion, tool setup trouble, and application behavior distinguishable so the right person can fix each one.

The next curriculum decision follows that review. Do not automatically generate the remaining HTTP lessons or the rest of the 68-module curriculum as part of application scaffolding.

## 8. Instruction to start the VS Code coder

> Read `VS_Code_Coder_Handoff_v1.md`, then the referenced specifications. Build the application for the owner trial through HTTP Lesson 5. Import the supplied Markdown release faithfully, keep the learning work durable and tied to its actual lesson/version, and support the local labs without executing student code on the platform. Preserve the existing educational and evidence rules. Choose and document an implementation appropriate to this repository; do not assume the old prototype's hosting configuration is available. Deliver a working launch path, the acceptance-check results, and any concrete questions for the lesson author. Do not shorten or invent course content, simulate real reviews, or claim learner validation from software tests.
