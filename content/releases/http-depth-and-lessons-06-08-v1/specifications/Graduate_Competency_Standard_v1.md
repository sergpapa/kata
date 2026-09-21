---
title: "Graduate Competency Standard for Full-Stack Software Engineering"
version: "1.1"
status: "Reviewed design draft pending role calibration and pilot validation"
date: 2026-09-10
artifact_type: "graduate_competency_standard"
target_role: "Mid-level full-stack software engineer"
canonical_format: "markdown"
document_id: "GCS-FSSE-001"
schema_version: "2.0"
competency_id_pattern: "^[A-Z]{2,3}-[0-9]{2}$"
domain_count: 27
competency_count: 206
awareness_topic_count: 12
validation_status: "Structural checks completed; educational effectiveness not yet validated"
---

<!-- Competency identifiers are stable references for curriculum, exercises, rubrics, and evidence records. -->

# Graduate Competency Standard for Full-Stack Software Engineering

**Version 1.1 Reviewed Program Specification**

10 September 2026

This document proposes the competencies and evidence needed to prepare a learner for bounded full-stack product engineering work. It is a design standard, not an accredited qualification or proof that the course produces mid-level engineers. Role expectations, workload, assessment reliability, and graduate outcomes must be calibrated with practicing engineers and evaluated with learners before making that claim publicly.

## Machine Use Conventions

- Competency identifiers use the stable `DOMAIN-NN` form, such as `NET-04` and `SEC-03`.
- `P0` through `P4` describe performance, `H0` through `H5` describe help received, `L1` through `L6` describe task difficulty, and `G1` through `G11` identify graduation gates. Context variation, evidence provenance, and confidence are separate fields.
- Schema version 2.0 replaces the ambiguous version 1.0 assistance codes. Old `A0` walkthrough records map to `H5`; old `A3` independent records map to `H0`. Old `A4` adaptive records map to `H0` plus a changed-context flag. Old `A1` and `A2` records require the actual help transcript to assign an H level; do not infer it from the old code alone.
- Each domain uses the same sequence: scope, graduation expectation, competency requirements, required practical evidence, common failure patterns, and depth boundary.
- One evidence artifact may map to several competency identifiers, but each claimed outcome must be directly observable.
- In normative sections, **must** and **required** indicate a condition of graduation or program conformance; **should** indicates a recommended default; **may** indicates a permitted option.
- The competency rows specify required capabilities, but their compound outcomes need assessable indicators in the registry. A list of topics in one row is not an atomic test. Preserve parent IDs when adding child indicators; never silently reuse or redefine an ID.
- This Markdown is the authoritative source for outcomes and policy. Edit it directly. A future registry must retain the source document ID, version, content hash, and explicit field ownership; generated fields must not be manually maintained in a second source. The older DOCX and generation scripts are not authoritative.

## Decision Summary

Graduation is competency based. Completing lessons, accumulating points, or finishing a capstone does not by itself satisfy this standard. A graduate must repeatedly demonstrate that they can understand, build, debug, secure, operate, explain, and defend software in realistic conditions with an appropriate level of independence.

The aspirational role target is a strong mid-level full-stack engineer for a modern product team. Job levels vary by organization, so the assessable contract is independent ownership of bounded features, diagnosis of common failures, safe operation, and reasoned escalation. Neither a score nor the breadth of this document establishes equivalence to a job title. Specialist depth and senior organizational scope remain outside the claim.

Students work in professional local environments. They use an editor, terminal, Git, browsers, databases, containers, cloud tooling, infrastructure as code, continuous delivery, observability systems, and Kubernetes. The learning platform reviews submitted code, diffs, documents, logs, and reasoning. It does not need to execute arbitrary student code; students run and test their work locally or in explicitly provisioned training environments.

Moving execution away from the platform reduces its execution attack surface; it does not make uploads, AI review, or learners' machines risk-free. Static review cannot establish that code was run, that a report is authentic, or that the learner wrote the work independently. The evidence and safety policies below explicitly limit those claims.

| **Decision** | **Standard** |
| --- | --- |
| Graduate claim | A proposed capability profile; a public mid-level-readiness claim requires independent calibration, observed evidence, and outcome validation. |
| Curriculum rule | Concepts and prerequisites are mapped before lessons are sequenced. Simplified models are later replaced with more accurate models. |
| Practice rule | Every substantial concept is followed by prediction, experiment, implementation, diagnosis, explanation, or later transfer. |
| Environment | Real development and operational tools on the learner's machine and in controlled cloud or cluster environments. |
| Assessment | Multiple evidence types across normal work, unfamiliar code, incidents, security, design, delivery, and a serious capstone. |
| Difficulty | Guided through Heroic. Heroic tasks intentionally exceed directly taught material and treat research as part of the work. |
| Assistance | Help is always available and recorded. Full solutions are available on request; fresh later evidence establishes independence. |
| Safety | Security and failure injection exercises use course-owned, local, or explicitly authorized targets with defined guardrails. |

### How to Use This Standard

Program designers use it to decide what belongs in the curriculum and at what depth. Authors map every lesson and exercise to one or more competency identifiers. Assessors use the performance and evidence rules to judge readiness. Learners use it to understand the graduation claim and the evidence they still need.

The reference teaching stack is JavaScript and TypeScript, a component framework, Node.js, PostgreSQL, Git, Docker, infrastructure as code, Kubernetes, and one cloud provider. Specific products, supported versions, licenses, costs, and operating-system variants belong in a maintained environment manifest. Curriculum examples may use React and Terraform without making every framework convention or vendor interface a universal engineering requirement. These choices do not prescribe the platform implementation stack.

### Document Map

| **Part** | **Section** | **Purpose** |
| --- | --- | --- |
| 1 | Graduate Standard Foundation | Role claim, boundaries, principles, and expected working conditions |
| 2 | Performance and Evidence Model | Depth levels, independence, evidence quality, and graduation rules |
| 3 | Learning and Assessment System | Lesson cycle, exercises, difficulty, assistance, and submissions |
| 4 | Professional Engineering Environment | Required tools and the progression toward independent operation |
| 5 | Domain Competency Standards | 27 domains with measurable outcomes and required practical evidence |
| 6 | Graduation Assessment | Noncompensable gates, capstone, design defense, and final decision |
| 7 | Curriculum and Assessment Governance | Traceability, authoring quality, calibration, analytics, and versioning |
| 8 | Artifact Roadmap | The ordered design and build artifacts that follow this specification |

## 1 Graduate Standard Foundation

### Graduate Role Profile

A graduate should be ready to join a product engineering team whose work spans browser interfaces, services, relational data, asynchronous processing, cloud delivery, and production operations. They should require onboarding to the organization's domain and stack, but not remedial instruction in the ordinary mechanics of professional software work.

**THE GRADUATE CAN NORMALLY**

- Own a bounded feature from requirement clarification through design, implementation, tests, review, deployment, observation, and follow up.
- Read and safely modify code they did not write, using history, tests, documentation, runtime evidence, and conversations with other engineers.
- Investigate a production style symptom across frontend, backend, data, network, infrastructure, and third-party boundaries.
- Identify common security, correctness, accessibility, reliability, and performance risks before and after release.
- Make ordinary technical decisions, state assumptions, compare credible alternatives, and change direction when evidence invalidates an assumption.
- Use documentation, experiments, source code, peers, and AI tools appropriately when the answer is not already known.
- Explain work clearly, review another engineer's change, receive review, and ask for help before uncertainty becomes hidden risk.

### Boundaries of the Claim

The standard sets a demanding target; it does not claim that course completion substitutes for commercial experience. Until the assessment is calibrated and delivered, it describes evidence we intend to collect, not evidence already obtained. A learning-only pilot may report reviewed and self-reported outcomes but must not label them externally verified competence.

- The graduate is not automatically a senior engineer. Organization wide architecture, multi team leadership, long-horizon technical strategy, and repeated judgment across years of changing constraints require additional experience.
- The graduate is not a specialist in every adjacent field. They can collaborate effectively with database, security, platform, network, accessibility, product, legal, and reliability specialists and recognize when specialist review is required.
- No single framework, cloud, or tool is treated as permanent. Tool specific skill must be accompanied by a transferable model of the problem and its tradeoffs.
- Employment outcomes also depend on communication, domain fit, local market conditions, and hiring processes outside this standard.

### Entry Profile and Learner Pathways

The default design assumption is a motivated beginner with basic computer literacy, not prior programming, Linux, Git, or cloud experience. Validate this audience assumption before committing the syllabus. Provide a preparatory route for files and folders, installing software safely, using a browser, reading error messages, and basic arithmetic and logic; teach technical vocabulary in context.

- A diagnostic measures current understanding and practical performance, not credentials or confidence. Experienced learners may challenge prerequisites and skip redundant instruction after demonstrating them.
- Define milestones such as programming foundations, web application implementation, independent feature ownership, and operational integration. These are useful progress reports, not automatic mid-level credentials.
- Publish expected study effort as ranges with assumptions. Include setup, practice, research, feedback, resubmission, integration, and capstone work; distinguish active study from calendar time and waiting for review.
- State supported operating systems, hardware, accessibility accommodations, account requirements, and paid resources before enrollment. Offer a low-resource route that still uses real tools; where a cloud competency cannot be assessed locally, provide a controlled real environment or mark it not yet demonstrated.
- Provide pause and re-entry, prerequisite repair, and recovery paths. A difficult unit or broken cumulative project must not trap the learner indefinitely.

### Foundational Design Principles

1. Understanding precedes prescription. The learner first identifies the problem an abstraction solves, then studies how it works, what it hides, how it fails, and when a different choice is better.
1. Simplified explanations are temporary models. Lessons label useful approximations and later identify where each model breaks down before introducing a more accurate one.
1. Professional tools are part of the competency. If engineers normally use a real tool for the work, the learner eventually uses that tool in a realistic environment.
1. Practice is continuous. Unit exercises occur throughout a lesson sequence and include recall, prediction, observation, coding, review, debugging, explanation, and transfer.
1. Prediction comes before observation when it improves the mental model. The learner commits to an expected result, runs the system locally, compares the outcome, and explains any difference.
1. Projects accumulate history and complexity. Long lived codebases expose the consequences of earlier design choices, migrations, dependencies, shortcuts, and changing requirements.
1. Unfamiliar code is normal. Learners must read, map, test, change, and review systems built by someone else.
1. Failure is designed into the curriculum. Repositories, databases, networks, containers, pipelines, clusters, and cloud environments are intentionally broken in controlled ways.
1. Research is an engineering skill. Open resource challenges may require documentation, source reading, experiments, external references, and consultation.
1. An unsolved problem can still produce evidence. Assessment distinguishes the final result from the quality of hypotheses, experiments, observations, reasoning, and learning.
1. Security practice is authorized and contained. Learners may demonstrate impact only against course-owned, local, or explicitly authorized targets, then remediate and prevent regression.
1. Assistance decreases as competence grows. Guidance moves from steps, to hints, to review, to ambiguous briefs and incidents. Help remains available at every stage.
1. Course progress and competency progress are separate. Finishing content can create opportunities for evidence, but it cannot replace demonstrated performance.
1. Every abstraction is eventually opened. Frameworks, ORMs, containers, managed services, and orchestration are examined beneath their convenient surface before the course relies on them as engineering tools.

### Expected Working Conditions

Graduation evidence must include work under varied conditions. Some tasks are clean and bounded. Others include unclear requirements, missing context, misleading evidence, legacy structure, partial failures, operational pressure, unfamiliar dependencies, or constraints that make the most fashionable solution inappropriate.

| **Condition** | **What it tests** |
| --- | --- |
| Known bounded work | The concept is known and the task has explicit acceptance criteria. |
| Integrated work | Several known concepts interact across-layers or tools. |
| Unfamiliar code | The graduate must orient within an existing repository and preserve its contracts. |
| Ambiguous requirements | Important rules must be discovered and assumptions recorded before implementation. |
| Fault investigation | The location and cause are not stated; evidence may include noise or incomplete reports. |
| Changed constraints | A new requirement, scale, failure, or policy invalidates an earlier choice. |
| Authorized adversarial work | The graduate identifies and safely demonstrates a vulnerability, then repairs and verifies it. |
| Novel challenge | Part of the required knowledge has not been directly taught and must be researched. |

## 2 Performance and Evidence Model

### Depth Categories

Exhaustive coverage means coverage within the stated role boundary, not specialist performance everywhere. Depth describes the curriculum's investment and evidence breadth; P levels describe performance under stated conditions. Appendix A assigns a default depth to every domain and explicit competency exceptions. Working-depth competencies remain required, and any P3 or P4 target still requires independent performance. P1 awareness topics are listed separately; they must not acquire hidden implementation gates.

| **Depth** | **Meaning** | **Typical target** |
| --- | --- | --- |
| Core | The graduate performs the work independently in realistic conditions, explains the mechanics, diagnoses common failures, and adapts when constraints change. | Usually P3 or P4 |
| Working | The graduate performs the specified bounded task, integrates it safely, and knows when deeper expertise is needed. A working-depth P4 means adaptation within that narrow task, not specialist expertise. | P2 to P4 as explicitly assigned |
| Awareness | The graduate explains the purpose and major tradeoffs, recognizes when the topic matters, and can begin a responsible investigation. | Usually P1 |

### Performance Levels

| **Level** | **Name** | **Observable meaning** |
| --- | --- | --- |
| P0 | Encountered | Recognizes vocabulary or follows a complete walkthrough. This is participation evidence, not graduation evidence. |
| P1 | Explain | Explains the purpose, basic mechanics, boundaries, and a representative example; recognizes when further investigation is required. |
| P2 | Apply | Completes a bounded task with references and, if needed, limited H1 to H3 guidance; validates the result and handles common errors. |
| P3 | Perform independently | Completes realistic work at H0, verifies behavior, diagnoses ordinary failure, and produces reviewable evidence. Ordinary documentation is permitted. |
| P4 | Adapt and judge | Sustains P3 performance while handling ambiguity, unfamiliar context, competing constraints, misleading evidence, or changed requirements, and defends the decision. |

P4 does not mean universal mastery. It means the graduate can adapt within the role boundary of this standard and can identify the point at which specialist expertise or additional authority is required.

An explanation-only task can confirm conceptual indicators but cannot, by itself, establish a P3 implementation or operational outcome. Each registry indicator must state the behavior being tested, the conditions, verification method, failure criteria, and acceptable alternatives. P4 is not the default rating for a difficult-looking topic: role calibration must justify it with a representative task.

### Help Levels and Independent Performance

| **Level** | **Label** | **Meaning** |
| --- | --- | --- |
| H0 | No solution-specific help | Requirements, ordinary reference material, access support, and clarification of ambiguous wording are available; no hint or generated solution is supplied. |
| H1 | Direction | A broad prompt identifies a useful direction without choosing the subsystem or method. |
| H2 | Subsystem or concept | A clue identifies a relevant layer, concept, or failure class. |
| H3 | Diagnostic or structured guidance | A suggested diagnostic, experiment, or supplied sequence materially narrows the learner's solution strategy. |
| H4 | Partial solution | Part of the code, configuration, diagnosis, or solution reasoning is supplied. |
| H5 | Full walkthrough | The complete solution or decisive diagnosis is disclosed. It is teaching evidence, not an independent demonstration of that solution. |

Higher H values mean more help. Record individual help events and the maximum H value for each claimed competency, not just one label for the whole project. Help is classified by what was disclosed, whether it came from the tutor, a person, a reference solution, or an AI tool. Ordinary documentation access is not itself a hint; obtaining the answer to this task is.

Task difficulty and changing conditions are independent of help. A learner may solve an L4 task at H0 or learn from an L6 task at H5. Accessibility and environment support that does not solve the assessed problem does not reduce independence. If the environment fault is itself the assessed problem, diagnostic help does count.

Assistance remains available on request. During a formal independent attempt, requesting solution-specific help ends the independent claim for the affected indicator and continues in learning mode. The learner can later supply fresh H0 evidence. Disclosed help never warrants punishment or deletion of earlier work.

### Evidence Quality

| **Dimension** | **Question the evidence must answer** |
| --- | --- |
| Validity | The task actually requires the competency it claims to assess. |
| Authenticity | The submitted code, decisions, and explanation can reasonably be attributed to the learner, with assistance disclosed. |
| Independence | The record states what guidance, collaboration, documentation, and AI support were used. |
| Transfer | The learner applies the competency in a different problem, repository, tool, or constraint. |
| Integration | The learner preserves behavior across relevant frontend, backend, data, security, operational, and product boundaries. |
| Recency | At least one decisive demonstration occurs late enough to represent the learner's graduation state. |
| Explainability | The learner can trace the work, justify choices, identify uncertainty, and respond to review questions. |
| Durability | Tests, documentation, telemetry, migration, and recovery evidence make the result reproducible and maintainable. |

### Evidence Provenance and Limits

Every evidence item identifies both its source and its claim. These categories are not a numeric authenticity score.

| Evidence source | What it can support | What it cannot establish alone |
| --- | --- | --- |
| Static artifact review | Reasoning about supplied code, configuration, tests, documents, and visible defects | Execution, production behavior, authorship, or absence of defects in unseen context |
| Learner-reported execution | A reported result with commands, environment, source identity, and raw output | That the report is complete, authentic, reproducible, or independently produced |
| Corroborated execution | A run linked to immutable source and environment with independently checked provenance or a controlled challenge | Absence of manipulation by itself, or understanding beyond the tested behavior |
| Observed performance | A qualified assessor observes a local demonstration and fresh modification or investigation, with an equivalent accessible format available | Behavior outside the scenario or a guarantee of future performance |

A commit hash identifies source content, not its author or whether it ran. Screenshots, terminal transcripts, test XML, CI badges, and extension-generated manifests are evidence inputs, not automatic proof. Prefer a source hash, baseline commit, environment manifest, commands, raw outputs, and explicit deviations. For critical graduation claims, combine artifacts with observed performance and a fresh reasoning or change task.

The platform can support observed local demonstrations without executing student code on its servers. If qualified observation is unavailable, issue a learning or portfolio report with provenance limitations; do not silently award the same verified graduation claim. A consented observation record need not be a permanent video recording. Do not require invasive device surveillance or use AI-authorship detectors as proof.

### Minimum Evidence Rules

- A single artifact may support several competencies, but each competency must be observable rather than inferred from project size.
- Every core P3 or P4 competency requires at least two distinct demonstrations on separate occasions, with at least one fresh H0 demonstration. At least one occurs in an integrated or unfamiliar context; that demonstration may also satisfy the H0 condition.
- Every P4 target additionally requires H0 adaptation under ambiguity, changed constraints, unfamiliar context, or competing tradeoffs, followed by explanation or defense. A working-depth P4 still requires this evidence within its bounded scope.
- Working depth competencies require at least one practical demonstration and one explanation, review, or transfer check. Awareness competencies require correct purpose, boundary, and escalation judgment.
- Security, authorization, data integrity, accessibility, deployment safety, and incident response contain noncompensable requirements. Strength elsewhere cannot average away a critical unsafe behavior.
- A decisive demonstration of each required competency must remain representative at graduation. The assessment specification must set a published review window and targeted reassessment triggers before enrollment; until then, graduation uses fresh gate evidence and a targeted check of older evidence, not a percentage-of-course rule that breaks for accelerated learners.
- Evidence from assisted attempts remains visible and useful for learning, but cannot satisfy an independence requirement until confirmed later.
- The assessor must preserve failed approaches, feedback, revisions, and resubmissions when they reveal growth or recurring misunderstanding.

These counts are proposed pilot defaults, not empirically established cutoffs. Revision must follow observed workload, transfer, assessor agreement, and missed-defect evidence. Do not create two hundred unrelated examinations: one scenario may supply separately justified observations for many IDs. Repeated submissions of the same revealed solution count as one learning episode, not independent demonstrations.

Separate the learner's performance result from the reviewer's confidence and from evidence sufficiency. Missing files, ambiguous requirements, uncertain analysis, conflicting observations, or unavailable verification produce **insufficient evidence** or **needs review**, not an invented numeric score or an automatic failure. Show criterion-level reasons, uncertainty, remediation, and the evidence still needed.

### Competency Decision States

| **State** | **Interpretation** |
| --- | --- |
| Not yet observed | The learner has not produced evidence that directly exercises the competency. |
| Emerging | The learner can explain or perform with substantial guidance, but the evidence is narrow or inconsistent. |
| Developing | The learner succeeds on bounded work but lacks the independence, transfer, consistency, or evidence required by the target. Reference access alone does not imply a lower state. |
| Strong | The learner performs independently in realistic contexts and diagnoses common failures. |
| Adaptive | The learner transfers the competency to unfamiliar or changing conditions and defends sound tradeoffs. |
| Needs reconfirmation | Earlier evidence is stale, contradicted by recent work, or too dependent on assistance to support graduation. |

Competency state is a judgment over evidence, not a mathematical average. Keep target achievement separate from these descriptive states: a required P2 may be met while the learner is Developing relative to independent practice. Domain summaries must show unmet required indicators; strength in one area cannot conceal missing evidence in another.

### Evidence Review Cadence

- Formative evidence is reviewed immediately enough to guide the next attempt, while summative evidence receives a second review when the result changes a graduation state.
- Core competency records are reconsidered at major project milestones and before formal graduation gates so old success does not conceal recent regression.
- Evidence can expire when the underlying tool or standard changes materially, but the assessor should retest the affected behavior rather than discard transferable knowledge wholesale.
- Conflicting evidence remains visible. The readiness decision explains why the most recent or most representative performance outweighs an earlier result.

### Appeals and Reassessment

A learner may challenge a factual, technical, or attribution error in a review. The appeal preserves the original submission, feedback, rubric, environment, and reviewer version. A qualified reviewer addresses the disputed claim directly and records whether the evidence state changes.

Reassessment uses a fresh but comparable scenario. It should test the missing behavior rather than repeat the same answer pattern, and it should state which assistance remains permitted.

## 3 Learning and Assessment System

### Universal Learning Cycle

A substantial concept should pass through a recurring cycle. This is an authoring pattern, not a requirement to force ten activities into every micro-lesson. Authors may compress or repeat stages, but they may not substitute passive exposure for practical evidence. Offer accessible plain-language intuition without infantilizing adult learners; experienced learners can demonstrate prerequisites and skip redundant exposition.

| **Stage** | **Learning move** | **Purpose** |
| --- | --- | --- |
| 1 | Useful approximation | Build intuition and label the model as incomplete where necessary. |
| 2 | Concrete observation | Show the behavior in code, a tool, a trace, a diagram, or a real system. |
| 3 | Technical model | Explain mechanics, invariants, assumptions, costs, and interfaces. |
| 4 | Where the model breaks | Expose cases that invalidate the earlier simplification. |
| 5 | Prediction | Ask the learner to commit to expected behavior before execution. |
| 6 | Experiment | Run locally, compare results, change variables, and explain the evidence. |
| 7 | Implementation | Use the concept to satisfy a requirement in a reviewable change. |
| 8 | Failure and diagnosis | Encounter a representative misuse, defect, or operational failure. |
| 9 | Explanation and review | Defend the work, review alternatives, and state remaining uncertainty. |
| 10 | Later transfer | Reuse the concept in a different layer, project, tool, or constraint. |

Schedule retrieval, interleaved practice, and delayed transfer after the initial lesson, with remediation when an earlier mental model fails. Teach enough programming and HTTP to build an early useful program before demanding advanced operating-system or protocol internals; later passes deepen the same concepts. A prerequisite is the specific model needed now, not every advanced fact about its subject.

### Exercise Families

| **Family** | **Required character** |
| --- | --- |
| Recall and explanation | Retrieve a concept, explain it at more than one depth, or identify where an analogy fails. |
| Prediction | Commit to expected code, protocol, query, rendering, cache, transaction, or concurrency behavior before running it. |
| Micro implementation | Practice one narrow mechanic in five to twenty minutes. |
| Feature implementation | Build from requirements without copying a prescribed sequence. |
| Code reading | Trace unfamiliar code and identify behavior, assumptions, or risk. |
| Debugging | Locate and repair a defect from symptoms and evidence rather than a named file. |
| Code archaeology | Map an unfamiliar repository, history, data flow, tests, and deployment before changing it. |
| Refactoring | Improve structure while preserving behavior and keeping the migration reviewable. |
| Architecture repair | Correct a system whose structure works today but makes required change unsafe or expensive. |
| Code review | Review a fictional or real training change and distinguish defects, risks, questions, and preferences. |
| Data investigation | Diagnose schema, query, index, transaction, lock, migration, or connection behavior. |
| Performance investigation | Find a measured bottleneck and prove that a change improves the relevant constraint. |
| Security lab | Find, safely demonstrate, repair, and prevent a defect in an authorized target. |
| Infrastructure failure | Repair container, network, certificate, IAM, pipeline, cloud, or orchestration problems. |
| Production incident | Triage impact, use telemetry and history, mitigate, recover, communicate, and learn. |
| Requirements investigation | Detect ambiguity or conflicting product rules using stakeholder questions, acceptance examples, and available evidence; do not grade against an undiscoverable secret requirement. |
| Design decision | Choose and defend an architecture under concrete constraints and credible alternatives. |
| Migration | Move a live system or interface incrementally while preserving compatibility and recovery. |
| Unknown technology | Research and safely apply a tool or concept the curriculum has not directly taught. |

### Difficulty Levels

| **Level** | **Name** | **Character** |
| --- | --- | --- |
| L1 | Guided | Introductory task complexity with a narrow objective and explicit success conditions; instruction and walkthroughs are available. Record help actually used separately. |
| L2 | Easy | Known concept, narrow independent task, obvious evidence, and limited interactions. |
| L3 | Normal | Several known concepts interact; the learner chooses implementation and tests. |
| L4 | Hard | Ambiguity, larger scope, unfamiliar code, misleading evidence, or operational consequences. |
| L5 | Expert | Several systems and tradeoffs interact; evidence is incomplete and the learner must defend priorities. |
| L6 | Heroic | The task intentionally exceeds directly taught material. Research and experimentation are expected; complete solution is not required for the attempt to produce evidence. |

Every graduate completes at least one Heroic investigation and a structured review of what they tried, observed, learned, and would do next. Graduation does not require solving the Heroic task. The requirement exists to assess research, persistence, evidence discipline, and the ability to learn after reaching the edge of current competence.

Each Heroic task has a published effort budget, safe stopping conditions, an accessible alternative format, and a full explanation available on request. Pilot an initial investigation timebox of two to four hours, then adjust from learner evidence; this is not a required minimum of struggle or a limit on voluntary exploration. Score research and investigation separately from solution correctness. Advanced untaught mechanics cannot lower unrelated graduation ratings. Misleading evidence must be distinguishable through reasonable investigation, not an arbitrary hidden trick.

### Assessment Modes

| **Mode** | **What it measures** | **Resource policy** |
| --- | --- | --- |
| Knowledge check | Tests whether the learner can retrieve and explain an important mental model without substituting search for understanding. | May restrict references and hints |
| Engineering exercise | Tests execution on a bounded practical task with normal documentation and local tools. | Open documentation; assistance recorded |
| Engineering challenge | Tests investigation, integration, judgment, and research under ambiguity or unfamiliarity. | Open resource; solution-specific hints recorded |
| Formal performance assessment | Produces graduation evidence under defined conditions, a fresh repository or scenario, and independent review. | Assessment policy defines permitted tools |
| Review and defense | Tests whether the learner understands the submitted work and can respond to questions or changed constraints. | Interactive; may trigger remediation |

### Graduated Assistance

Use the H0 to H5 scale in Section 2 as the only help-level vocabulary in authoring and assessment. Direction is H1; subsystem and concept hints are H2; a suggested diagnostic is H3; a partial solution is H4; a complete walkthrough is H5. The content of a hint determines its level, not its button label. A nominally gentle hint that supplies the decisive diagnosis must be classified accordingly.

The tutor does not keep secrets after the learner needs instruction. Productive struggle is an opportunity, not a gatekeeping device. The evidence record distinguishes what the learner accomplished before and after help.

Tutoring and formal assessment have separate policies. Learners can always leave a formal attempt for teaching and later attempt a fresh equivalent task. The platform can control its own solution access but cannot prevent an external AI assistant from producing answers. Use transparent disclosure, fresh changes, and defense to support the independence claim; do not claim that an extension or MCP policy enforces independence outside the platform.

### Evaluation of Unsolved Work

A failed final answer can still demonstrate valuable engineering behavior. The assessor separately records problem framing, hypotheses, evidence selection, experiment design, observations, source use, safety, explanation, and the quality of the proposed next step. Correct elimination of plausible causes is real evidence. Unsupported persistence, random changes, and post hoc stories are not.

### Submission Package

| **Element** | **Required content** |
| --- | --- |
| Source state | A complete bounded source snapshot or a diff plus its available baseline; content hashes, exercise version, included and omitted files, and learner confirmation of the submission manifest. A diff alone is insufficient when relevant context is missing. |
| Requirements | Exercise identifier, acceptance criteria, constraints, assumptions, and any learner clarification. |
| Verification | Exact commands, raw results, source identity, environment, and deviations; screenshots where relevant, query plans, logs, traces, benchmark method, or deployment evidence. Classify each item by provenance rather than marking all uploads verified. |
| Reasoning | Design note, investigation log, threat model, migration plan, review response, or explanation requested by the rubric. |
| Assistance | Hints, collaboration, external references, and AI assistance used, including any generated material retained. |
| Environment | Relevant versions, operating system, dependencies, configuration assumptions, and known differences from the target environment. |

The V1 platform performs review without executing arbitrary submitted code. Students run work locally and provide evidence that a reviewer can inspect and, in an authorized learner environment, observe. Later integrations can collect source and a manifest from the editor; collection does not prove authorship, execution, or independence.

### Submission and Reviewer Trust Boundary

Removing server-side execution reduces risk but does not make submissions harmless. Uploaded archives can attack parsers, exhaust resources, escape extraction paths, or carry active content. Code comments and documentation can also contain instructions designed to manipulate an AI reviewer. These are separate risks requiring explicit controls. [OWASP file upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html), [OWASP prompt injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html).

The following are project requirements to verify in the threat model and technical specification:

- Start the private MVP with allowlisted plain-text source files, a manifest, and text-based evidence. Set file-count, individual-size, total-byte, context, processing-time, and review-cost limits. Defer ZIP, arbitrary repository fetching, binary previews, and editor integration until each has a tested need and threat model.
- If archive support is added, bound expanded bytes and nesting, reject traversal and links, and never extract over trusted application files. Fetching repositories introduces separate URL, redirect, credential, and network-access risks; a public URL is not a safety guarantee.
- Never run student build scripts, package installation, tests, Git hooks, editor tasks, submitted containers, or project-selected plugins on the platform. Fixed, platform-approved parsers or analyzers must ignore submitted executable configuration and run with resource limits and least privilege; adding execution requires a separately approved architecture change.
- Treat every submission, log, screenshot, comment, and retrieved document as untrusted data. Escape rendered text; do not serve uploaded HTML or SVG as active content. Keep submissions outside public content paths with authenticated, tenant-scoped access and defined deletion.
- Preview the file manifest and warn about likely secrets before transmission. Exclude credentials and unrelated workspace files by default. Scanning is a safeguard, not a guarantee that all sensitive data was detected.
- Keep trusted requirements, rubric, learner entitlements, and reference solutions separate from submission text. The reviewer receives only the current authorized context; it cannot retrieve another learner's work, execute tools on demand from code comments, or directly change competency records. Application policy validates structured findings and controls state transitions.
- Log decisions and provenance without retaining unnecessary secrets. Support review cancellation, bounded retries, duplicate submission handling, and recovery from unavailable or invalid model output. Never manufacture a review to fill an infrastructure failure.

## 4 Professional Engineering Environment

### Environment Requirement

Learners should graduate comfortable moving between editor, terminal, repository, browser, database, container runtime, cloud environment, pipeline, cluster, telemetry, and documentation. The program may provide setup automation, but it must not hide the tools or failure modes the graduate is expected to understand.

| **Area** | **Reference environment** | **Required use** |
| --- | --- | --- |
| Editor and debugger | Visual Studio Code or equivalent | Workspace navigation, source control, breakpoints, tasks, extensions, test integration, remote or container development |
| Shell and operating system | Linux shell and common command line tools | Files, processes, permissions, networking, text streams, automation, services, resource inspection |
| Version control | Git and a pull-request-style host | Branches, commits, merge, rebase, review, recovery, bisect, tags, releases |
| Language toolchain | Node.js, package manager, TypeScript, lint and format tools | Runtime versions, dependency resolution, scripts, source maps, builds, debugging |
| Browser | At least two modern browsers and developer tools | DOM, network, storage, performance, accessibility, memory, source debugging |
| Data | PostgreSQL plus a command line or graphical client | SQL, schemas, constraints, plans, transactions, migrations, backups, restore |
| Supporting services | Redis, queue, search, and object storage implementations where taught | Real integration, failure behavior, observability, and recovery |
| API tools | curl and an API client | Raw protocol inspection, authentication, headers, scripts, collections, repeatable checks |
| Containers | Docker or compatible runtime and Compose | Images, builds, networks, volumes, multi-service environments, debugging |
| Cloud | One major provider through console and CLI | Compute, storage, data, network, identity, DNS, cost, audit, managed services |
| Infrastructure as code | Terraform or equivalent | Plans, state, modules, environments, drift, review, controlled change |
| Delivery | A hosted CI and deployment workflow | Checks, artifacts, environments, credentials, rollout, rollback, verification |
| Orchestration | A local and controlled Kubernetes environment | Workloads, services, ingress, probes, resources, rollout, troubleshooting |
| Observability | Logs, metrics, traces, profiles, dashboards, and alerts | Instrumentation, correlation, performance analysis, operational decisions |
| Documentation | Primary docs, standards, issue trackers, source code, ADR and runbook formats | Research, decision records, change history, operational handoff |

### Environment Progression

| **Stage** | **Expected behavior** |
| --- | --- |
| Stage 1 | Setup is checked and explained. Commands are supplied, but the learner predicts their effect and inspects resulting state. |
| Stage 2 | The learner completes bounded setup, uses provided troubleshooting guides, and records environment differences. |
| Stage 3 | The learner creates and repairs multi-service local environments, repositories, databases, containers, and tests independently. |
| Stage 4 | The learner deploys, observes, secures, changes, and recovers controlled cloud and cluster environments. |
| Stage 5 | The learner receives incomplete operational context and must reconstruct system state using professional tools and evidence. |

### Safety and Cost Controls

- Cloud and security exercises use isolated accounts or projects, least-privilege identities, quotas, expiration, and cleanup procedures appropriate to the task. A budget alert is not a guaranteed spending cap; validate shutdown behavior and residual charges before assigning a paid exercise. AWS, for example, documents delays and charges beyond alert thresholds. [AWS Budgets limitations](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html).
- Destructive commands, infrastructure changes, credential rotation, migration, and failure injection require explicit target confirmation and recovery planning.
- Course repositories and targets contain synthetic or approved data. Learners must not test third-party systems or expose personal, proprietary, or regulated information.
- Every paid or persistent environment has an owner, cost visibility, shutdown path, and proof of cleanup.
- The platform stores only the submission context needed for teaching and assessment and applies defined retention and access policies.

Professional tools also create risks on the learner's machine. VS Code workspace trust is a useful precaution, not a general security sandbox, and Docker daemon access and host mounts can expose the host. Do not treat a local container as sufficient isolation for arbitrary hostile code. [VS Code workspace trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust), [Docker security](https://docs.docker.com/engine/security/).

Course-owned lab repositories and dependency changes require author review before release. Provide verified starting states, pinned supported versions, synthetic credentials, loopback-only service exposure where feasible, separate browser profiles, and explicit reset instructions. Never ask learners to run unknown peer submissions. Avoid privileged containers, host networking, host-root mounts, and Docker socket exposure in normal labs. Exercises that genuinely need stronger privileges require a separately approved disposable environment with no production credentials or personal data, and documented containment limits.

Lab instructions must state authorized targets, allowed actions, expected side effects, stop conditions, recovery, and cleanup verification. Security exploration outside the target boundary is prohibited even when a tool can reach it. Provide a course-funded or otherwise approved environment for learners who cannot safely afford or host a required exercise; do not silently substitute screenshots for required operational evidence.

Before enrollment, publish tested operating-system paths, memory/storage and virtualization needs, download sizes, browser support, accessibility options, and realistic cost ranges. Validate a lower-resource path that still exposes professional tools. Prepare an environment preflight and troubleshooting route; no single preferred laptop or vendor account is an unstated graduation prerequisite.

## 5 Domain Competency Standards

Each domain below defines measurable graduation outcomes, required practical evidence, recurring failure patterns, and the boundary between full-stack competence and specialist depth. Competency identifiers are stable references for curriculum, exercise, rubric, and learner evidence records.

| **Code** | **Domain** | **Overall graduation target** |
| --- | --- | --- |
| ENG | Engineering Inquiry and Research | P4 for investigation and P3 for routine research |
| SYS | Computer Systems and Program Execution | P3 for application relevant mechanics and P2 for deeper internals |
| LNX | Linux and Command Line Operations | P3 |
| PRG | Programming with JavaScript and TypeScript | P4 for core semantics and P3 for implementation |
| DSA | Data Structures Algorithms and Complexity | P3 for common choices and P4 for cost tradeoffs |
| GIT | Version Control and Collaborative Development | P4 for recovery and P3 for routine workflows |
| NET | Networks and Web Protocols | P4 for HTTP and P3 for application networking |
| BRW | Browser Platform and Developer Tools | P3 with P4 debugging |
| UI | HTML CSS Accessibility and Interface Quality | P3 with noncompensable accessibility requirements |
| FEN | Frontend Engineering | P4 for common product work and P3 for advanced patterns |
| BEN | Backend Services and API Engineering | P4 for common service work |
| WEB | Web Application Integration | P4 |
| DAT | Data Modeling SQL and PostgreSQL | P4 for relational application data and P3 for operations |
| DIS | Caches Queues Search Storage and Realtime Systems | P3 with P4 selection judgment |
| SEC | Application and Infrastructure Security | P4 for application security with noncompensable gates |
| TST | Testing and Software Quality | P4 for test strategy and P3 for implementation |
| DSG | Software Design and Codebase Structure | P4 |
| ARC | Architecture and System Design | P4 for common systems and P3 for distributed designs |
| CTR | Containers and Local Service Environments | P3 |
| CIC | Continuous Integration Delivery and Releases | P3 with P4 release judgment |
| CLD | Cloud Infrastructure and Infrastructure as Code | P3 for common deployments and P4 for bounded operational judgment |
| KUB | Kubernetes and Orchestration | P3 for workloads and P4 for bounded diagnosis and selection |
| OBS | Observability and Performance Engineering | P4 for diagnosis and P3 for instrumentation |
| REL | Reliability and Incident Response | P4 |
| PRD | Product Reasoning and Requirements | P4 |
| COM | Engineering Communication and Collaboration | P4 |
| AIE | AI Assisted Engineering and Verification | P3 with P4 verification judgment |

### ENG Engineering Inquiry and Research

Graduates approach unfamiliar work as an evidence problem. They clarify what is known, form testable explanations, use authoritative documentation, run controlled experiments, and change their conclusions when the evidence changes.

**Graduation expectation:** P4 for investigation and P3 for routine research

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| ENG-01 | Turn an incomplete request or vague symptom into explicit questions, constraints, assumptions, and observable success criteria. | P4 |
| ENG-02 | Form competing hypotheses, choose discriminating tests, keep an investigation log, and separate correlation from cause. | P4 |
| ENG-03 | Find and interpret primary documentation, standards, source code, issue trackers, release notes, and trustworthy technical references. | P3 |
| ENG-04 | Create small experiments or reproductions that isolate behavior without distorting the system under investigation. | P3 |
| ENG-05 | Learn an unfamiliar library or service well enough to make a bounded production change and explain the remaining uncertainty. | P4 |
| ENG-06 | Distinguish relevant evidence from noisy logs, coincidental recent changes, misleading reports, and plausible but untested stories. | P4 |
| ENG-07 | Record sources, experiments, decisions, failed approaches, and new questions so another engineer can continue the work. | P3 |

#### Required Practical Evidence

- An open-resource investigation in which the first plausible hypothesis is wrong and the graduate revises the plan from new evidence.
- A bounded change using an unfamiliar technology, accompanied by source citations, a minimal experiment, tests, and a statement of residual risk.
- A heroic challenge attempt assessed for method, observations, and learning even when the final defect is not found.

#### Common Failure Patterns

- Searching for a matching answer before defining the problem or checking whether the answer applies to the current version and context.
- Changing several variables at once, treating a symptom as a cause, or stopping after the first explanation that sounds reasonable.
- Hiding uncertainty, undocumented assumptions, copied commands, or unsuccessful experiments from the review record.

**Depth boundary:** The graduate is not expected to know every technology in advance. The required skill is disciplined discovery, validation, and safe application.

### SYS Computer Systems and Program Execution

Graduates can trace how source code becomes a running process and how CPU, memory, storage, the operating system, and runtimes constrain application behavior. They use these models to explain failures instead of treating the machine as a black box.

**Graduation expectation:** P3 for application relevant mechanics and P2 for deeper internals

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| SYS-01 | Explain the roles of CPU, memory, persistent storage, processes, threads, file descriptors, and system calls in application execution. | P3 |
| SYS-02 | Distinguish compilation, interpretation, bytecode, just-in-time compilation, linking, loading, and runtime libraries at a practical level. | P2 |
| SYS-03 | Reason about stack and heap allocation, references, mutation, garbage collection, leaks, and memory pressure in managed runtimes. | P3 |
| SYS-04 | Explain concurrency, parallelism, scheduling, blocking, synchronization, races, deadlocks, and resource contention with concrete examples. | P3 |
| SYS-05 | Handle text encodings, binary data, numeric precision, clocks, time zones, and serialization without silent data corruption. | P3 |
| SYS-06 | Use resource observations such as CPU, memory, disk, process state, and open connections to narrow an application fault. | P3 |

#### Required Practical Evidence

- A trace of a program from source through runtime execution, including where dependencies, environment, operating system, and hardware participate.
- A diagnosis of a leak, blocking operation, race, precision defect, encoding defect, or time zone error using measurements and a minimal reproduction.

#### Common Failure Patterns

- Using thread, process, asynchronous task, and parallel execution as interchangeable concepts.
- Assuming garbage collection prevents leaks or that a higher CPU percentage proves the CPU is the root cause.
- Treating dates, floating point numbers, strings, or serialized objects as lossless across every boundary.

**Depth boundary:** Graduates need application level systems reasoning, not kernel implementation, compiler construction, or hardware design expertise.

### LNX Linux and Command Line Operations

Graduates use a Linux shell as a normal engineering environment. They navigate, automate, inspect, and recover systems safely, and they understand permissions, processes, files, services, and network tools well enough to diagnose common failures.

**Graduation expectation:** P3

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| LNX-01 | Navigate and manipulate files safely; use paths, globbing, redirection, pipes, quoting, streams, and text processing deliberately. | P3 |
| LNX-02 | Inspect and control processes, signals, jobs, services, environment variables, ports, and resource use. | P3 |
| LNX-03 | Explain users, groups, ownership, permission bits, executable files, privilege boundaries, and common permission failures. | P3 |
| LNX-04 | Write defensive shell scripts for repeatable local and operational tasks, with validation, useful errors, and safe defaults. | P3 |
| LNX-05 | Install and inspect packages, locate executables and configuration, understand PATH, and avoid hidden environment assumptions. | P3 |
| LNX-06 | Use logs and tools such as ps, top, ss, lsof, curl, dig, journalctl, and process exit codes to investigate a failure. | P3 |

#### Required Practical Evidence

- Recovery of a service that fails because of permissions, configuration, environment, port binding, process state, or filesystem assumptions.
- A safe automation script that is idempotent where appropriate and handles missing inputs, command failures, and partial state.
- A command line investigation whose written record explains why each command was chosen and what its output ruled in or out.

#### Common Failure Patterns

- Copying privileged or destructive commands without understanding scope, quoting, expansion, or recovery consequences.
- Treating the current directory, PATH, shell, user, architecture, or installed packages as universal constants.
- Reading logs sequentially without a hypothesis, time window, correlation identifier, or known-good comparison.

**Depth boundary:** The target is confident application and service operation on Linux, not professional system administration across every distribution.

### PRG Programming with JavaScript and TypeScript

Graduates understand JavaScript and TypeScript beneath framework conventions. They can predict execution, write maintainable modules, use types at system boundaries, and debug asynchronous behavior without relying on memorized recipes.

**Graduation expectation:** P4 for core semantics and P3 for implementation

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| PRG-01 | Predict and explain values, types, coercion, equality, references, mutation, copying, destructuring, and parameter passing. | P4 |
| PRG-02 | Use lexical scope, closures, higher order functions, modules, and dependency boundaries intentionally. | P4 |
| PRG-03 | Explain objects, prototypes, classes, this binding, property lookup, and common object model traps. | P3 |
| PRG-04 | Trace tasks, microtasks, promises, timers, asynchronous iteration, cancellation, and error propagation; distinguish browser and Node.js scheduling guarantees, runtime-specific behavior, and unspecified timing. | P4 |
| PRG-05 | Design explicit control flow and error handling that preserves useful context and does not swallow or duplicate failures. | P3 |
| PRG-06 | Use TypeScript narrowing, unions, generics, structural typing, inference, utility types, and type guards; isolate and justify unavoidable assertions or unsafe library boundaries rather than hiding uncertainty with casts. | P3 |
| PRG-07 | Model external and untrusted data as unknown until runtime validation establishes the required shape and invariants. | P4 |
| PRG-08 | Configure modules, package scripts, linting, formatting, source maps, and debugging for a maintainable project. | P3 |
| PRG-09 | Construct and trace programs from literals, variables, expressions, operators, conditionals, loops, functions, arrays, records, and basic input/output; decompose a small problem and test boundary cases. | P3 |
| PRG-10 | Manage runtime and package versions, dependency graphs, manifests, lockfiles, semantic-version assumptions, scripts, and reproducible installation; diagnose a dependency conflict and verify a controlled upgrade. | P3 |

#### Required Practical Evidence

- Prediction exercises covering closures, mutation, coercion, event loop ordering, promise rejection, and module loading, followed by local verification.
- A TypeScript feature with runtime validation and targeted tests at trust boundaries; any necessary unsafe assertion is isolated, explained, and verified rather than treated as proof.
- A debugging task involving an intermittent asynchronous or state mutation defect in code written by another developer.
- Small programs built from basic control flow and data structures before framework scaffolding, with predictions, edge cases, and local test evidence.
- A reproducible clean setup and controlled dependency upgrade that preserves the lockfile, explains incompatible changes, and verifies affected behavior.

#### Common Failure Patterns

- Treating TypeScript as runtime validation or assuming a successful compile proves external data is valid.
- Using await mechanically without understanding ordering, concurrency, cancellation, or where errors are observed.
- Applying framework rules to compensate for an incomplete model of JavaScript scope, identity, mutation, or modules.

**Depth boundary:** The graduate is deeply fluent in the language used by the program, while remaining able to transfer programming concepts to other languages.

### DSA Data Structures Algorithms and Complexity

Graduates choose and implement data structures and algorithms that fit real application constraints. They can estimate cost, recognize when scale changes the answer, and measure rather than optimize by folklore.

**Graduation expectation:** P3 for common choices with P4 cost tradeoffs; specialist algorithms remain awareness topics

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| DSA-01 | Estimate time and space complexity and explain the practical limits of asymptotic notation, constants, input shape, and system effects. | P3 |
| DSA-02 | Select and use arrays, linked structures, stacks, queues, hash maps, sets, trees, heaps, and graphs for appropriate problems. | P3 |
| DSA-03 | Apply searching, sorting, traversal, grouping, deduplication, aggregation, and pagination patterns correctly. | P3 |
| DSA-04 | Recognize recursion limits, repeated work, unbounded growth, accidental quadratic behavior, and inappropriate in-memory processing. | P3 |
| DSA-05 | Balance computation, memory, I/O, database work, network calls, latency, and code clarity when selecting an approach. | P4 |
| DSA-06 | Use profiling and representative data to verify that an algorithmic change improves the real bottleneck. | P3 |

#### Required Practical Evidence

- An implementation that replaces a demonstrably poor data structure or algorithm and quantifies the effect on realistic inputs.
- A design explanation connecting an application requirement to a structure such as a queue, map, tree, heap, or graph.
- A code review that identifies hidden repeated work or unbounded growth without demanding premature optimization.

#### Common Failure Patterns

- Memorizing interview algorithms without recognizing the same cost patterns inside application code.
- Quoting Big O as the only performance fact or ignoring database, network, allocation, and serialization costs.
- Replacing readable code with a clever algorithm before measuring a relevant constraint.

**Depth boundary:** The standard emphasizes practical algorithmic judgment. It does not require competitive programming or advanced theory unrelated to full-stack work.

### GIT Version Control and Collaborative Development

Graduates use Git as a model of project history and collaboration, not as a sequence of copied commands. They create reviewable changes, resolve divergent work, locate regressions, and recover safely from mistakes.

**Graduation expectation:** P4 for recovery and P3 for routine workflows

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| GIT-01 | Explain the working tree, index, commits, references, branches, remotes, object identity, and how history changes under common operations. | P3 |
| GIT-02 | Create focused commits and branches; inspect diffs; stage deliberately; and write messages that preserve engineering intent. | P3 |
| GIT-03 | Merge and rebase appropriately, resolve semantic conflicts, and verify the integrated behavior rather than merely removing markers. | P4 |
| GIT-04 | Undo or recover changes using restore, revert, reset, reflog, and new commits with a correct assessment of shared history risk. | P4 |
| GIT-05 | Use log, blame, bisect, tags, and commit comparison to investigate when and why behavior changed. | P4 |
| GIT-06 | Prepare and review pull-request-style changes, respond to feedback, and keep branches current without obscuring history. | P3 |
| GIT-07 | Handle generated files, large files, secrets, line endings, ignores, hooks, and repository configuration responsibly. | P3 |

#### Required Practical Evidence

- A deliberately conflicted repository in which the graduate resolves behavior correctly and explains the intended combined result.
- A regression investigation using history and bisect rather than reading the current code alone.
- A recovery exercise involving an accidental rewrite, detached commit, incorrect reset, or secret committed to a controlled training repository.
- A series of reviewable commits and a pull request response showing good change isolation and communication.

#### Common Failure Patterns

- Resolving conflicts by choosing ours or theirs without reconstructing the intended behavior.
- Rewriting shared history or using destructive recovery commands before determining who depends on the commits.
- Treating one large final commit as equivalent evidence to a traceable development history.

**Depth boundary:** Graduates need professional Git fluency. Administration of large hosting installations and specialized monorepo infrastructure are awareness topics.

### NET Networks and Web Protocols

Graduates can follow a request across names, addresses, connections, encryption, proxies, and application protocols. They diagnose network symptoms with layered evidence and understand which guarantees each layer does and does not provide.

**Graduation expectation:** P4 for HTTP and P3 for application networking

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| NET-01 | Explain addresses, subnets, routes, ports, sockets, NAT, firewalls, and the path between a client and service at an application engineer level. | P3 |
| NET-02 | Trace DNS through stub, recursive, and authoritative resolution; reason about records, delegation, TTL, caching, and failure. | P3 |
| NET-03 | Explain TCP connection establishment, ordered delivery, flow and congestion behavior, timeouts, resets, UDP, and QUIC's role; diagnose an observed transport failure without assuming all HTTP uses TCP. | P3 |
| NET-04 | Use HTTP methods, status codes, headers, bodies, content negotiation, conditional requests, redirects, compression, and caching semantics correctly; distinguish shared semantics from HTTP/1.1, HTTP/2, and HTTP/3 transport behavior. | P4 |
| NET-05 | Explain TLS certificates, trust chains, hostname validation, handshakes, termination, renewal, and common certificate failures. | P3 |
| NET-06 | Reason about reverse proxies, load balancers, gateways, CDNs, connection pools, and forwarded client information. | P3 |
| NET-07 | Select HTTP polling, server-sent events, WebSockets, or another transport based on directionality, state, scale, and failure behavior. | P3 |
| NET-08 | Use curl, dig, browser network tools, socket inspection, and packet capture where appropriate to isolate a networking defect. | P4 |

#### Required Practical Evidence

- A request trace from browser to application through DNS, TLS, proxy, service, and response caching, with observed evidence from real tools.
- Diagnosis of a controlled DNS, certificate, proxy header, timeout, CORS, cache, or connection problem with misleading unrelated logs present.
- An HTTP API or caching review that identifies semantic defects beyond whether the request returns a successful status.
- A version-aware trace or comparison that identifies the negotiated HTTP protocol and avoids applying TCP-only reasoning to HTTP/3. HTTP/3 uses QUIC; protocol details should be taught from the applicable standard. [IETF RFC 9114](https://www.ietf.org/ietf-ftp/rfc/rfc9114.html).

#### Common Failure Patterns

- Using the phone book model of DNS after caching, delegation, negative responses, and multiple resolver layers matter.
- Treating HTTP, TCP, TLS, WebSockets, and browser security restrictions as one indistinct network layer.
- Changing retries or timeouts before locating which hop is slow, failing, or terminating the connection.

**Depth boundary:** The graduate needs deep web networking competence, not carrier routing, advanced BGP operations, or protocol implementation expertise.

### BRW Browser Platform and Developer Tools

Graduates understand the browser as a runtime, rendering engine, security boundary, network client, and diagnostic environment. They can explain visible behavior from underlying platform mechanics.

**Graduation expectation:** P3 with P4 debugging

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| BRW-01 | Explain navigation, URL processing, document creation, browser processes, frames, origins, and the lifecycle of a page. | P3 |
| BRW-02 | Use the DOM, events, propagation, default actions, focus, forms, and observers without framework dependent misconceptions. | P3 |
| BRW-03 | Trace style calculation, layout, paint, compositing, and the causes of rendering work and visual instability. | P3 |
| BRW-04 | Use cookies, storage, cache, service workers, and browser lifecycle events with correct persistence and security assumptions. | P3 |
| BRW-05 | Explain the same origin policy, CORS, content security policy, mixed content, sandboxing, and browser enforced restrictions. | P4 |
| BRW-06 | Use Elements, Console, Sources, Network, Performance, Memory, Accessibility, and Application tools to inspect and debug behavior. | P4 |
| BRW-07 | Diagnose compatibility, caching, extension, stale asset, source map, and client state problems across browsers and sessions. | P3 |

#### Required Practical Evidence

- A framework free experiment that predicts and observes DOM events, layout, storage, network, and browser security behavior.
- A browser only defect investigation using breakpoints, network timing, performance traces, accessibility inspection, and state cleanup as relevant.
- A stale client or service worker scenario that requires distinguishing server correctness from browser state.

#### Common Failure Patterns

- Attributing every visible defect to framework state without checking native DOM, CSS, network, or browser behavior.
- Disabling CORS or security controls instead of correcting the trust and request design.
- Testing only a warm local browser session and missing first load, private session, keyboard, or different viewport behavior.

**Depth boundary:** Browser engine implementation is awareness material. The graduate must be able to reason from web platform behavior and diagnostic evidence.

### UI HTML CSS Accessibility and Interface Quality

Graduates build interfaces that are semantic, responsive, keyboard usable, perceivable, and resilient. Accessibility and interface states are part of correctness, not a final cosmetic pass.

**Graduation expectation:** P3 with noncompensable accessibility requirements

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| UI-01 | Choose semantic HTML elements and document structure that preserve meaning, navigation, forms, and assistive technology behavior. | P3 |
| UI-02 | Build accessible forms with explicit labels, instructions, validation, error recovery, focus handling, and understandable control states. | P3 |
| UI-03 | Reason about cascade, specificity, inheritance, box model, positioning, stacking, flexbox, grid, containment, and responsive layout. | P4 |
| UI-04 | Create layouts that adapt to content, zoom, text size, input method, motion preference, color contrast needs, and viewport changes. | P3 |
| UI-05 | Implement keyboard interaction, focus order, accessible names, landmarks, announcements, and ARIA only where native semantics are insufficient. | P3 |
| UI-06 | Represent loading, empty, partial, offline, error, success, destructive, and permission denied states clearly. | P3 |
| UI-07 | Use browser and automated accessibility tools while recognizing that automated checks do not replace manual keyboard and screen reader reasoning. | P3 |
| UI-08 | Design text, layout, dates, numbers, direction, pluralization, and content expansion for internationalization and localization rather than one fixed language. | P3 |

#### Required Practical Evidence

- A responsive, content resilient interface tested with keyboard navigation, a screen reader, zoom, narrow viewport, reduced motion, and automated accessibility checks, with the tested task paths and remaining limitations recorded.
- Repair of an interface that appears visually correct but has semantic, focus, contrast, error messaging, or interaction defects.
- A form implementation with server and client validation, accessible error recovery, and loss prevention.
- A localization exercise covering expanded text, locale-sensitive dates and numbers, plural forms, and a right-to-left layout where relevant to the product brief.

#### Common Failure Patterns

- Using div elements and click handlers for native controls or adding ARIA to repair avoidable semantic mistakes.
- Treating pixel matching on one viewport as proof of a correct layout.
- Reporting an accessibility tool score as conformance without testing actual tasks and interaction paths.

**Depth boundary:** Graduates are expected to produce accessible product interfaces and recognize when specialist review or user research is required.

### FEN Frontend Engineering

Graduates design, build, test, and debug substantial frontend applications. They understand framework behavior, separate server and client state, choose rendering strategies from constraints, and keep interfaces maintainable as requirements grow.

**Graduation expectation:** P4 for common product work and P3 for advanced patterns

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| FEN-01 | Explain component rendering, identity, reconciliation, state preservation, effects, refs, context, and the causes of rerendering in the selected framework. | P4 |
| FEN-02 | Place state deliberately among local UI state, URL state, form state, server state, shared client state, and persisted state. | P4 |
| FEN-03 | Implement data loading, caching, invalidation, optimistic updates, cancellation, retries, pagination, race handling, and error recovery. | P4 |
| FEN-04 | Choose client rendering, server rendering, static generation, streaming, and hydration strategies based on product and operational constraints. | P3 |
| FEN-05 | Structure routes, features, components, shared primitives, styling, types, and data boundaries so changes remain local and reviewable. | P3 |
| FEN-06 | Build complex forms and interactions with accessible semantics, validation, submission state, unsaved work protection, and failure recovery. | P3 |
| FEN-07 | Measure and improve loading, rendering, bundle, image, interaction, and memory performance without hiding correctness defects. | P3 |
| FEN-08 | Debug stale state, duplicated requests, hydration mismatch, effect loops, race conditions, memoization mistakes, and dependency issues. | P4 |

#### Required Practical Evidence

- A multi-route application feature implemented inside an unfamiliar frontend codebase with tests, accessible states, and a reviewable change history.
- A race, stale cache, rendering, hydration, or performance investigation based on traces and observed framework behavior.
- A design review comparing rendering and state approaches under SEO, latency, personalization, offline, and operational constraints.

#### Common Failure Patterns

- Moving all state into one global store or using effects as a default synchronization mechanism.
- Applying memoization, client caching, or optimistic updates without a measured problem and a correct invalidation model.
- Testing only the happy render and ignoring loading, partial data, retry, cancellation, navigation, and accessibility behavior.

**Depth boundary:** Graduates should be independently productive in a modern component framework and able to evaluate alternatives. They are not expected to author a framework or browser engine.

### BEN Backend Services and API Engineering

Graduates build backend systems that enforce business rules, preserve data integrity, expose coherent contracts, and behave predictably under failure and concurrency. They can work below framework conventions when diagnosis requires it.

**Graduation expectation:** P4 for common service work

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| BEN-01 | Explain server lifecycle, request handling, middleware, dependency initialization, connection reuse, shutdown, and runtime concurrency. | P3 |
| BEN-02 | Design and compare REST, RPC, GraphQL, webhook, and event contracts; apply coherent validation, errors, pagination, idempotency, compatibility, and version evolution. | P4 |
| BEN-03 | Separate transport, application, domain, and persistence concerns without adding layers that have no clear responsibility. | P4 |
| BEN-04 | Enforce business invariants and authorization on trusted server boundaries, including multi step operations and partial failures. | P4 |
| BEN-05 | Handle concurrency, duplicate requests, retries, cancellation, timeouts, backpressure, and resource limits deliberately. | P4 |
| BEN-06 | Implement background jobs, scheduled work, webhooks, email or event delivery, and replay safe processing. | P3 |
| BEN-07 | Process files and streams with bounded memory, size and type controls, storage lifecycle, and error cleanup. | P3 |
| BEN-08 | Diagnose correctness, latency, connection, memory, and integration failures using logs, traces, tests, and direct protocol inspection. | P4 |

#### Required Practical Evidence

- A production style API feature with validation, authorization, transactional behavior, error semantics, tests, and operational instrumentation.
- A duplicate side effect or partial failure exercise involving retries, idempotency, jobs, or webhooks.
- A change to an unfamiliar service where the graduate must locate the correct layer and avoid spreading business logic across handlers.

#### Common Failure Patterns

- Equating successful request parsing with valid business state or relying on client side enforcement for server invariants.
- Returning generic successful or internal error responses that erase contract meaning and diagnostic context.
- Adding queues, services, abstractions, or layers by habit without identifying the failure or ownership problem they solve.

**Depth boundary:** The graduate should independently own common product services. Specialized low-latency, high-frequency, or safety-critical backend systems require additional depth.

### WEB Web Application Integration

Graduates join browser, frontend, backend, data, and infrastructure concerns into coherent user journeys. They can trace state and failures across boundaries and avoid local fixes that violate an end-to-end invariant.

**Graduation expectation:** P4

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| WEB-01 | Trace identity, request data, validation, authorization, persistence, side effects, response state, rendering, and telemetry through a complete user action. | P4 |
| WEB-02 | Define shared contracts and validation between client and server without assuming static types eliminate runtime version or trust problems. | P4 |
| WEB-03 | Handle partial connectivity, retries, duplicate submission, stale clients, optimistic state, conflict, and recovery across the full workflow. | P4 |
| WEB-04 | Coordinate cookies, tokens, CORS, CSRF controls, redirects, caching, proxies, and deployment origins in a secure browser to service design. | P4 |
| WEB-05 | Design file, email, webhook, realtime, and background processing flows that keep user visible state consistent with asynchronous work. | P3 |
| WEB-06 | Create end-to-end diagnostic paths using correlation identifiers, browser evidence, service telemetry, job state, and database records. | P4 |

#### Required Practical Evidence

- A complete feature whose acceptance tests cross browser, API, database, asynchronous work, and deployed configuration boundaries.
- An end-to-end defect in which each individual component appears locally correct but their contracts, timing, identity, or cache behavior conflict.
- A stale client or rolling deployment compatibility exercise requiring version tolerant contracts and a safe rollout plan.

#### Common Failure Patterns

- Declaring a feature complete when each layer passes isolated tests but the user journey cannot recover from realistic failure.
- Duplicating business rules across client and server without a clear authoritative boundary.
- Diagnosing from one layer only and changing local code before following identity and state across the whole path.

**Depth boundary:** This domain integrates the rest of the standard. It does not add a particular framework; it tests whether the graduate can own an end-to-end product outcome.

### DAT Data Modeling SQL and PostgreSQL

Graduates treat the database as a concurrent system that protects shared facts. They model invariants, write and inspect SQL, understand transaction behavior, evolve schemas safely, and investigate performance with actual plans and measurements.

**Graduation expectation:** P4 for relational application data and P3 for operations

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| DAT-01 | Translate domain rules into entities, relationships, keys, constraints, nullability, normalization, and deliberate denormalization. | P4 |
| DAT-02 | Write and explain joins, aggregates, subqueries, common table expressions, window functions, set operations, and data modification statements. | P4 |
| DAT-03 | Use primary, foreign, unique, check, exclusion, and transactional constraints to prevent invalid shared state. | P4 |
| DAT-04 | Explain indexes, B tree behavior, selectivity, composite order, covering opportunities, write cost, and planner choices. | P4 |
| DAT-05 | Read EXPLAIN plans, collect representative measurements, and distinguish query, schema, index, statistics, connection, and application causes. | P4 |
| DAT-06 | Reason about atomicity, isolation, locks, deadlocks, anomalies, retries, and transaction boundaries under concurrency. | P4 |
| DAT-07 | Design forward and backward compatible migrations, data backfills, rollback or roll-forward plans, and zero- or low-downtime transitions. | P3 |
| DAT-08 | Operate connection pools, backups, restores, data retention, and access controls at the level required by an application owner. | P3 |
| DAT-09 | Evaluate relational, document, key-value, graph, and time-series stores from access patterns and consistency needs rather than fashion. | P3 |
| DAT-10 | Use an ORM or query builder without losing control of generated SQL, joins, loading, transactions, migrations, pagination, and query count; diagnose abstraction leaks and justify direct SQL where appropriate. | P3 |

#### Required Practical Evidence

- A schema and migration sequence that encodes business invariants and survives realistic concurrent operations.
- A slow query investigation using actual plans and data distribution, including a deliberately unhelpful or harmful index.
- A locking, isolation, pool exhaustion, N plus one, or failed migration incident with diagnosis, remediation, and regression protection.
- A restore exercise proving that backup existence and recoverability are different claims.
- A feature implemented through an ORM or query builder, with captured SQL and query-count evidence; repair an N+1 or transaction-boundary defect and compare an appropriate direct-SQL alternative.

#### Common Failure Patterns

- Keeping invariants only in application code when concurrent writers or other tools can violate them.
- Adding indexes to every filtered column without considering selectivity, column order, storage, writes, and planner behavior.
- Treating a transaction as a performance wrapper or assuming the default isolation level prevents every anomaly.

**Depth boundary:** Graduates can own application data design and common PostgreSQL operations. Advanced database administration, engine development, and large scale replication topology are specialist areas.

### DIS Caches Queues Search Storage and Realtime Systems

Graduates add supporting data and messaging systems only when their guarantees match the problem. They reason about stale state, duplicates, ordering, replay, indexing delay, durability, and operational cost before depending on an abstraction.

**Graduation expectation:** P3 with P4 selection judgment

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| DIS-01 | Choose cache placement, key design, expiration, invalidation, warming, and failure behavior from latency and consistency needs. | P4 |
| DIS-02 | Use queues with explicit delivery, ordering, retry, backoff, dead-letter, visibility, idempotency, and observability assumptions. | P4 |
| DIS-03 | Design event publication and consumption with schema evolution, replay, deduplication, and transactional outbox or equivalent consistency patterns. | P3 |
| DIS-04 | Design search documents, indexing pipelines, mappings, relevance, filters, pagination, and synchronization with source data. | P3 |
| DIS-05 | Use object storage with correct naming, metadata, access, signed operations, lifecycle, malware controls, and orphan cleanup. | P3 |
| DIS-06 | Choose realtime delivery patterns and manage reconnect, missed events, fan out, presence, ordering, and authorization. | P3 |
| DIS-07 | Explain replication, partitioning, consistency, availability, and lag sufficiently to identify where a distributed workflow can lie or duplicate work. | P3 |

#### Required Practical Evidence

- A cache defect in which stale or cross tenant data appears, followed by a corrected invalidation and isolation design.
- A queue consumer tested against duplicate delivery, poison messages, retries, partial work, and observable failure.
- A design comparison showing when synchronous database work is safer and simpler than adding a cache, queue, search service, or event bus.

#### Common Failure Patterns

- Calling a cache temporary while allowing it to become an undocumented source of truth.
- Assuming exactly once delivery, global ordering, instantaneous search indexing, or atomic updates across independent systems.
- Adding infrastructure before defining consistency, recovery, ownership, and monitoring requirements.

**Depth boundary:** Graduates should integrate and operate common supporting systems. Designing globally distributed databases or messaging platforms is beyond the role target.

### SEC Application and Infrastructure Security

Graduates design and review systems as explicit trust boundaries. They can find, demonstrate, repair, and explain common security defects in authorized environments, and they know when a risk requires specialist escalation.

**Graduation expectation:** P4 for application security with noncompensable gates

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| SEC-01 | Create a threat model covering assets, actors, entry points, trust boundaries, abuse cases, likelihood, impact, and mitigations. | P4 |
| SEC-02 | Integrate authentication and delegated authorization using maintained password, session, token, OAuth, and OpenID Connect libraries or providers; distinguish their purposes and verify validation, storage, rotation, expiration, and recovery behavior without inventing cryptographic protocols. | P4 |
| SEC-03 | Enforce authorization for every object and action, including tenant isolation, role and attribute rules, ownership changes, and administrative paths. | P4 |
| SEC-04 | Identify and remediate injection, cross site scripting, request forgery, server side request forgery, path traversal, unsafe deserialization, and upload flaws. | P4 |
| SEC-05 | Protect secrets and credentials; use suitable password hashing, authenticated encryption, key management, rotation, and least privilege. | P3 |
| SEC-06 | Configure TLS, cookies, CORS, content security policy, security headers, proxies, and browser boundaries without disabling the control to remove an error. | P4 |
| SEC-07 | Assess dependency, build, container, CI, artifact, and software supply chain risk; patch and verify without uncontrolled breakage. | P3 |
| SEC-08 | Apply IAM, network, database, storage, logging, and secret controls to cloud and deployment environments. | P3 |
| SEC-09 | Conduct authorized security testing safely, preserve evidence, limit impact, remediate root cause, and add regression tests. | P4 |
| SEC-10 | Apply data classification, minimization, purpose limitation, retention, deletion, audit, redaction, and privacy boundaries throughout the system lifecycle. | P3 |

#### Required Practical Evidence

- An authorized vulnerable application lab requiring discovery, controlled proof of impact, remediation, regression tests, and an explanation of why an attractive alternative fix is incomplete.
- A multi-tenant authorization review that finds or rules out horizontal and vertical privilege escalation across UI, API, jobs, and storage paths.
- A threat model and secure design review for a feature involving sensitive data, authentication, files, webhooks, or administrative actions.
- A leaked secret or vulnerable dependency response in a controlled repository, including containment, rotation assumptions, history handling, and verification.
- A data-lifecycle exercise demonstrating minimization, authorized export or deletion, redacted telemetry, and documented retention and backup limitations against supplied requirements; escalate legal interpretation rather than inventing it.

#### Common Failure Patterns

- Confusing authentication with authorization or checking permissions only in the user interface.
- Creating a custom cryptographic scheme, trusting token contents without validation, or storing secrets in source, logs, images, or client bundles.
- Fixing the demonstrated payload while leaving the vulnerable class, alternative input path, or trust boundary unchanged.
- Testing systems without explicit authorization or allowing course security labs to target third-party systems.

**Depth boundary:** Graduates must build secure application systems and recognize serious risks. Advanced exploit development, cryptanalysis, and enterprise security operations are specialist disciplines.

### TST Testing and Software Quality

Graduates design tests as evidence about behavior and risk. They choose test boundaries, control dependencies, make failures diagnosable, and avoid using coverage or snapshot volume as a substitute for a coherent quality strategy.

**Graduation expectation:** P4 for test strategy and P3 for implementation

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| TST-01 | Derive a risk-based test strategy from requirements, invariants, boundaries, failure modes, and the cost of false confidence. | P4 |
| TST-02 | Write focused unit tests with meaningful examples, boundary cases, readable fixtures, and assertions on behavior rather than implementation trivia. | P3 |
| TST-03 | Write integration tests across databases, services, files, queues, and APIs with controlled state and realistic contracts. | P3 |
| TST-04 | Write end-to-end tests for critical user journeys while controlling brittleness, execution cost, and diagnostic quality. | P3 |
| TST-05 | Use contract, property-based, fuzz, mutation, visual, accessibility, performance, or security testing when the risk warrants it. | P2 |
| TST-06 | Use mocks, stubs, fakes, test doubles, clocks, and network controls without replacing the behavior the test claims to verify. | P4 |
| TST-07 | Diagnose flaky tests, isolation leaks, order dependence, timing assumptions, nondeterminism, and inconsistent environments. | P4 |
| TST-08 | Interpret coverage, escaped defects, test duration, failure history, and production signals as imperfect evidence rather than single target scores. | P3 |

#### Required Practical Evidence

- A layered test strategy for a feature, including explicit omissions and the risks those omissions leave.
- Repair of a flaky or falsely passing suite where the graduate identifies the underlying nondeterminism or incorrect test boundary.
- A regression test added after a real defect, demonstrating failure before the fix and protection after it.

#### Common Failure Patterns

- Testing mocks while the real database, HTTP, browser, queue, or serialization contract remains unverified.
- Writing one end-to-end test for every detail or one unit test for every line without a risk model.
- Treating high coverage, a green pipeline, or many snapshots as proof that important behavior is correct.

**Depth boundary:** Graduates own quality for product systems. Formal verification and specialized safety certification are awareness topics unless the target role requires them.

### DSG Software Design and Codebase Structure

Graduates keep software changeable under real pressure. They understand existing structure before modifying it, use boundaries that correspond to responsibilities, and refactor with tests and migration steps rather than rewriting by preference.

**Graduation expectation:** P4

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| DSG-01 | Evaluate cohesion, coupling, information hiding, dependency direction, module interfaces, and the local cost of a future change. | P4 |
| DSG-02 | Separate policy from mechanism and stable concepts from volatile integrations without creating ceremonial abstractions. | P4 |
| DSG-03 | Recognize duplication, shotgun changes, feature envy, large modules, cyclic dependencies, leaky layers, and misplaced business rules. | P4 |
| DSG-04 | Apply design patterns only when their forces are present and explain the simpler design that was rejected. | P3 |
| DSG-05 | Refactor incrementally under test, preserve behavior, keep changes reviewable, and avoid unrelated cleanup inside risky work. | P4 |
| DSG-06 | Structure configuration, feature flags, dependency wiring, generated artifacts, migrations, and environment specific behavior transparently. | P3 |
| DSG-07 | Onboard to an unfamiliar repository by mapping entry points, boundaries, data flow, tests, deployment, ownership, and change history. | P4 |

#### Required Practical Evidence

- A code archaeology exercise requiring a correct repository map before a bounded feature change is proposed and implemented.
- Repair of a deliberately deteriorated project structure with a staged refactor, characterization tests, and an explanation of remaining debt.
- A review that rejects both an under structured solution and an unjustified abstraction, based on the expected change pattern.

#### Common Failure Patterns

- Moving files or adding layers without changing responsibility, dependency direction, or the cost of change.
- Rewriting unfamiliar code before understanding its invariants, consumers, and operational behavior.
- Applying clean code slogans mechanically when performance, delivery risk, team context, or simplicity points elsewhere.

**Depth boundary:** Graduates should shape application codebases and refactor legacy areas safely. Organization wide platform architecture requires broader experience.

### ARC Architecture and System Design

Graduates derive architecture from requirements, constraints, failure modes, team ownership, and expected change. They can defend a simple design, identify when it stops fitting, and reject fashionable complexity that lacks a problem.

**Graduation expectation:** P4 for common systems and P3 for distributed designs

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| ARC-01 | Convert functional and quality requirements into explicit constraints, assumptions, capacity estimates, and architectural drivers. | P4 |
| ARC-02 | Choose among a monolith, modular monolith, services, serverless functions, managed platforms, and purchased capabilities from evidence. | P4 |
| ARC-03 | Choose synchronous calls, queues, events, schedules, and workflows based on coupling, latency, durability, consistency, and recovery needs. | P4 |
| ARC-04 | Define service and data ownership, contracts, failure boundaries, consistency expectations, and migration paths. | P3 |
| ARC-05 | Reason about scale, latency, availability, durability, security, operability, cost, delivery speed, and organizational complexity together. | P4 |
| ARC-06 | Plan API and schema evolution, compatibility, rollouts, reversibility, and incremental migration rather than assuming a clean replacement. | P4 |
| ARC-07 | Produce clear context, container, component, deployment, sequence, and data diagrams only when each view answers a decision question. | P3 |
| ARC-08 | Write and defend architecture decisions, including rejected alternatives, evidence, risks, validation plans, and conditions for reconsideration. | P4 |

#### Required Practical Evidence

- A design review for an ambiguous product brief with capacity, security, data, reliability, delivery, and cost constraints.
- A change request that invalidates an earlier assumption and requires an incremental architecture migration rather than a greenfield redesign.
- A build versus buy and monolith versus services decision in which the graduate defends the least complex adequate choice.

#### Common Failure Patterns

- Starting with technologies or diagram shapes before identifying requirements and constraints.
- Treating scalability as maximum traffic while ignoring data correctness, failure recovery, team cognitive load, and cost.
- Presenting tradeoffs as generic advantages and disadvantages without connecting them to this system and its expected change.

**Depth boundary:** Graduates can design and evolve common product systems. Planet scale, hard-real-time, regulated safety-critical, and novel distributed infrastructure demand specialist support.

### CTR Containers and Local Service Environments

Graduates use containers to make application environments reproducible and inspectable. They understand images, isolation, networking, storage, processes, and build context well enough to diagnose failures instead of repeatedly rebuilding at random.

**Graduation expectation:** P3

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| CTR-01 | Explain images, layers, registries, containers, namespaces, control groups, processes, signals, and the host relationship at a practical level. | P3 |
| CTR-02 | Write deterministic multi-stage Dockerfiles with intentional build context, caching, dependencies, users, entrypoints, and runtime artifacts. | P3 |
| CTR-03 | Configure container networking, service discovery, port publication, volumes, bind mounts, and persistence without localhost misconceptions. | P4 |
| CTR-04 | Use Docker Compose or an equivalent tool for multi-service development, health, dependencies, configuration, and repeatable reset. | P3 |
| CTR-05 | Reduce image attack surface and size; avoid embedded secrets; use non-root execution; and inspect dependency and base image risk. | P3 |
| CTR-06 | Debug build failures, architecture mismatches, missing files, permissions, DNS, ports, signals, resource pressure, and unhealthy processes. | P4 |

#### Required Practical Evidence

- A multi-service application running locally with documented setup, database persistence, health checks, and deterministic reset.
- A broken container lab involving networking, build context, permissions, architecture, startup, or signal handling, diagnosed with inspectable evidence.
- A Dockerfile review and optimization that measures image size, build time, cache behavior, runtime user, and included artifacts.

#### Common Failure Patterns

- Treating a container as a small virtual machine or assuming localhost reaches another container.
- Copying the whole repository into an image, installing development dependencies in production, or baking credentials into layers.
- Using restart loops and rebuilds to hide an incorrect process, health, persistence, or shutdown model.

**Depth boundary:** Graduates can containerize and debug product applications. Runtime implementation and fleet wide container platform engineering are advanced specialties.

### CIC Continuous Integration Delivery and Releases

Graduates design delivery pipelines that create trustworthy artifacts, expose failures early, protect environments, and support safe release and recovery. They understand that deployment and release are related but distinct events.

**Graduation expectation:** P3 with P4 release judgment

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| CIC-01 | Design pipeline stages for source validation, tests, security checks, builds, artifacts, deployment, verification, and promotion. | P3 |
| CIC-02 | Prefer building once and promoting an immutable artifact through environments; separate runtime configuration and explicitly identify, justify, and verify any required build-time environment variants. | P3 |
| CIC-03 | Manage pipeline credentials, protected environments, approvals, branch policy, provenance, and least privilege. | P3 |
| CIC-04 | Choose rolling, blue-green, canary, feature flag, and recreate strategies based on compatibility, observability, risk, and cost. | P4 |
| CIC-05 | Coordinate application and database changes for backward compatibility, rollback, roll-forward, and partial deployment. | P4 |
| CIC-06 | Use versions, tags, release notes, change records, and artifact metadata to make deployed state identifiable. | P3 |
| CIC-07 | Diagnose flaky checks, cache contamination, environment drift, permission failures, artifact mismatches, and failed deployments. | P4 |

#### Required Practical Evidence

- A working pipeline that builds a versioned artifact, runs layered checks, deploys to a controlled environment, and verifies the result.
- A failed release scenario requiring identification of deployed state, safe containment, rollback or roll-forward, and a migration compatibility decision.
- A pipeline security review covering secrets, token scope, untrusted contributions, dependencies, artifacts, and environment protection.

#### Common Failure Patterns

- Rebuilding per environment, deploying an unidentifiable artifact, or declaring success when the deployment command exits rather than when the service is healthy.
- Assuming rollback is always safe after irreversible data or external side effects.
- Giving the pipeline broad permanent credentials because short lived, scoped access is harder to configure.

**Depth boundary:** Graduates can own application delivery. Designing an enterprise wide developer platform or compliance system requires additional organizational scope.

### CLD Cloud Infrastructure and Infrastructure as Code

Graduates can deploy and operate a secure product environment using compute, networks, storage, databases, identity, DNS, and managed services. They use infrastructure as code and can explain cost, failure, and ownership implications.

**Graduation expectation:** P3 for common deployments and P4 for bounded operational judgment; provider-wide expertise is not required

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| CLD-01 | Choose compute, object storage, relational data, cache, queue, load balancing, DNS, and CDN services from workload requirements. | P3 |
| CLD-02 | Design basic cloud networks with regions, zones, virtual networks, subnets, routes, gateways, firewalls, private services, and controlled ingress and egress. | P3 |
| CLD-03 | Use identities, roles, policies, service accounts, short lived credentials, audit logs, and least privilege for people and workloads. | P4 |
| CLD-04 | Write modular infrastructure as code; review plans; manage state, dependencies, environments, imports, drift, and destructive changes safely. | P3 |
| CLD-05 | Select managed versus self-operated services from reliability, security, expertise, portability, cost, and delivery constraints. | P4 |
| CLD-06 | Estimate and monitor major cost drivers, data transfer, idle capacity, storage growth, logs, backups, and scaling behavior. | P3 |
| CLD-07 | Design environment separation, configuration, secrets, backups, regional placement, and recovery assumptions for a product workload. | P3 |
| CLD-08 | Diagnose IAM, network, DNS, capacity, quota, certificate, storage, and managed service failures using provider and application evidence. | P4 |

#### Required Practical Evidence

- A cloud environment provisioned from infrastructure code with network boundaries, IAM, secrets, observability, and a documented destroy or cost control path.
- A broken deployment caused by IAM, routing, DNS, quota, certificate, or environment drift, diagnosed without broadening access indiscriminately.
- A cost and architecture review comparing managed and self-operated options under explicit team and reliability constraints.

#### Common Failure Patterns

- Using administrator credentials for workloads or fixing an access failure by attaching broad wildcard permissions.
- Treating infrastructure code as safe because it is declarative while ignoring state, replacement, drift, and irreversible data operations.
- Selecting services from product names before defining latency, durability, compliance, expertise, and cost requirements.

**Depth boundary:** Graduates can own a common product deployment in one major cloud and transfer concepts elsewhere. Complex multi-account, multi-region, regulated, or hybrid estates need platform specialists.

### KUB Kubernetes and Orchestration

Graduates deploy and debug application workloads on Kubernetes while understanding when orchestration is unnecessary. They reason from desired state, controllers, scheduling, networking, configuration, health, and resource boundaries rather than memorizing YAML objects.

**Graduation expectation:** P3 for application workloads and P4 for bounded diagnosis and selection; cluster administration is not required

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| KUB-01 | Explain desired state, the API, control loops, scheduling, nodes, pods, and the distinction between workload and cluster responsibilities. | P3 |
| KUB-02 | Configure Deployments, StatefulSets where justified, Jobs, CronJobs, Services, Ingress, and namespaces for application workloads. | P3 |
| KUB-03 | Use ConfigMaps, Secrets, service accounts, RBAC, network controls, and external secret integrations with appropriate boundaries. | P3 |
| KUB-04 | Define startup, readiness, and liveness probes that match actual failure and dependency behavior. | P4 |
| KUB-05 | Set resource requests and limits; interpret scheduling, throttling, out-of-memory termination, autoscaling, and disruption behavior. | P3 |
| KUB-06 | Perform controlled rollouts, rollbacks, scaling, configuration changes, and application migrations while preserving compatibility. | P3 |
| KUB-07 | Use kubectl, events, logs, describe output, endpoint inspection, and metrics to debug pending, crashing, unreachable, or unhealthy workloads. | P4 |
| KUB-08 | Decide when a simpler container service, platform, or virtual machine provides a better operational tradeoff than Kubernetes. | P4 |

#### Required Practical Evidence

- Deployment of a multi component application to a local or controlled cluster with configuration, health, resources, networking, rollout, and observability.
- A broken cluster workload involving probes, service selectors, DNS, RBAC, configuration, image identity, scheduling, or resource limits.
- An architecture decision explaining why Kubernetes is or is not justified for a specific team and workload.

#### Common Failure Patterns

- Treating a running pod as a ready service or using liveness probes that amplify dependency failures.
- Leaving requests unset, copying resource limits blindly, or diagnosing every restart as an application exception.
- Choosing Kubernetes as a marker of seriousness without pricing its operational and cognitive cost.

**Depth boundary:** Graduates can own applications on Kubernetes. Cluster lifecycle, control plane design, advanced networking, and fleet platform engineering remain specialist areas.

### OBS Observability and Performance Engineering

Graduates make systems observable enough to answer operational questions. They correlate logs, metrics, traces, profiles, user experience, and changes; establish baselines; and improve measured bottlenecks without moving failure elsewhere.

**Graduation expectation:** P4 for diagnosis and P3 for instrumentation

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| OBS-01 | Design structured logs with levels, context, correlation identifiers, useful errors, redaction, retention, and controlled volume. | P3 |
| OBS-02 | Choose metrics, dimensions, histograms, dashboards, and alerts that expose user impact without uncontrolled cardinality. | P3 |
| OBS-03 | Instrument and interpret distributed traces across browser, proxy, service, database, queue, and external dependency boundaries. | P3 |
| OBS-04 | Use CPU, memory, allocation, event loop, query, network, browser, bundle, and rendering profiles to locate bottlenecks. | P4 |
| OBS-05 | Plan representative load, stress, endurance, and regression tests with clear workloads, baselines, budgets, and stopping criteria. | P3 |
| OBS-06 | Define service indicators and objectives, distinguish symptoms from causes, and alert on actionable risk rather than every anomaly. | P3 |
| OBS-07 | Measure before and after a change, account for variance and warmup, and confirm that optimization improves the user-relevant constraint. | P4 |
| OBS-08 | Protect sensitive data in telemetry and balance diagnostic value, cost, retention, sampling, and operational burden. | P3 |
| OBS-09 | Interpret rates, units, distributions, percentiles, sample sizes, variance, throughput, latency, concurrency, and capacity estimates; distinguish correlation from a tested causal explanation and state measurement limits. | P3 |

#### Required Practical Evidence

- Instrumentation of a full request path with correlated telemetry and a dashboard that supports a defined operational question.
- A performance incident in which a plausible metric is correlated but not causal, requiring profiles or traces to identify the real bottleneck.
- A measured optimization report with baseline, method, results, tradeoffs, and proof that correctness and capacity did not regress.
- A quantitative investigation showing why an average conceals tail latency or why a benchmark conclusion fails under different sample size, workload, or concurrency; use repeatable measurements rather than unsupported precision.

#### Common Failure Patterns

- Logging everything without structure or context, then relying on text search during an incident.
- Alerting on resource utilization without connecting it to user impact, capacity risk, or an actionable response.
- Optimizing the easiest visible code, using unrealistic benchmarks, or reporting one favorable run.

**Depth boundary:** Graduates can instrument and tune product systems. Organization wide telemetry platforms and advanced performance science are specialist areas.

### REL Reliability and Incident Response

Graduates expect components and dependencies to fail. They design bounded failure behavior, respond to incidents methodically, restore service safely, and turn incidents into concrete system and process improvements.

**Graduation expectation:** P4

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| REL-01 | Identify failure modes and define timeouts, retries, backoff, jitter, circuit breaking, bulkheads, and fallback behavior without retry amplification. | P4 |
| REL-02 | Design idempotency, deduplication, reconciliation, compensation, and replay for operations that can be repeated or partially completed. | P4 |
| REL-03 | Use backpressure, queues, admission control, rate limits, load shedding, graceful degradation, and feature controls to preserve critical paths. | P3 |
| REL-04 | Plan backups, restores, recovery objectives, dependency recovery, disaster scenarios, and regular proof that recovery works. | P3 |
| REL-05 | Triage incidents, establish impact, assign priorities, preserve evidence, communicate status, mitigate safely, and avoid uncontrolled concurrent changes. | P4 |
| REL-06 | Use timelines, telemetry, deployments, hypotheses, and counterfactual tests to distinguish trigger, contributing conditions, and root system weaknesses. | P4 |
| REL-07 | Write blameless, evidence based postmortems with owned corrective actions, verification, and prioritization by risk reduction. | P4 |
| REL-08 | Run controlled failure injection or game day exercises with authorization, guardrails, abort conditions, and learning objectives. | P3 |

#### Required Practical Evidence

- A production style incident with incomplete and partly misleading reports, recent changes, logs, metrics, traces, and time pressure.
- A duplicate payment, notification, or job scenario requiring idempotency and reconciliation rather than a narrower retry patch.
- A backup restore or dependency outage exercise that tests documented recovery assumptions.
- A postmortem and follow up review showing which actions reduced recurrence, detection, mitigation, or impact time.

#### Common Failure Patterns

- Retrying without a time budget, idempotency model, backoff, or awareness of correlated load.
- Declaring root cause as the last person or change in the chain instead of explaining why the system allowed broad impact.
- Writing a postmortem whose actions are vague training requests rather than verifiable system or process changes.

**Depth boundary:** Graduates can own incidents for common product systems. Major incident command across large organizations and formal resilience engineering require more experience.

### PRD Product Reasoning and Requirements

Graduates build the right behavior, not merely the requested syntax. They clarify users, outcomes, business invariants, edge cases, nonfunctional needs, and acceptance evidence before committing to implementation.

**Graduation expectation:** P4

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| PRD-01 | Identify users, jobs, outcomes, constraints, stakeholders, data sensitivity, and the decision the software must support. | P4 |
| PRD-02 | Turn ambiguous requests into examples, rules, acceptance criteria, error behavior, out of scope boundaries, and unresolved questions. | P4 |
| PRD-03 | Discover business invariants, permissions, lifecycle states, retention rules, audit needs, and consequences of partial completion. | P4 |
| PRD-04 | Surface quality requirements for security, accessibility, latency, availability, scale, privacy, support, cost, and operability. | P4 |
| PRD-05 | Decompose delivery into useful increments, identify dependencies and risks, and preserve a coherent path to the intended outcome. | P3 |
| PRD-06 | Use product telemetry and user evidence responsibly; distinguish measured behavior from interpretation and avoid dark patterns. | P3 |
| PRD-07 | Respond to changed requirements by reassessing assumptions, data, interfaces, migrations, tests, and operations rather than patching the visible screen only. | P4 |

#### Required Practical Evidence

- An ambiguous brief converted into a requirement model, acceptance examples, quality constraints, risks, and a staged delivery plan.
- A requirements trap where a technically correct implementation violates retention, permissions, money, localization, accessibility, or recovery rules.
- A mid-project change requiring impact analysis across frontend, backend, data, tests, deployment, and documentation.

#### Common Failure Patterns

- Treating the first wording of a ticket as complete truth or inventing missing business rules without recording assumptions.
- Optimizing implementation elegance while the user journey, permission model, edge cases, or operational ownership remains unclear.
- Adding every possible quality requirement equally instead of prioritizing by product risk and context.

**Depth boundary:** Graduates need strong product engineering judgment. Dedicated product management, research, legal, and domain expertise remain separate roles to collaborate with.

### COM Engineering Communication and Collaboration

Graduates make technical work understandable and reviewable. They communicate decisions, uncertainty, risk, incidents, and feedback at the level required by engineers, product partners, operators, and nontechnical stakeholders.

**Graduation expectation:** P4

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| COM-01 | Write concise READMEs, setup guides, API documentation, runbooks, migration plans, and operational notes that another person can follow. | P3 |
| COM-02 | Create design documents and architecture decisions that connect context, options, evidence, tradeoffs, risks, and validation. | P4 |
| COM-03 | Review code for correctness, clarity, risk, tests, security, performance, maintainability, and scope while distinguishing required changes from suggestions. | P4 |
| COM-04 | Respond to review by clarifying intent, testing disagreements, accepting corrections, and recording decisions without defensiveness or silent compliance. | P4 |
| COM-05 | Explain a technical system at beginner, practitioner, and expert depth, and state where each simplified mental model breaks down. | P4 |
| COM-06 | Communicate incident impact, current evidence, mitigations, unknowns, next actions, and resolution without speculation presented as fact. | P4 |
| COM-07 | Break work into estimable risks and milestones, raise blockers early, ask for help with useful context, and escalate when authority or expertise is needed. | P3 |
| COM-08 | Participate in technical design review, defend choices, revise from evidence, and identify decisions that need owners outside engineering. | P4 |
| COM-09 | Coordinate a bounded change with another contributor or assessor: agree interfaces and ownership, integrate concurrent work, resolve a substantive disagreement, and complete a usable handoff while preserving individual evidence. | P3 |

#### Required Practical Evidence

- A review of another developer's pull request with prioritized, technically supported comments and a fair distinction between defects and preferences.
- A design defense in which new constraints are introduced and the graduate either adapts the design or explains why the original remains valid.
- A runbook used by another learner to diagnose or operate the system without oral rescue from the author.
- An incident update and postmortem written for both technical and nontechnical readers.
- A collaborative change and handoff with a real peer or assessor, including interface negotiation, integration checks, feedback, and attribution. An AI role-play can provide practice but is labeled simulated and cannot alone establish human-team collaboration.

#### Common Failure Patterns

- Using length, jargon, or diagrams as a substitute for a clear decision and evidence.
- Presenting estimates as promises without assumptions, risk, confidence, or a plan to reduce uncertainty.
- Giving style feedback as a blocker while missing behavior, security, data, or operational risk.

**Depth boundary:** The standard covers communication required to own engineering work. People management, formal program management, and executive communications are outside the graduation claim.

### AIE AI Assisted Engineering and Verification

Graduates may use AI tools as accelerators while retaining ownership of requirements, reasoning, verification, security, and attribution. They can recognize when generated output is plausible but wrong, outdated, unsafe, or inconsistent with the codebase.

**Graduation expectation:** P3 with P4 verification judgment

| **ID** | **Graduate outcome** | **Target** |
| --- | --- | --- |
| AIE-01 | Choose appropriate AI assistance for explanation, exploration, test ideas, code generation, review, migration, debugging, and documentation under stated assessment rules. | P3 |
| AIE-02 | Provide relevant context, constraints, versions, interfaces, examples, and acceptance criteria without exposing protected data or credentials. | P3 |
| AIE-03 | Verify generated claims and changes against primary documentation, repository behavior, tests, types, security boundaries, and observed runtime evidence. | P4 |
| AIE-04 | Detect fabricated APIs, obsolete guidance, invented citations, silent requirement changes, overbroad edits, insecure patterns, and tests that only confirm generated assumptions. | P4 |
| AIE-05 | Keep generated changes reviewable; trace, explain, test, debug, and safely modify the behavior being accepted; identify dependency and generated-file boundaries, preserve required provenance, and disclose assistance. | P3 |
| AIE-06 | Work effectively when AI help is restricted, unavailable, or deliberately limited to graduated hints during an assessment. | P3 |
| AIE-07 | Use AI critique without surrendering judgment; resolve disagreements through evidence and escalate high risk decisions appropriately. | P4 |

#### Required Practical Evidence

- A generated implementation containing subtle API, security, or requirement defects that the graduate must identify, verify, and correct.
- An assistance log showing what help was used, how suggestions were validated, which suggestions were rejected, and what remained uncertain.
- A comparable task completed under restricted assistance to demonstrate that tool access is not masking missing foundational competence.

#### Common Failure Patterns

- Accepting output because it compiles, sounds confident, or includes citations that were not opened and checked.
- Submitting generated code that the graduate cannot trace, test, explain, debug, or safely modify.
- Providing secrets, personal data, proprietary source, or regulated information to a tool without an approved data boundary.

**Depth boundary:** The standard does not prescribe one vendor or interface. It assesses durable judgment about AI assisted work and independent verification.

## 6 Graduation Assessment

### Graduation Gates

Graduation requires all gates below. A strong capstone cannot compensate for unsafe authorization, inaccessible interfaces, inability to debug, or a delivery process the learner cannot explain. Remediation creates new evidence; it does not rewrite the historical record.

| **Gate** | **Assessment** | **Required performance** | **Primary coverage** |
| --- | --- | --- | --- |
| G1 | Mental models | Explain and predict core programming, browser, HTTP, data, security, container, and reliability behavior without solution search; combine with practical evidence elsewhere. | Conceptual indicators supporting required targets; this gate alone does not establish P3 implementation |
| G2 | Existing codebase change | Map an unfamiliar repository, implement a bounded cross-layer feature, preserve contracts, and respond to review. | ENG GIT PRG DSG WEB FEN BEN DAT TST COM |
| G3 | Debugging and incident | Investigate an intermittent production style failure with incomplete and misleading evidence, mitigate it, and write the record. | ENG NET OBS REL plus affected technical domain |
| G4 | Data and performance | Diagnose a query, transaction, connection, cache, or workload problem using plans and measurements, then verify the improvement. | DAT DIS OBS TST |
| G5 | Security assessment | Find, safely demonstrate, repair, and regression test an authorization or application security defect in an authorized target. | SEC WEB BEN FEN DAT TST |
| G6 | Delivery and operations | Containerize, deliver, deploy, observe, and recover an application using infrastructure code and a controlled real cloud environment; also demonstrate actual Kubernetes workload deployment and diagnosis in a local or controlled cluster. These may share a scenario. | LNX CTR CIC CLD KUB OBS REL |
| G7 | System design and judgment | Design and defend a system from an ambiguous brief, including constraints, data, security, failure, scale, cost, and alternatives. | PRD ARC SEC DAT REL COM |
| G8 | Capstone build | Deliver a production style product with the required engineering artifacts and verified user journeys. | All core domains represented |
| G9 | Capstone change and failure | Address a material requirement change, a scale or capacity constraint, an operational incident, and a security or integrity review. A combined scenario may cover several events if each is observed. | P4 transfer and adaptation |
| G10 | Engineering review | Explain and defend the capstone, respond to code and design review, reproduce key evidence, and identify remaining risk. | Authenticity independence and communication |
| G11 | Heroic investigation | Attempt a problem beyond directly taught material and submit the research, experiments, conclusions, missing insight, and next plan. | Process evidence required; full solution optional |

Gates are evidence requirements, not necessarily eleven separate examinations. Publish an assessment blueprint mapping individual indicators to scenarios, observations, help policy, provenance, recency, and decision authority. Reuse capstone and project evidence where valid, but retain fresh unfamiliar work and individual attribution. Finishing every gate title does not imply that every competency indicator has been observed.

### Critical Requirements That Cannot Be Averaged Away

The following rules define the noncompensable graduation boundary. Apply a rule only when its behavior is in the assessed scope and directly supported by evidence. A single corrected mistake during learning is not a permanent disqualification. An unresolved material defect or repeated unsafe practice prevents readiness until remediation and a fresh verification demonstrate the missing behavior.

| Rule | Competency coverage | Blocking behavior | Required closure and gate |
| --- | --- | --- | --- |
| NC-01 Identity and isolation | SEC-02, SEC-03, SEC-06, WEB-04 | A protected action or tenant resource remains accessible without the required validated identity and permission. | Verify relevant allowed and denied paths, ownership boundaries, and regression protection; G5 and G8. |
| NC-02 Input and secrets | SEC-04, SEC-05, SEC-08, SEC-10, BEN-07 | An in-scope exploitable input path, exposed real credential, unnecessary sensitive-data exposure, or overbroad privilege creates material unresolved risk. | Contain exposure, fix the root boundary, verify alternatives, and document remaining risk; G5, G6, or G8 as applicable. |
| NC-03 Data integrity and recovery | DAT-03, DAT-06, DAT-07, DAT-08, REL-02, REL-04 | Required invariants fail under specified concurrency, duplicate work, migration, or recovery conditions; a required restore cannot be demonstrated. | Reproduce the failure safely and verify invariants, migration compatibility, and recovery against the scenario; G4, G6, or G8. |
| NC-04 Essential interface access | UI-01, UI-02, UI-05, UI-07, FEN-06 | A critical supported user journey cannot be completed through required keyboard or assistive-technology interaction. | Repair the flow and verify the entire affected task manually with supported assistive technology; G8 and G10. |
| NC-05 Safe change and incident handling | GIT-04, CIC-03, CIC-05, CLD-04, REL-05, REL-08 | Destructive or incident actions exceed authorization, target the wrong environment, ignore stop conditions, or lack the recovery required by the scenario. | Safely contain the issue and demonstrate target confirmation, controlled change, mitigation, and recovery; G3 and G6. |
| NC-06 Authorized practice and evidence integrity | SEC-09, ENG-07, AIE-05, COM-09 | Testing goes outside authorization or material evidence is deliberately falsified or unattributed after clarification. | Stop unsafe actions; obtain qualified human review, distinguish misunderstanding from deliberate misconduct, and provide a fair appeal and reassessment policy; any gate. |

Critical behavior receives a qualified human decision with artifact inspection and observed local performance or a fresh accessible verification task appropriate to the claim. Automated flags are allegations to verify, not automatic misconduct findings. Publish concrete scenario-specific failure examples before assessment. Safety support is never withheld because the underlying concept has not yet been taught; stop, explain, and remediate without inventing an untaught grading criterion.

### Capstone Product Requirements

The capstone is a substantial product, not a tutorial replica. It begins with a product brief and incomplete requirements. The learner must discover rules, choose an architecture, build the system, operate it, and defend the resulting decisions. The problem should be large enough to expose tradeoffs but bounded enough that one learner can complete it with sustained effort.

- Multiple users or organizations with authentication, authorization, account lifecycle, and at least one sensitive workflow.
- A relational data model with explicit invariants, migrations, realistic queries, indexes, transactions, backups, and a demonstrated restore.
- A substantial accessible frontend with navigation, forms, data states, errors, responsive behavior, and measured performance.
- A backend with coherent APIs, validation, business rules, error semantics, idempotency where required, and bounded resource use.
- At least one asynchronous workflow such as a queue, scheduled job, webhook, email, or event, including duplicate and failure handling.
- File or object storage, caching, search, and realtime behavior when the problem justifies them. The learner may omit an unnecessary subsystem by defending the simpler choice, but must still demonstrate all required related competencies in other labs or projects; an architectural omission is not a curriculum exemption.
- Unit, integration, end-to-end, accessibility, security, and performance evidence proportionate to risk.
- Containerized local development, reproducible setup, continuous integration, versioned artifacts, deployment, verification, rollback or roll-forward, and environment documentation.
- Infrastructure as code and a controlled cloud environment. Kubernetes must be demonstrated during the program, but the capstone may use a simpler runtime if the learner justifies it.
- Structured logs, metrics, traces where useful, dashboards, alerts, service indicators, and a runbook that supports an introduced incident.
- Architecture and data diagrams, API specification, threat model, architecture decision records, testing strategy, migration plan, operational plan, and cost considerations.
- A reviewable Git history showing incremental work, feedback, revisions, and recovery rather than a single unexplained final snapshot.

Publish a bounded mandatory feature set, quality budgets, expected effort range, milestone review points, and exclusions before the capstone starts. Optional sophistication cannot raise the passing threshold retroactively. Small focused ADRs and runbooks are preferable to a paperwork quota; each required artifact must answer a concrete engineering or assessment question. After a walkthrough or provided recovery snapshot, require fresh transfer evidence for any affected independence claim.

### Capstone Changes and Incidents

After the first credible release, the assessment introduces changes that make earlier assumptions visible. The exact scenarios vary to reduce memorization, but the assessment must include a requirement change, a scale or capacity constraint, an operational failure, and a security or data integrity review. These need not be four unrelated projects; document which observations satisfy each requirement. A scale review may conclude that no new infrastructure is needed if measurements justify that decision.

| **Scenario** | **Assessment character** |
| --- | --- |
| Requirement change | Examples include retention, organization ownership, audit, localization, offline behavior, recovery window, or a new external integration. |
| Scale change | Traffic, data volume, concurrency, file size, fan out, geographic latency, or cost changes enough to challenge one current design. |
| Production incident | A realistic symptom is introduced with logs, metrics, history, user reports, and noise. The learner must triage, mitigate, repair, and document. |
| Security or integrity finding | An authorization, input, secret, dependency, migration, concurrency, or tenant isolation weakness must be assessed and corrected. |
| Design review challenge | The reviewer proposes an alternative or new constraint. The learner must adapt the design or defend the current one from evidence. |

### Final Readiness Decision

- All graduation gates are complete, and all noncompensable safety and integrity requirements are satisfied.
- Every required competency and its material indicators meet the assigned depth and P target; domain summaries cannot substitute for indicator coverage. Core P3 and P4 targets have the independent and transfer evidence specified in Section 2. Working targets remain required, and awareness topics meet explanation and escalation requirements.
- The learner can reproduce important results, trace submitted work, explain assistance used, and respond to questions that were not known in advance.
- No unresolved recurring misconception creates material risk in authorization, data integrity, accessibility, deployment, incident handling, or professional safety.
- A qualified human assessor signs the graduation decision, resolves critical flags and appeals, and records evidence provenance, remaining uncertainty, and development areas. A learning-only automated report must be labeled differently. The availability, qualifications, cost, and scheduling of this role remain product decisions to validate before offering verified graduation.

A learner who is not yet ready receives a competency specific remediation plan and another opportunity to produce evidence. The plan identifies the missing behavior, the scenario that will test it, the assistance rules, and the standard for reconsideration.

## 7 Curriculum and Assessment Governance

### Traceability Rules

| **Link** | **Rule** |
| --- | --- |
| Competency to curriculum | Every competency maps to concepts, prerequisites, lessons, exercises, projects, and at least one assessment opportunity. |
| Lesson to purpose | Every lesson identifies the competency it develops and the later context in which the learner must reuse it. |
| Exercise to evidence | Every exercise states what is observable, the permitted tools, difficulty, assistance policy, rubric, and failure modes. |
| Rubric to outcome | Every scored dimension corresponds to taught or intentionally research based work. The reviewer does not penalize concepts the learner has not been expected to know. |
| Evidence to decision | Every competency state cites artifacts and observations sufficient for another qualified reviewer to understand the judgment. |
| Standard to version | Changes to the competency standard identify affected curriculum, assessments, existing evidence, and transition rules. |

Use a prerequisite graph of specific concepts at a stated depth, with hard prerequisites, suggested background, co-requisites, and later revisits explicitly distinguished. Only hard prerequisites must form an acyclic graph. Sequence from demonstrated readiness, not lesson completion alone. Plan the whole program at module level, but expand lesson-level dependencies and rubrics just ahead of the content being validated.

The registry must explicitly expand domain depth defaults and exceptions, performance targets, critical-rule references, and required evidence into each competency record. Preserve stable parent IDs and add separately addressable indicators for compound outcomes. Do not infer an unstated requirement from an AI reading of prose. Automated checks must flag missing coverage, unknown IDs, invalid help levels, inconsistent versions, hard-prerequisite cycles, and gates with no observable assessment. A machine-readable export is not itself a validated syllabus.

### Authoring Requirements

- Begin with the learner's current prerequisite graph. Do not explain one concept by silently depending on several concepts that have not been introduced.
- State the useful approximation and the point at which it becomes misleading. Replace it with a more accurate model before advanced exercises rely on the hidden detail.
- Include concrete observation through code, tools, traces, queries, packets, diagrams, or system state where the concept has observable mechanics.
- Create unit exercises throughout the lesson, followed by cumulative and transfer exercises later. Avoid a large reading block followed by one memory quiz.
- Include realistic failure modes, invalid approaches, and alternatives. At higher difficulty, add noise without making the task depend on an arbitrary trick.
- Provide graduated hints and a complete teaching path. Each hint should preserve a meaningful decision for the learner when possible.
- Define what a good unsuccessful investigation looks like, especially for Expert and Heroic challenges.
- Use professional tools and artifacts at the point where the learner can understand them. Educational wrappers may support setup, but must not replace required professional fluency.

### Content and Project Release Requirements

Each released unit needs stable IDs, prerequisites, outcomes, expected effort, supported environment, source references with review dates, lesson material, exercises, hint levels, worked explanations, rubric anchors, valid alternatives, and later practice links. Author-written reference solutions and lab fixtures are tested in a controlled authoring environment before release; this is distinct from executing arbitrary learner submissions. AI-generated lessons, hints, tests, and assessments remain drafts until technically and pedagogically reviewed.

Keep the explanation, exercise, rubric, starter code, fixture data, hints, reference solutions, and environment manifest in one compatible release manifest. Document deterministic reset steps, intentional defects, non-defect noise, expected observations, cleanup, and solution exposure. Curated published lessons should be stable; generated tutor explanations must be labeled and tied to approved curriculum context, with a correction path.

Use several cumulative projects with tagged starting states, milestone checkpoints, migration paths, and rescue snapshots. A learner can recover from a broken project or join at a demonstrated milestone without replaying the entire course. Record when supplied patches or solutions affect independence. Mix these evolving systems with fresh unfamiliar repositories so competence is not inferred only from familiarity with one codebase. Release starter and reference materials under clear permissions and record third-party dependencies and licenses.

### Representative Learning Slices

Validate an end-to-end learning slice before mass authoring or platform implementation. A bounded HTTP request and conditional-cache investigation is a candidate, using prerequisites already demonstrated by its learners: basic JavaScript, terminal use, a local server, browser network tools, and Git. Include explanation, prediction, local experiments, a small change, a seeded defect, a source submission, an evidence-based review, revision, and a fresh transfer task. Do not force TLS operations, databases, Kubernetes, cloud, and every security topic into this first module.

One HTTP module cannot validate the whole program. Pair it with a beginner onboarding mini-slice testing setup and first-program comprehension, and a small advanced operational or authorized security-lab probe testing containment, environment evidence, and assessor observation. These are risk probes, not three complete courses. Test authoring effort, learner friction, accessibility, hint behavior, review correctness, and cost before expanding.

Learning experiments can start with files, a prototype, and qualified manual review. A polished application is not a prerequisite for finding out whether learners understand a lesson or reviewers agree. Use pilot participants and explicit consent; manufactured example submissions test software behavior but do not establish learning effectiveness.

### Reviewer Calibration

- Use anchored examples of not-yet-meeting, developing, strong, and adaptive work for each recurring exercise family; separately include cases where evidence is insufficient to judge.
- Blindly compare a sample of reviews from different assessors and automated reviewers; resolve systematic disagreement in the rubric or training material.
- Require technical claims in feedback to point to code, requirements, evidence, or an explicit model. Generic praise and unsupported deductions are not acceptable review.
- Separate correctness, reasoning, security, performance, maintainability, testing, accessibility, and requirements compliance. Score only dimensions relevant to the exercise and curriculum stage.
- Audit whether feedback teaches at the learner's current level and whether hints reveal more than their recorded assistance category permits.
- Escalate uncertain, high stakes, or contested graduation decisions to qualified human review.

Build a human-adjudicated evaluation set containing correct alternatives, near misses, serious defects, incomplete submissions, misleading test reports, novice mistakes, and instructions hidden in source comments. Keep a held-out set separate from prompt tuning and demonstrations. Compare reviewers on the same source and rubric version, repeat selected cases for consistency, and use fresh variants to detect answer memorization. The reference solution is one valid implementation, not a template every learner must match.

Before a review model or rubric is promoted, measure critical false passes, erroneous rejection of valid solutions, unsupported findings, correct abstention, assistance leakage, agreement with qualified reviewers, accessibility, latency, and total review effort. Publish acceptance criteria before examining held-out results. Report sample size and uncertainty; zero observed errors in a small sample is not proof of safety. A model must not be its own sole source of ground truth. Until calibration supports automation, constrain it to advisory review and require human decisions for consequential outcomes.

The application should preserve exercise, rubric, curriculum, source, environment, reviewer, and policy versions. Reviews must distinguish directly visible defects, conditional risks, stylistic suggestions, and unverifiable claims. Findings cite the applicable requirement and artifact location; absence of a file or lack of runtime access must be disclosed. Human review, moderation, support, and appeals are operational work to budget, not unspecified emergency features.

### Curriculum Analytics

Analytics should improve the curriculum, not merely rank learners. Repeated failure by otherwise strong learners can indicate an unclear explanation, a hidden prerequisite, a misleading exercise, a broken environment, a biased rubric, or an assessment that does not measure its stated competency.

| **Area** | **Signals to examine** |
| --- | --- |
| Learning | Attempt paths, misconceptions, hint use, time to first useful hypothesis, transfer performance, and retention. |
| Exercise quality | Unexpected failure clusters, unclear requirements, environmental defects, low reviewer agreement, and solution leakage. |
| Review quality | Feedback accuracy, actionability, consistency, unsupported claims, concept level mismatch, and appeal outcomes. |
| Equity and access | Differential outcomes by environment, accessibility need, language, bandwidth, hardware constraint, and prior experience where collection is lawful and appropriate. |
| Program validity | Graduate performance on fresh scenarios, employer or mentor observations, later incident handling, and competencies that decay without practice. |
| Feasibility | Active learner effort, setup failures, dropout and pause reasons, authoring and maintenance hours, reviewer minutes, model retries, storage, lab costs, and cost per independently demonstrated outcome. |

Distinguish learning and transfer from satisfaction, engagement, completion, and time spent. Establish baseline or pre-task evidence and later fresh checks; acknowledge selection effects and small pilot samples. Collect only the telemetry needed for these questions. Do not turn help-seeking, disability accommodations, or careful investigation time into negative ranking signals.

### Versioning and Change Control

- Assign stable identifiers to competencies and version changes to outcomes, target levels, evidence rules, and graduation gates.
- Review the standard on a regular cadence and when major shifts in professional practice materially change the target role.
- Do not add a technology merely because it is popular. Identify which competency or market expectation it changes and what existing content it replaces or deepens.
- Publish transition rules for active learners. Do not invalidate prior evidence silently or require new specialist depth without a revised graduate claim.
- Maintain a decision log for major scope changes, including reasons, rejected alternatives, affected assessments, and a future review trigger.

The human-readable standard remains canonical for outcomes and assessment policy. The structured registry may own curriculum mappings and indicator detail, but must mark these fields as registry-owned; shared fields are generated from the standard or updated through a single reviewed change. Preserve source hashes and compatibility checks. Never round-trip a stale DOCX into the canonical Markdown. Record migrations when evidence schemas change; do not silently reinterpret legacy assistance codes.

### Accessibility and Fairness

- Learning materials, platform workflows, code review, and assessment artifacts must be accessible to keyboard and assistive technology users.
- Assessment accommodations may change time, presentation, input mode, or environment while preserving the behavior the competency is intended to measure.
- Language fluency, typing speed, visual polish, and familiarity with one vendor must not substitute for the technical outcome unless explicitly part of the competency.
- Learners must be able to challenge an inaccurate automated review and receive a reasoned reconsideration with preserved evidence.
- Collection of learner telemetry must be proportionate, explained, protected, retained for a defined period, and excluded from unrelated surveillance or ranking uses.

Set WCAG 2.2 AA as the proposed product accessibility target, covering complete learner and author/reviewer workflows rather than a favorable score on one page. Include authentication, lessons, code/diff navigation, uploads, feedback, assistance, appeals, and progress; provide captions or transcripts and textual alternatives for visual evidence. Verify with automated checks and manual keyboard and screen-reader testing, and document exceptions and remediation. WCAG conformance applies to complete processes and cannot be established by automated scoring alone. This is a design target, not a current conformance or legal-compliance claim. [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Define submission ownership, consent, retention, export/deletion, review-provider data handling, and access roles before collecting real learner source or telemetry. Do not reuse student submissions to train models, publish examples, or expand an evaluation corpus without an explicit approved purpose and permission. Jurisdiction-specific obligations and age restrictions require appropriate review before a public launch; this document does not supply legal conclusions.

## 8 Artifact Roadmap

This standard is a foundation, not the syllabus, lesson library, assessment implementation, or application specification. The work proceeds in staged increments: enough curriculum structure to guide a representative learning experience, early risk tests and product constraints in parallel, then detailed specifications and incremental content releases. The exhaustive eventual course, the first content release, and the software MVP have different scopes.

| **Order** | **Artifact or decision** | **Completion test** |
| --- | --- | --- |
| 1 | Provisional scope and risk register | Adopt the reviewed standard as a hypothesis; record audience, role calibration, workload, verification, human-review capacity, device/cost access, and privacy assumptions with owners and validation methods. No public readiness promise yet. |
| 2 | Curriculum Architecture v1 | Produce the complete module-level syllabus outline, coverage matrix for all 206 competencies, domain depths, thin prerequisite graph, cumulative project lines, milestone gates, and effort-estimation method. Expand detailed indicators and lesson dependencies for the first slices only; explicitly mark remaining detail as pending. |
| 3 | Assessment and content contracts | Define lesson/exercise templates, assessable indicators, H-level hints, rubric anchors, provenance, trusted context, review outputs, resubmission, and appeals. Test sample findings against qualified judgments before relying on AI assessment. |
| 4 | Early product and safety specification, in parallel with steps 2 and 3 | Define learner/author/reviewer journeys, accessible wireframes, supported devices, evidence boundaries, threat model, data lifecycle, costs, and MVP non-goals. Prototype interactions without locking a stack. |
| 5 | Representative content and feasibility trials | Deliver the bounded HTTP slice, beginner mini-slice, and operational/safety probe. Test with learners and qualified reviewers; measure comprehension, fresh transfer, setup, effort, feedback accuracy, accessibility, and practical verification. |
| 6 | Revise and approve the first release specification | Use trial evidence to revise role targets, workload, rubrics, templates, and UX. Define the first content release and software MVP separately; set release gates and resolve authority, human-review, and lab-funding decisions. |
| 7 | Detailed app and technical specifications | Specify workflows, state transitions, roles, authorization, domain model, APIs, storage, review jobs, authoring/versioning, observability, nonfunctional budgets, test strategy, and deployment/operations with acceptance criteria. Choose technologies from these needs. |
| 8 | Build and test a private MVP | Support curated content, course-owned project downloads, allowlisted text submission with preview, queued review, conversation/resubmission, disclosed help, evidence-linked progress, manual review/appeal, and minimal versioned authoring. Test access isolation, hostile inputs, failures, and recovery. No arbitrary learner-code execution. |
| 9 | Limited learner pilot | Verify real learning and delayed transfer, review reliability, operational costs, accessibility, support, and safe labs. Expand only when published acceptance criteria are met; keep graduation claims within observed evidence. |
| 10 | Scale curriculum and integrations incrementally | Release validated modules and projects with maintenance owners. Add archives or repository ingestion only after separate safety validation, then an editor extension if it solves measured friction. Optional MCP follows a proven learning and evidence workflow. |

### Decisions Reserved for Later Artifacts

Before recruiting a pilot, decide the initial learner profile, supported environment, effort and cost bounds, permitted data, reviewer and observer responsibilities, and whether the pilot offers learning feedback only. Before implementing a production platform, approve retention, authorization, service budgets, support/appeals ownership, and the review model evaluation policy. These are not details to defer until after launch.

Exact total duration, final lesson count, cloud provider, supported framework versions, project themes, commercial pricing, public credential language, and editor/MCP integration remain provisional. Estimate progressively and document assumptions; do not invent schedule certainty without authoring and learner data. The next deliverable is Curriculum Architecture v1, alongside a small risk and assessment experiment plan, not hundreds of finished lessons or a full website.

## Appendix A Explicit Depth Assignments

These are normative draft assignments for the bounded role, subject to role calibration. A domain default applies to every competency row in that domain unless an exception is listed. The performance target in Section 5 still controls: working depth does not waive a P3 or P4 independence requirement, and critical safety rules apply at any depth. The registry must materialize these assignments per competency rather than ask reviewers to infer them.

| Domain | Default depth | Exceptions |
| --- | --- | --- |
| ENG | Core | None |
| SYS | Core | SYS-02: Working |
| LNX | Core | None |
| PRG | Core | None |
| DSA | Core | None |
| GIT | Core | None |
| NET | Core | NET-03: Working |
| BRW | Core | None |
| UI | Core | UI-08: Working |
| FEN | Core | FEN-04: Working |
| BEN | Core | None |
| WEB | Core | None |
| DAT | Core | DAT-09: Working |
| DIS | Working | DIS-01: Core; DIS-02: Core |
| SEC | Core | None |
| TST | Core | TST-05: Working |
| DSG | Core | None |
| ARC | Core | ARC-04: Working |
| CTR | Core | None |
| CIC | Core | None |
| CLD | Working | CLD-03: Core; CLD-04: Core |
| KUB | Working | None |
| OBS | Core | OBS-03: Working |
| REL | Core | REL-08: Working |
| PRD | Core | PRD-06: Working |
| COM | Core | None |
| AIE | Core | None |

The 206 competency rows remain demanding, and many contain several behaviors. This classification makes the investment explicit; it does not prove the workload is feasible. Calibrate P4 tasks against bounded mid-level work, sample assessable indicators, and measure authoring and learner effort before committing duration or expanding the credential claim. Keep real cloud and Kubernetes operation; reduce redundant assessment and optional specialist detail before removing essential practice.

### Awareness Topic Register

These specialist boundaries are P1 orientation topics, separate from the 206 practical competency IDs. Their stable `AW-*` identifiers must be included in the curriculum coverage map. Each requires a brief explanation of purpose, limits, and when to seek specialist help, not an implementation lab or a hidden P3 gate.

| Topic ID | Boundary topic | Awareness outcome |
| --- | --- | --- |
| AW-SYS | Kernels, compilers, runtime implementation, hardware | Recognize which layer owns a limitation and when application-level debugging is insufficient. |
| AW-LNX | Fleet administration and operating-system hardening | Distinguish ordinary service operation from specialist administration and security responsibility. |
| AW-DSA | Advanced algorithms and formal complexity theory | Recognize when common techniques do not fit and how to investigate without claiming specialist mastery. |
| AW-NET | Carrier routing and protocol implementation | Distinguish application networking from routing infrastructure and protocol engineering. |
| AW-BRW | Browser and framework engine implementation | Explain what application abstractions hide and when source investigation or specialist help is justified. |
| AW-DAT | Database engines and large replication topologies | Recognize engine, durability, replication, and administrative concerns beyond the application owner's scope. |
| AW-SEC | Cryptanalysis and advanced exploit development | Explain why vetted primitives and authorized specialist review are required; no advanced exploitation deliverable. |
| AW-ARC | Consensus protocols and global distributed infrastructure | Recognize consistency and failure questions that exceed a bounded product-system design. |
| AW-CLD | Large multi-account, multi-region, and hybrid estates | Identify governance and failure concerns requiring platform and security specialists. |
| AW-KUB | Cluster lifecycle, control-plane, and fleet engineering | Separate application workload ownership from operating Kubernetes as a platform. |
| AW-OBS | Organization-wide telemetry and advanced performance science | Recognize when instrumentation and application profiling no longer answer the question. |
| AW-COM | Multi-team leadership and organizational strategy | Distinguish independent feature ownership from senior organizational accountability. |

## Appendix B Evidence Record Schema

Every substantive exercise, review, or project milestone should emit structured evidence. This table defines the semantic contract; the assessment specification must provide a validated serialization schema. Do not mistake this draft table for an implemented API.

| Field | Required content |
| --- | --- |
| `evidence_id`, `schema_version` | Stable record ID, append-only revision identity, schema version, creation time, and superseded record where applicable. |
| `learner_id`, `program_version` | Authorized learner identity and the applicable standard, curriculum, assessment, and environment release. Use pseudonymous IDs in analytics. |
| `scenario` | Exercise and rubric IDs/versions, baseline source hash, attempt ID, learning-episode ID, difficulty L1 to L6, expected conditions, and any changed-context or fresh-variant identifier. |
| `claims[]` | Competency and indicator IDs, assigned depth, target P level, behavior actually demonstrated, claimed P level, and supporting artifact or observation references. No automatic credit from a domain name. |
| `artifacts[]` | Source snapshot or diff plus baseline, included and missing context, content hashes, file locations, ownership/access classification, and immutable evidence references. |
| `environment` | OS, architecture, runtime, dependencies/lockfile, container or cloud identifiers without secrets, fixture version, configuration assumptions, and deviations. |
| `help_events[]` | Time/order, source of help, disclosed content, H level, affected indicators, collaborators, reference use, retained generated material, and solution-exposure status. Derive maximum H per claim. |
| `observations[]` | What was directly observed versus inferred or learner-reported; sequence, hypotheses, experiments, revisions, explanation, observer role, and consented observation reference where relevant. |
| `verification[]` | Exact command or verification task, linked source/environment, raw result, timestamp, deviations, and provenance enum: static_artifact, learner_reported_execution, corroborated_execution, or observed_performance. |
| `criterion_results[]` | Criterion ID, met/not_met/insufficient_evidence/needs_review, evidence-based reason, severity, missing context, reviewer confidence with rationale, and acceptable alternatives considered. Confidence is not a learner grade. |
| `critical_findings[]` | NC rule, affected behavior, verified impact or unresolved allegation, containment, qualified reviewer decision, remediation, and fresh verification. No automated misconduct verdict. |
| `decision` | Target achievement and descriptive competency state separately, evidence counted or excluded with reasons, recency/reassessment triggers, remediation, transfer opportunity, and authorized decision maker. |
| `review_provenance` | Reviewer identity or model version, prompt/policy version, rubric, evaluation release, review time, finding references, human sign-off where required, and appeal history. |
| `data_lifecycle` | Submission permissions, access scope, approved reuse, retention expiry, export/deletion rules, redaction history, and limits on preserving attempt history. |

Store one learning episode only once for evidence-count purposes even when it has several revisions or reviews. Preserve history only within the published retention and access policy. When records are migrated, retain the original help semantics and explicitly mark records requiring manual interpretation; do not manufacture missing provenance.

## Appendix C Rubric Anchors

| **Anchor** | **Observable standard** |
| --- | --- |
| Not yet meeting the criterion | Sufficient evidence shows a material error, unsafe behavior, or missing capability under the stated conditions. Explain the defect and remediation; walkthrough-dependent success does not establish an independent criterion. |
| Developing | The central approach is plausible and partly correct, but significant guidance, missing verification, narrow context, or a recurring misconception limits the claim. |
| Strong | The learner independently satisfies the requirement, verifies relevant behavior, handles expected failures, explains decisions, and produces maintainable evidence. |
| Adaptive | The learner sustains Strong performance under unfamiliar code, ambiguity, changed constraints, misleading evidence, or competing tradeoffs and explains residual risk. |

Rubrics may add dimension specific anchors, but they should preserve these meanings. A polished explanation cannot compensate for unsafe code, and a working result cannot compensate for an inability to explain, verify, or modify the work when authenticity is in question.

Insufficient evidence is a review status, not a low-performance anchor. Abstain when context, provenance, or verification is inadequate; state what would resolve it. A learner who requests instruction is learning with help, not automatically demonstrating inability. Formal target decisions use the stated P level, H policy, conditions, and evidence rules together.

## Appendix D Key Terms

| **Term** | **Definition** |
| --- | --- |
| Competency | A stable, observable capability that combines relevant understanding, practical performance, diagnosis, explanation, and judgment. |
| Evidence | An artifact plus observations and context that support a claim about a competency. |
| Independent | Completed without solution-specific hints, while normal professional references may remain available under the assessment policy. |
| Adaptive | Independent performance maintained when context, requirements, evidence, or constraints change. |
| Noncompensable | A requirement whose material failure cannot be averaged away by strength elsewhere because it creates unacceptable risk. |
| Transfer | Application of a learned capability in a meaningfully different problem, codebase, tool, or set of constraints. |
| Heroic challenge | An intentionally above target problem in which research and experimentation are expected and process evidence remains valuable without a complete solution. |
| Professional environment | The real tools, workflows, artifacts, and failure modes used in ordinary engineering practice rather than a simplified in browser substitute. |
| Authorized security lab | A local, course-owned, or explicitly permitted target with defined scope, data, safety controls, and remediation goals. |
| Graduate claim | The bounded statement this program can responsibly make about a learner who satisfies every gate in this standard. |

## Appendix E Revision and Validation Notes

Version 1.1 reviews the original plan and standard without changing the commitment to extensive full-stack education, real professional tools, continuous unit practice, unfamiliar code, controlled failures, authorized security labs, cumulative projects, and Heroic research challenges.

- Retained all 201 original competency IDs and their P targets; added PRG-09, PRG-10, DAT-10, OBS-09, and COM-09 to make missing fundamentals and collaboration explicit. There are now 206 practical competency rows across 27 domains, plus 12 separately identified awareness topics.
- Assigned depth, clarified compound outcomes, defined six critical rules, corrected gate inconsistencies, and separated demonstration counts, independence, context, confidence, and provenance.
- Replaced the conflated A-level assistance model with H0 to H5 and documented migration under schema version 2.0. Document version 1.1 and evidence schema version 2.0 serve different purposes.
- Added beginner entry paths, recovery, workload/cost/access constraints, explicit content releases, human calibration, verified-graduation boundaries, submission security, local-lab containment, and review-provider privacy requirements.
- Revised the roadmap to validate content, learner experience, assessment reliability, and safety early. Product discovery proceeds alongside curriculum architecture; detailed app architecture follows tested workflows.

Structural review checks identifier preservation and counts, target preservation, depth coverage, cross-references, Markdown structure, and incompatible policy wording. It does not establish teaching effectiveness, role equivalence, valid pass thresholds, working lab safety, legal compliance, accessibility conformance, or a functioning review engine. Those require the trials and implementation verification described in the roadmap. External sources cited inline support narrow technical corrections; they do not validate the proposed educational system.

## End of Standard

Version 1.1 is the reviewed design baseline for curriculum architecture and early validation. It is not the finished syllabus, instructional content, app specification, or evidence that the intended graduate outcome has been achieved.
