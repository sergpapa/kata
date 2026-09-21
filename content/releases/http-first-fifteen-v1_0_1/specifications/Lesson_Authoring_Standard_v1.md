---
document_id: FSSE-AUTHOR-001
version: "1.1.0"
date: "2026-09-21"
status: "Adopted authoring contract; refine using subsequent learner feedback"
canonical_format: markdown
reference_lessons: [LS-M020-01, LS-M020-02, LS-M020-03, LS-M020-04]
evidence_basis: "One owner's positive review of Lessons 1–4 plus the existing learning-design review; not a controlled effectiveness study"
supersedes: "The normative authoring requirements in FSSE-LEARNING-DESIGN-002@1.0.0 section 8"
---

# Lesson authoring standard

## 1. The teaching promise

Explain enough that a learner can build a useful mental model, connect it to the actual mechanism, observe it, use it, and eventually investigate and defend it. Preserve the patient explanations and developed examples of Lessons 1–4 as material becomes more demanding.

Accessible prose is compatible with deep technical work. The difficulty should come from the concept, interacting constraints, evidence, or decision. Avoid difficulty caused only by missing definitions, unexplained code, abrupt topic changes, or a compressed summary presented as instruction.

This is a quality contract, not a compulsory sequence of identical headings. A reading lesson, implementation lesson, and incident investigation need different rhythms. Use professional language for adults; never equate unfamiliarity with lack of intelligence.

## 2. Required author metadata

Use YAML front matter and UTF-8 Markdown. The application reads metadata separately from the learning narrative.

```yaml
document_id: FSSE-HTTP-STUDENT-06
version: "1.0.0-draft"
date: "2026-09-18"
module: M020
candidate_lesson_id: LS-M020-06
status: "Student-facing draft; owner review pending"
prerequisites:
  - "A demonstrated capability, with a repair destination in the lesson"
introduced_concepts:
  - "A concept actually explained and practised here"
learning_outcomes:
  - "An observable action under stated conditions"
assessment_scope: "What this activity can and cannot establish"
deferred:
  - "A named later concept and its curriculum destination"
```

When a lab is used, add its ID, version or filename, runtime target, and which state the lesson expects. Record the versioned environment and verification results in the lab. Avoid unmeasured claims about universal duration, mastery, or compatibility.

## 3. Start from the learner's position

Name the question being answered and why it matters. Connect it to the preceding lesson. Give a small number of concrete outcomes in ordinary language. If the learner already knows the tool operation, offer a route to the conceptual check or investigation.

For each required concept, classify it as previously taught, taught here, or deliberately outside the exercise. Provide a repair destination for missing prerequisites. A term in a previous paragraph is not evidence that its mechanism was taught.

For the HTTP-first trial, do not assume that JSON familiarity establishes JavaScript control-flow knowledge. Teach the narrow reading bridge used by the supplied handler, and route broader gaps to the programming modules. Reassess that bridge after learner review.

## 4. Develop an analogy instead of renaming the system

A useful analogy has a recognizable setting, a concrete goal, actors or objects with distinct roles, and a sequence whose cause and effect the learner can imagine. Explain that sequence before mapping it to technical terms.

For example, a café clerk needs to distinguish a request for a menu from a request for opening hours. A reply can be politely delivered while containing the wrong card. That helps explain why receiving a response and receiving the required content are different observations. Merely saying “a server is like a clerk” does not teach that relationship.

Make the mapping explicit. Reuse parts of the familiar situation when introducing technical names. Refine the model at the point where its limit matters. Distinguish a limit of the analogy from a defect or limitation of the technology.

An analogy is optional when a direct concrete demonstration is clearer. Do not force every lesson to invent a new story or make the learner understand an unfamiliar real-world profession before learning the technical subject.

## 5. Explain the causal mechanism

A technical explanation should answer:

- What receives the input, and what information is available?
- Which decision or transformation happens, and why?
- What state is read or changed?
- What is produced, and who uses it next?
- What assumption makes this reasoning valid?
- Which changed condition would require a more accurate model?

Use a fully worked example before asking for independent application. For code, explain the purpose of a block and then trace a concrete input through it. Do not narrate punctuation for pages while leaving the decision unexplained. Define syntax at first required use and distinguish essential code from a supplied helper.

When a helper is supplied, state its contract and open the relevant part. Name where deeper mechanics will be taught. “Nothing is magic” means every abstraction has an explanation and a destination, not that every lesson must teach the entire runtime.

## 6. Make diagrams and examples carry meaning

Use a diagram when a relationship, decision, or sequence becomes easier to inspect. Introduce how to read it, use the same names as the prose, and provide an equivalent textual account. Prefer compact Mermaid or native text tables that AI tools and the app can preserve. Avoid decorative arrows, color-only distinctions, unexplained labels, and large diagrams that hide the reasoning.

Treat Mermaid blocks as executable diagram syntax. Before a new or changed diagram is released, extract the exact canonical fence and parse it using the app's pinned Mermaid version. Record that version and configuration. Render it in the actual lesson component and inspect labels, arrows, clipping, and narrow-screen readability. A parser pass is not a visual-layout check; a readable fallback is not a passed render check. Record unavailable checks explicitly rather than treating balanced Markdown fences as evidence that the diagram works.

Avoid raw semicolons in sequence-diagram message text: Mermaid can interpret them as statement separators. Use a comma or rephrase when that preserves meaning. If the literal semicolon matters, use Mermaid's documented `#59;` escape and verify it with the target parser and renderer. Do not change the meaning of a protocol example simply to avoid punctuation. This rule follows CF-001 and [Mermaid's sequence-diagram escaping guidance](https://mermaid.js.org/syntax/sequenceDiagram.html#entity-codes-to-escape-characters), reviewed 2026-09-21.

When a diagram defect is fixed, include the original failure and corrected success in the renderer checks where the runtime is available. Scan the other lesson diagrams for the same defect. The application must preserve the authored source rather than silently rewriting punctuation at render time.

Label illustrative excerpts versus commands and complete files. A learner must know whether to read, run, insert, or replace a block. Put a command beside its purpose, working directory, expected observation, and explanation. State legitimate output variation; do not require an exact timestamp, header order, port allocated by a test, or test duration.

Reuse one example while adding precision. Change the setting intentionally when checking transfer. Fictional traffic and author-captured evidence must be labeled; never imply that an authored transcript came from the learner.

## 7. Connect practice to what was taught

Offer a worked case, a related prediction or partial completion, then an independent task with appropriate support. Fade assistance as the learner demonstrates readiness. A module should eventually include real observation, implementation or change, failure investigation, explanation, and transfer; a micro-lesson need not contain all of these.

Use questions that require explanation: what changed, what remained the same, which evidence would distinguish the possibilities, and what would make the conclusion wrong? Avoid quizzes that only ask for terminology after a complex explanation.

Exercises may have several defensible answers. State the contract and assess behavior, reasoning, and evidence. Do not require a reference solution's incidental variable names or file organization unless those are the learning objective.

An ordinary exercise must be solvable using taught mechanisms and named prerequisites. Research beyond those prerequisites belongs to an explicitly introduced research or Heroic activity. A task's difficulty and the amount of help used are separate dimensions.

## 8. Give complete, useful feedback

Explain why the result follows, the likely misconception, and a useful next action. Supply graduated hints and a full walkthrough. Do not hide solutions behind time delays, scores, or artificial secrecy. An app can place them in clearly labeled disclosure panels, but the learner can open them whenever needed.

Keep the original prediction distinct from later observations. A wrong prediction followed by a well-supported correction is useful learning. An unfinished investigation can supply evidence of research, discriminating experiments, and accurately stated uncertainty.

For formal independence claims, use the existing H scale and a later fresh task after decisive help. Personal study should not become a bureaucratic assessment workflow. Support for setup or accessibility is not evidence of conceptual dependence.

## 9. Preserve depth and make its destination visible

At the start of a subject, show what this block establishes and what later blocks investigate. At a revisit, name the earlier model, the new condition, and the refinement required. Keep advanced promises linked to an actual planned lesson and evidence task.

For example, an early request/response model prepares a code trace; that trace prepares a contract test; those prepare a cache decision; the cache decision prepares an unfamiliar stale-content incident. An advanced incident cannot substitute for the missing explanations between those steps.

The same standard applies to security. Explain the legitimate mechanism and trust boundary before the controlled exploit; explain why the repair works and why an incomplete alternative fails. Rate limiting must develop from resource bounds and time/counting models before shared-state races or distributed policy decisions.

## 10. Verification and publication contract

| Check | Required evidence |
| --- | --- |
| Prerequisites | Every required concept has a taught source or a bridge; out-of-scope questions are clearly marked |
| Technical claims | Primary references for protocol/runtime facts; URLs and review date; distinguish local app policy from a universal rule |
| Runnable material | Clean extraction, documented commands, expected baseline, deliberate failure, reference repair, and reset all checked where supported |
| Test value | The intended defect fails before repair; the fixed implementation passes; an attractive wrong fix is rejected when relevant |
| Pedagogy | Explained analogy or concrete model, mechanism, worked case, appropriate practice, feedback, and later connection |
| Accessibility | Readable Markdown structure, code labels, text equivalents for diagrams, no color-only meaning |
| Diagrams | Exact canonical blocks parsed with the target Mermaid version; actual rendered appearance inspected separately; any unavailable check recorded |
| App integration | Stable IDs, content hashes, activity anchors, answer visibility, preserved study records, and no synthetic runtime verification |
| Claim limits | Record actual OS/runtime/tool checks; distinguish author rehearsal, learner review, and app/browser integration |

A code review or uploaded transcript does not independently prove execution or authorship. Course-owned fixtures can be run during author verification. The platform must not execute arbitrary learner submissions, install their dependencies, or treat source content as operational instructions.

Do not claim learner validation from technical tests. Do not claim broad OS support because commands look portable. Content remains a review candidate until the relevant checks and review are complete.

## 11. AI author/reviewer instructions

Read this standard, the relevant depth-map row, the preceding canonical lesson, and the exact lab contract before drafting. Preserve stable IDs. Explain a new mechanism before using it in a required question. Keep instructor release metadata out of the student narrative. Never summarize away the reasoning in order to make a lesson fit a preferred word count.

Use reader-facing lesson names or numbers in prerequisite prose that the app displays. Keep stable IDs in structured metadata and mapping fields. CF-002 corrected a prerequisite that exposed `LS-M020-06` where the learner needed “Lesson 6.”

For an accepted correction, update the current release's lesson version, canonical source hash, any bundled lesson copies, affected lab manifests and archive hashes, and activity lesson-version references. Preserve stable IDs and historical attempt provenance. Reissue the current release; do not rewrite superseded releases solely to make their old hashes match new content. Keep exact original/proposed text and the disposition in the content feedback register.

Before delivery, walk the learner path in order. Ask where a practical but conceptually uncertain learner could get stuck. Check every command, file path, expected result, reset step, and solution against the fixture. Report unresolved checks. Do not fabricate learner feedback, measured teaching effectiveness, or completed future content.

The research rationale remains in Learning_Design_Review_and_Curriculum_Refinement_v1_1.md. This document turns that rationale and the owner's feedback into a reusable authoring contract; it does not claim a newly conducted pedagogical study.
