---
document_id: FSSE-LEARNING-DESIGN-002
version: "1.0.0"
date: "2026-09-11"
status: "Authoring correction and proposed lesson-level curriculum expansion"
audience: "Course owner, curriculum authors, reviewers, and AI authoring tools"
scope: "Beginner accessibility, teaching sequence, HTTP Lesson 1, prerequisite alignment, and content-related application changes"
base_documents:
  - "FSSE-CURR-001@1.0: Curriculum_Architecture_v1.md"
  - "UNIT-HTTP-001@1.0.0: representative-learning-package-v1/lessons/HTTP_Unit.md"
  - "representative-learning-package-v1/exercises/HTTP_Workbook.md"
  - "FSSE-APP-001@1.0: Application_Requirements_and_UX_Specification_v1.md"
companion: HTTP_Lesson_01_Student_Edition_v2.md
research_scope: "Focused review of research, research-informed guidance, and first-party HTTP teaching material; not a systematic review"
validation: "Source and content audit completed; learner testing and application integration remain pending"
---

# Learning design review and curriculum refinement

## 1. Decision

The existing HTTP material compresses an engineering investigation into a form that is being presented as introductory teaching. Its first lesson needs substantial redevelopment. More explanation is part of the correction, but the deeper change is to teach the necessary concepts before asking the learner to use them.

The course's intended entry audience is already a **motivated beginner with basic computer literacy**, as specified in Curriculum Architecture §2. A junior developer is a possible experienced entrant, not the assumed reader of every explanation. The course should develop a beginner into someone capable of independent professional work through progressively demanding instruction and evidence.

There is an important distinction between entering the whole course and entering a later module. M020 follows programming and browser foundations in the main sequence. That permits its later implementation work to use previously taught JavaScript. It does not justify requiring HTTP concepts before their introductory lesson.

This review provides two concrete results:

- A complete student-facing rewrite of the introductory lesson, with a developed café analogy, explicit technical mapping, worked messages, a diagram, practice, feedback, and a delayed recall prompt.
- An authoring standard and a proposed expansion of M020/M021 into teachable lessons, with prerequisite corrections and a migration map preserving the existing engineering exercises.

The new lesson is a **reference candidate**. We have not established its effectiveness with learners. The existing application still contains the earlier content; these documents are the reviewable basis for its content revision.

## 2. What the lesson labels should mean

The current labels mix different educational jobs. They should be separated in authoring and made clearer in the learner interface.

| Educational job | What belongs here | Suitable student-facing wording |
| --- | --- | --- |
| Build intuition | A familiar situation, explained in enough detail to expose the relevant relationships | Start with a familiar situation |
| Explain the actual system | Name the components, explain their responsibilities and interactions, and connect them to the earlier example | How the web does this |
| Demonstrate | Walk through a specific message, code example, or diagnostic procedure and explain the decisions | Follow an example |
| Practice | The learner predicts, interprets, runs, changes, builds, or investigates something appropriate to what has been taught | Try it yourself |
| Refine a mental model | Explain a particular mismatch between the analogy or simplification and the actual system | Make the model more precise |
| Study failure and tradeoffs | Explain how a technology, implementation, or configuration can fail, under what conditions, and how to investigate it | Investigate a failure / When would you use this? |

**“Technical reality” should mean the actual mechanism and its explanation. Hands-on exercises are how students observe and use that mechanism.** One cannot substitute for the other.

**The limits of an analogy are different from the shortcomings of a technology.** “The server follows a program instead of understanding a casual sentence” refines the café comparison. “A server is not running, so this request receives no HTTP response” is a failure scenario. Cache consistency and intermediary behavior require further concepts before either can be taught properly.

Use progressive explanations without requiring every learner to read three near-identical versions labelled by supposed intelligence or age. Start with accessible language, develop the model, and let terminology become more precise as it acquires meaning. Additional prerequisite explanations should be available where they are needed.

## 3. Findings in the current material

| Finding | Evidence in the available project | Why it matters | Correction |
| --- | --- | --- | --- |
| The analogy does not establish a useful scene | LS-HTTP-01 introduces a community desk and notice in three short sentences | The learner must infer both the unfamiliar setting and the mapping | Develop one recognizable encounter; explain what each participant needs, sends, receives, and does next |
| Technical terms arrive as a list | Method, target, headers, status, content, and multiple browser requests appear in the next paragraph | Knowing the names does not explain their roles | Introduce each term when it answers a question raised by the example; annotate a small complete conceptual exchange |
| Domain vocabulary is unexplained | The first command contrasts “HTML page” with “bulletin data” | This requires knowledge of both an application domain and web architecture | Define a bulletin as a short public notice; introduce a page versus structured data before asking the learner to distinguish them |
| Observation requires untaught knowledge | EX-HTTP-01 asks for `ETag`, `Cache-Control`, `Date`, and edit implications | The first practice task extends beyond the explanation | Split basic message observation from later caching observation |
| Code archaeology begins too early | Lesson 1 follows startup, scenario, resource selection, representation, tag calculation, and response branches | Several new abstractions compete with understanding a request | Teach the exchange first, then a small known server, then the existing unfamiliar implementation |
| The exit question reaches into a later lesson | Lesson 1 asks what a screenshot establishes about a conditional `304` | A prerequisite is being assessed before it is taught | Assess request/response roles and simple message interpretation; move the `304` question after conditional responses and client display layers |
| The module entry check consumes its own outcome | Curriculum §4 requires running/stopping the local server and inspecting a browser request before M020 | M020 is also where the local address/port and HTTP tool workflow are introduced | Separate entry checks from guided setup and later readiness checks |
| Concept placement is misleading | CP009 is introduced in M019; CP016 is introduced in M020 but listed among the HTTP unit's prerequisites | General browser familiarity becomes an assumed ability to inspect HTTP traffic; the local-server bridge is easy to omit | Keep general DevTools orientation in M019; teach HTTP Network inspection inside M020 after message interpretation |
| Conceptual understanding is tied to implementation prerequisites | CP010 depends on asynchronous handler tracing, browser inspection, and local processes | Someone can understand request/response without yet tracing Node.js | Give the introductory model its own prerequisites; attach code-tracing requirements to the code task |
| The reader hides the teaching sequence | `workspace.tsx` places imported material into First model / Technical reality / Where it breaks tabs | A categorization rule determines the order of learning instead of an authored sequence | Render ordered lesson sections with clear purposes and local navigation |
| The same advanced prompt appears beside every lesson | The reader asks about changing a body and sending the old entity tag, including on Lesson 1 | A caching assessment leaks into the introductory reading experience | Bind prompts to a lesson and its taught concepts; start with an appropriate question for that lesson |

These are content and sequencing defects. They do not invalidate the goal of using real repositories, version control, local execution, or comprehensive engineering assessments.

## 4. What the research contributes

The following sources offer relevant evidence or teaching frameworks. The proposed course changes are our applications of that evidence, not findings that these sources tested this platform, this analogy, or our target outcome.

### 4.1 General learning and teaching

| Source | What it supports | Limitation | Application to this course |
| --- | --- | --- | --- |
| [IES / What Works Clearinghouse: Organizing Instruction and Study to Improve Student Learning](https://ies.ed.gov/ncee/WWC/PracticeGuide/1), 2007 | The guide rates alternating worked examples with problems, connecting concrete and abstract representations, combining graphics with explanations, and spacing learning as supported by moderate evidence. It rates retrieval through quizzes and deep explanatory questions as strong. Its evidence rating for introductory prequestions is minimal. | These are the guide's ratings across educational settings, not effect estimates for this course. A prediction question is not automatically equivalent to a well-designed retrieval task. | Demonstrate a small exchange, ask the learner to explain a related one, supply explanatory feedback, and revisit the concept later. Pair each diagram with a nearby explanation. |
| [NSW CESE: Cognitive load theory in practice](https://education.nsw.gov.au/about-us/education-data-and-research/cese/publications/practical-guides-for-educators/cognitive-load-theory-in-practice) | This practical synthesis recommends adjusting instruction to prior knowledge, using worked examples, gradually increasing independent problem solving, removing unnecessary information, and keeping related essential information together. | It is an instructional guide with school-based examples. It does not establish an ideal lesson length or a universal sequence for adult online learners. | Introduce vocabulary at the point of use; show the command, expected observation, and explanation together; move cache and infrastructure complications to the point where the learner can reason about them. |
| [Glynn: Teaching Science with Analogies](https://files.eric.ed.gov/fulltext/ED373306.pdf), 1994, especially Table 1 and the accompanying discussion | The framework calls for establishing the target and familiar comparison, identifying relevant features, making the relationships explicit, identifying limits, and drawing conclusions. The analysis emphasizes that authors should not leave essential mapping work entirely to learners. | A science-teaching framework based on analyses of instructional practice; it does not prove that a café analogy is best for HTTP. | Tell a concrete story, explain its mechanism, connect it to technical roles, and refine only the parts that would otherwise create misconceptions. Test whether the chosen experience is familiar to actual learners. |

### 4.2 Computing education

| Source | What it supports | Limitation | Application to this course |
| --- | --- | --- | --- |
| [Raspberry Pi Foundation: PRIMM pedagogy summary](https://static.raspberrypi.org/files/curriculum/quickreads/11-Pedagogy_Summary_PRIMM_V4_2023.pdf), 2023, describing research including Sentance, Waite, and Kallia (2019) | PRIMM organizes programming activity around Predict, Run, Investigate, Modify, and Make. It begins with reading and discussing working code before independent construction. The summary reports a study involving roughly 500 learners aged 11–14 over 8–12 weeks. | This research concerns school programming and includes classroom dialogue. A self-paced website does not recreate that context merely by using the acronym. | In code lessons, provide a small working program, elicit a low-stakes prediction, let the learner run and investigate it, then change it and build a related feature. Use explanation and tutor dialogue to make thinking visible. Do not force all stages into every conceptual lesson. |
| [Margulieux, Morrison, and Decker: Reducing withdrawal and failure rates in introductory programming with subgoal labeled worked examples](https://link.springer.com/article/10.1186/s40594-020-00222-7), 2020 | In a semester-long study of 265 introductory programming students, the intervention group did better on formative quizzes and had fewer withdrawals/failures. Mean examination performance was not significantly better. Labels described the purpose of steps within procedures. | This is a specific introductory programming intervention. The results do not warrant promising better final mastery from headings alone. | Make the reasoning steps visible: identify the request, read the reported outcome, locate the content, compare the observation with the requirement. In later code examples, explain why a block exists instead of only narrating syntax. |

### 4.3 Synthesis for our design

Our working approach is explicit teaching with progressively reduced support, opportunities to explain and retrieve ideas, and practice that later varies the context. This is a design inference from the sources above, to be evaluated with our learners.

“More verbose” should mean more of the missing causal explanation, not an uncontrolled increase in information introduced at once. A short passage can be cognitively demanding when it presupposes six unfamiliar concepts. A longer passage can be easier when it develops one relationship with an example, a diagram, a question, and feedback.

We should not select formats by labelling people as fixed “visual” or “verbal” learners. Choose a representation for the relationship being taught and provide accessible ways to inspect it. A sequence diagram is useful when message order matters. A comparison table is useful when distinctions matter. Neither becomes educational merely by being present.

Unfamiliarity also needs different treatment at different stages. Beginners should not have to discover an untaught protocol contract by guessing. Later engineering and Heroic challenges can deliberately require research, experimentation, and help. Those conditions should be explicit, and unresolved investigations can still provide useful process evidence.

## 5. What other HTTP teaching material does

This comparison evaluates observable teaching structure, not relative learning outcomes or course quality as a whole.

| Material reviewed | Useful design choice | How we should adapt it |
| --- | --- | --- |
| [MDN: How the web works](https://developer.mozilla.org/en-US/docs/Learn_web_development/Getting_started/Web_standards/How_the_web_works) | States prerequisites and outcomes, introduces client/server roles, and connects a diagram with an everyday analogy before expanding into infrastructure | Make prerequisites explicit and teach roles visually. Divide its broad web overview into smaller instructional steps for our first encounter. |
| [MDN: Overview of HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview) and [HTTP messages](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages) | Explain the protocol structure and show messages with identifiable parts | Use technical documentation to verify the model and supply later reading. Our lesson must still explain why each field is there and guide the student's first interpretation. |
| [CS50x 2025: Lecture 8 notes](https://cs50.harvard.edu/x/2025/notes/8/) | Connects web concepts to concrete request examples, browser tools, and terminal inspection | Preserve the move into real tools. Account for the surrounding course and instruction: this is a later lecture in a programming course, so its pace is not evidence that a nondeveloper can begin with the same compressed notes. |
| [The Odin Project: How Does the Web Work?](https://www.theodinproject.com/lessons/foundations-how-does-the-web-work) | Provides a clear overview, linked reading and viewing tasks, and questions that direct learners back to relevant explanations | Offer explicit outcomes and repair routes. Our core explanation should be sufficient to begin practice without requiring learners to assemble it from several external resources. |

Existing documentation also contains simplifications with limited scope. For example, the readable HTTP/1.1 format should not become the claim that all HTTP versions transmit those same text lines. Source selection does not remove the need for technical review.

## 6. Audience and prerequisites: make the contract enforceable

### 6.1 At entry to the whole program

Assume motivation and ordinary experience using a computer. Verify whether the learner can navigate files and use a browser, and provide preparation where needed. Explicitly teach editor use, terminal commands, installation, running programs, and technical vocabulary.

Do not assume prior programming, Git, Linux, JavaScript, HTML, APIs, databases, Docker, Kubernetes, or cloud operation. These are educational outcomes along the path. Technical English should be supported through plain definitions and concrete examples rather than treated as evidence of engineering ability.

### 6.2 At entry to this part of the program

| Activity | Knowledge genuinely needed | Where it comes from |
| --- | --- | --- |
| Read the first request/response lesson | Basic browser use; the lesson refreshes browser/page and introduces program roles | Basic literacy plus the opening explanation |
| Understand a local server address | Programs running on a computer; address/path/port explained with examples | M020 local-environment bridge; terminal literacy from M002 for the practical steps |
| Inspect a simple supplied HTTP message | Roles, request/response, method, path, status, headers, and body taught in context | Introductory M020 lessons |
| Run the first local request | Open a terminal, locate a folder, run/stop a supplied program, distinguish instructions from output | M002 plus guided M020 setup; setup support remains available |
| Inspect browser Network evidence | Understand which resource is requested and interpret basic message fields | M020 message lessons, followed by guided Network instruction |
| Read the Node.js handler | Functions, branches, modules, relevant asynchronous behavior, and the HTTP contract being implemented | Earlier programming modules plus the earlier M020 lessons |
| Investigate conditional caching | Resource/representation, stored responses, freshness, validation, validators, conditional responses, and observation layers | M020 followed by the relevant M021 lessons |

A diagnostic should discover a gap and route to its explanation. “You should know this already” is not a repair route. A learner should not have to fail a caching question to discover that the platform expected a networking course we never supplied.

### 6.3 Replacement for the problematic module entry instruction

Use this wording when updating Curriculum Architecture §4:

> Before M020 implementation work, check the previously taught ability to navigate the workspace, run a supplied script, trace a bounded asynchronous function, and edit a module. M020 itself teaches request/response concepts, local server addresses and ports, and HTTP inspection. Guide the learner through starting and stopping the local server before checking independent use. Teach message interpretation before asking the learner to locate and interpret a request in the browser's Network tools. Keep conceptual reading available while a tool or programming prerequisite is being repaired.

### 6.4 Proposed concept graph correction

Retain existing identifiers and change their prerequisite/placement metadata in a versioned curriculum revision. The following new identifiers are proposals within the current first-slice registry, whose existing range ends at CP020.

| Concept | Proposed definition or change | Proposed hard prerequisites | Initial placement |
| --- | --- | --- | --- |
| CP021, new | Explain program roles, request/response, and why a protocol is needed | None beyond the stated literacy entry condition; include refreshers | M020-01 |
| CP022, new | Interpret the relevant parts of a simple URL | CP021 | Introduce in M020-01; develop in M020-02 |
| CP010, revised edges | Distinguish method, target, status, headers, and body in a supplied exchange | CP021, CP022 | Introduce in M020-01; develop in M020-03 |
| CP016, retained | Identify a running process, local address, and listening port | CP002 | Teach within M020-02; do not require it before introductory HTTP reading |
| CP009, revised placement | Locate a browser request and interpret its evidence in the guided local workflow | CP010, CP016 | M020-05; M019 retains general DevTools orientation |
| CP011–CP013, retained chain | Resource/representation, then cache policy, then validator/conditional behavior | Preserve the conceptual chain; use it to order instruction | Establish identity/content in M020; develop caching in M021 |

CP006/CP007 remain prerequisites of the handler implementation task. They should not be hard prerequisites of merely explaining an exchange. This is a correction to hidden instructional dependencies, not a claim that a literal cycle was found in the existing graph.

## 7. Expand the lesson-level syllabus

We need a more complete teaching sequence inside the current macro syllabus. The current 68-module map is not 68 modules of finished student content. Expanding the first slice does not require adding arbitrary new graduate competencies.

The following 20 candidate lessons are a working decomposition across M020 and M021. Some can be divided or combined after observing learners. Module effort estimates must be recalibrated from actual study, setup, and practice time; the original eight-lesson representative package's estimate should not be reused for this expanded sequence.

### 7.1 M020: understand and operate a basic HTTP exchange

| Candidate lesson | Instruction and demonstration | Practice and exit evidence |
| --- | --- | --- |
| LS-M020-01 — What happens when your browser asks for something? | Familiar request/reply scene; browser/client/server; protocol; annotated introductory message; success versus an unsuccessful reply | Explain a supplied exchange and repair a mistaken explanation. **Draft authored in the companion file.** |
| LS-M020-02 — Addresses and a server on your computer | URL components, host/path, local address, port, running program; instructor-guided start/stop and an explanation of each command | Identify the program and address, start/stop the supplied local service with support, and explain what each observed message means |
| LS-M020-03 — What messages carry | Develop methods/status/headers/body; plain text, HTML, and introductory JSON; explain how the same information can be presented in different forms | Annotate new messages and identify content versus its description; define “bulletin” before introducing the lab's notice data |
| LS-M020-04 — Inspect your first real request | Teach the terminal client and each option; show one successful exchange and one missing-resource response | Predict, run, compare with a worked transcript, and record a real result; contrast an HTTP error with no HTTP response |
| LS-M020-05 — A page can make several requests | Guide browser Network use; distinguish the document, an image, and an application data request; explain how the page uses returned data | Find a specific request, connect its content to a page element, and compare browser and terminal evidence at the same level |
| LS-M020-06 — Follow the code that answers | Small working handler; route choice, branching, missing route, content production; explain each block's purpose | Trace known input through the handler, then explain a similar path with less support |
| LS-M020-07 — Change a response and verify it | Modify a known response, introduce the required method/error cases, explain focused assertions and negative cases | Implement a bounded change and tests; distinguish source changes, running-program state, and returned content |
| LS-M020-08 — Investigate a simple mismatch | A previously taught class of failure such as a wrong path, wrong local port, or incorrect content; model a useful diagnostic comparison | Gather evidence, explain and repair the bounded mismatch, and demonstrate readiness for the caching module |

Introductory exposure is not mastery. Lesson 1 introduces enough message anatomy to make the system concrete; Lesson 3 develops fluency before real-tool interpretation. The supplied starter for these lessons must present a simple working contract without requiring a beginner to understand the later faulty cache implementation.

### 7.2 M021: develop the cache investigation and related browser boundaries

| Candidate lesson | Instruction and demonstration | Practice and exit evidence |
| --- | --- | --- |
| LS-M021-01 — Same resource, different content | Resource identity versus selected representation; storage fields versus response fields; time and selection | Predict which changes alter the returned content, then inspect controlled changes |
| LS-M021-02 — Why keep a copy? | Cost of retrieving content; storage, freshness, and validation; explain cache directives in context | Explain when a stored response can be used and when it must be checked |
| LS-M021-03 — Ask whether a copy still applies | Validators, `ETag`, `If-None-Match`, and `304`; correct worked examples before a faulty implementation | Predict and observe unchanged and changed content; explain why a response with no body can lead to displayed content |
| LS-M021-04 — Translate the contract into cases | Conditional decisions, missing resources, HEAD, relevant comparison rules, and the supplied parser contract | Build the case matrix and trace the required negative paths without inventing untaught parser rules |
| LS-M021-05 — Distinguish response and display layers | What the origin sends, what the cache selects, and what the browser exposes; reset versus bypass | Compare controlled observations, state the scope of a conclusion, and explain why bypass is not necessarily a repair |
| LS-M021-06 — Investigate the stale notice | Unfamiliar source, useful hypotheses, discriminating experiments, and misleading evidence | Diagnose the supplied fault from source and observations, with recorded assistance where used |
| LS-M021-07 — Repair and defend | Representation-aware repair strategies, regressions, and tradeoffs under the published contract | Implement a repair, test a case that failed before it, and defend assumptions |
| LS-M021-08 — Review and revise | Bounded evidence packets, responding to justified feedback, challenging an unsupported review rule | Submit and improve an engineering explanation and implementation |
| LS-M021-09 — Transfer after a delay | Fresh selection/order variant; reuse concepts while finding a different cause | Investigate new behavior, repair it if possible, and explain what still remains unresolved |
| LS-M021-10 — Origins and browser-carried state | Revisit scheme/host/port as an origin; introduce cookies and their scope using a concrete browser interaction | Interpret where browser state is sent under the taught rules; defer full authentication design to its dedicated modules |
| LS-M021-11 — Understand a cross-origin request | Same-origin policy and CORS, with two explained local origins; distinguish server response from browser permission to expose it | Diagnose a bounded cross-origin read using browser and server evidence; explain why CORS is not authorization |
| LS-M021-12 — Redirects and cache boundaries | Follow a redirect; distinguish private/shared caching contexts; connect previously taught origin and state concepts | Inspect a redirect sequence and reason about an explicitly scoped cache case; identify when later security instruction is needed |

The Heroic exercise remains optional after the relevant caching work. Full solutions and explanations remain available. Research is expected when an exercise deliberately exceeds taught material, and that condition must be clearly stated before the attempt.

### 7.3 Preserve the existing exercise obligations

The introductory rewrite is not a replacement for all the evidence expected from old LS-HTTP-01. Move or split the work deliberately; do not retain an old exercise ID while silently reducing its requirements.

| Existing work | Destination in the proposed sequence | Migration requirement |
| --- | --- | --- |
| EX-HTTP-01, label the exchange | Basic fields in M020-04; caching fields and edit implications in M021-03/05 | Create separately scoped exercise versions/IDs and keep the source mapping |
| EX-HTTP-02, unfamiliar source trace | M020-06 for a simple handler; full conditional implementation in M021-04/06 | Preserve both ordinary control-flow and later caching interpretation |
| EX-HTTP-03, compare browser and terminal | M020-05 for basic correspondence; M021-05 for conditional/cache-layer differences | Record which part of the original expectation each activity covers |
| EX-HTTP-04–06, identity/content/change | M021-01 | Retain prediction, field selection, and controlled baseline work |
| EX-HTTP-07–09, cache layers and bypass | M021-03/05 | Teach the contract and observation layers before interpreting the defect |
| EX-HTTP-10–12, cases/parser/negative paths | M021-04 | Preserve the required boundaries and explain their prerequisites |
| EX-HTTP-13–15, investigation | M021-06 | Retain hypotheses, value tracing, and signal-versus-noise reasoning |
| EX-HTTP-16–18, repair/test/defense | M021-07 | Retain implementation and regression obligations, plus defensible alternatives |
| EX-HTTP-19–21, review | M021-08 | Preserve review, revision, and disagreement with unjustified feedback |
| EX-HTTP-22–24, delayed transfer | M021-09 | Preserve a fresh variant and disclose help/exposure; do not relabel a known solution as independent evidence |
| EX-HTTP-H01 | Optional extension after the relevant M021 material | Keep Heroic difficulty and useful feedback even when unsolved |
| New origin/cookie/CORS/redirect activities | M021-10–12 | These topics were in the macro syllabus but are not supplied by the current cache lab; author and verify suitable exercises |

Competency links and rubrics must be reconciled during migration. A learner explaining the café analogy has supplied introductory conceptual evidence, not demonstrated all of NET04i01, NET08i01, browser investigation, or unfamiliar-code competence.

## 8. Authoring standard for subsequent lessons

### 8.1 Begin with the learner's position

For each lesson, record what the student already understands, what is being introduced, and what the exit task requires. Distinguish vocabulary merely mentioned from concepts actually explained and practised. If a prerequisite has not been taught, add the explanation or move the task.

A brief entry question should have a specific repair destination. An answer requiring outside research belongs in a clearly labelled research exercise, not an ordinary lesson's unexplained readiness check.

### 8.2 Build and then refine a model

Choose an analogy because its relationships are useful. Describe the situation, explain what causes what, and map it explicitly. If the familiar situation itself needs elaborate explanation, prefer a different example or a direct concrete demonstration.

Keep the same example while adding technical precision. A change of setting should have a purpose, such as checking transfer, rather than introducing a new domain every paragraph. Refinements must be accurate, relevant now, and explained at the student's level. Save advanced complications for a named later lesson without presenting the initial model as a universal truth.

### 8.3 Explain mechanisms and decisions

A technical explanation should answer what the pieces are, why they exist, what information they receive, what they do with it, and what comes next. Reading code aloud is insufficient. Explain the purpose of the operation and the assumptions behind it.

Place a new command beside its purpose, how to run it, a bounded example of output, and what to inspect. State what may legitimately vary. If a tool fails before the intended experiment begins, offer setup help rather than interpreting that failure as a misunderstanding of the concept.

### 8.4 Make diagrams carry information

Use a diagram when it exposes order, containment, dependencies, selection, or another relationship more clearly than prose alone. Introduce how to read it. Keep names consistent with the adjacent explanation and provide an equivalent textual account.

Avoid decorative diagrams, unexplained arrows, colour-only distinctions, and forcing all details onto one canvas. A learner using a screen reader or an editor that does not render Mermaid should still receive the essential explanation.

### 8.5 Connect demonstration, practice, and feedback

Show a fully explained example, then ask for a related interpretation or partial completion before independent construction. Reduce guidance as evidence of readiness grows. Later vary the setting and requirements to test whether the learner understands the relationship rather than remembers the example.

Feedback should explain why an answer follows, identify the misconception where relevant, and point to a useful next attempt. Make solutions available without shaming the learner. If complete help supplies the decisive insight, record it accurately when drawing conclusions about independence.

### 8.6 Preserve professional depth

Accessible teaching changes the route to difficult work. It does not remove real tools, unfamiliar repositories, broken architecture, debugging, security labs, infrastructure operation, or ambiguous engineering decisions from the curriculum.

Each practical module should eventually include real observation, implementation or change, a failure investigation, explanation of evidence, and an appropriate transfer opportunity. Scope these to the module's outcomes rather than forcing every lesson to contain every activity type.

### 8.7 Keep author metadata out of the learning narrative

Store stable IDs, versions, prerequisite concepts, evidence mappings, and review rules in Markdown metadata or a companion manifest. The visible lesson should explain the subject and the task. A student should not have to understand the platform's competency schema to learn HTTP.

Do not treat word count, completed screens, self-reported confidence, or a correctly repeated definition as proof of competence. They can inform navigation or evaluation, but the relevant work and explanation supply the evidence.

## 9. Content-related application changes

The user journey can remain recognizable while the lesson reader becomes suitable for teaching.

1. **Use an ordered reading sequence.** Offer a contents list and resumable sections. Do not automatically move every non-analogy section into one technical tab.
2. **Associate each prompt with its lesson and prerequisites.** Replace the shared entity-tag prediction on introductory lessons. Keep the old prompt available at the appropriate caching stage.
3. **Render supported instructional blocks.** Preserve paragraphs, code excerpts, tables, diagrams, nearby explanations, worked examples, and feedback. Label excerpts versus runnable commands.
4. **Provide local help and prerequisite explanations.** Keep the reader's place when they open a definition or review an earlier concept. Support keyboard use and readable text alternatives.
5. **Keep progress and evidence distinct.** Marking a lesson studied is not passing a conceptual check, operating the tools, or demonstrating independent engineering work.
6. **Version the migration.** Update lesson content, prompts, exercises, and rubric mappings together. Preserve existing attempt provenance; do not reinterpret historical work under the smaller introductory lesson.

The existing prototype groups source sections by headings and supplies an advanced shared prediction. Those need implementation changes before simply importing the new Markdown will produce the intended experience. Rendering and browser accessibility checks should be performed on the resulting reader, not inferred from a successful build.

## 10. Technical and instructional review of the new lesson

| Check | Treatment in the candidate |
| --- | --- |
| No assumed HTTP vocabulary at entry | Request/response begin in ordinary language; technical roles and message fields are explained at first use |
| Familiar example does real work | The café scene explains need, target, direction of communication, content, and an unsuccessful reply; the technical explanation returns to those relationships |
| Accurate program roles | Browser and server are described as programs acting in roles; server software is distinguished from its host computer |
| Honest message examples | Fictional addresses and shortened HTTP/1.1 excerpts are labelled; the lesson does not claim to display captured traffic or complete runnable messages |
| Correct scope for status claims | `200` reports success for the illustrated request; `404` is tied to an explicit missing-menu scenario rather than proof that the entire site is absent |
| No forced transport or cache detour | The initial case explicitly assumes a request is needed; detailed connection reuse, validators, and cache layers are taught later |
| Assessment follows instruction | Practice uses only the roles, fields, and application rules supplied in the lesson; no `304` or source investigation is required |
| Feedback is explanatory | Complete answers explain the distinctions and route a misunderstanding back to the relevant part of the lesson |
| Diagram is interpretable without rendering | A reading instruction and equivalent prose accompany the sequence diagram |

The technical review uses [RFC 9110's role and message definitions](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.3) and [MDN's message guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Messages). Advanced qualifications, such as a server using `404` to avoid disclosing a resource, should be retained in author knowledge and taught when relevant; they need not interrupt the novice's missing-menu example.

This check establishes consistency with the intended introductory scope. It does not establish that learners will find the lesson clear, retain it, or use the knowledge independently in the lab.

## 11. Next steps and validation

### Immediate sequence

1. **Review the rewritten lesson for the intended voice and explanatory depth.** Use it as the candidate standard for subsequent content. A complete beginner should be able to explain the exchange without an author filling in the missing steps.
2. **Author M020-02 through M020-05 and the simple working local fixture.** Make the bridge from the explanation to addresses, commands, message types, and browser evidence complete. Include setup recovery and accessible sample observations.
3. **Try this short sequence with learners.** Recruit separately rather than treating the owner's workflow review as learner validation. Observe first, then revise the material and timing.
4. **Integrate the tested reading structure and lesson-specific prompts.** Migrate IDs, exercises, and rubrics as a versioned content release, then verify the actual reader.
5. **Expand the remaining HTTP lessons and other modules using the revised standard.** Preserve the professional challenges and delayed transfer evidence; review each new prerequisite chain before publication.

### What to observe in a small formative trial

A first trial can use a small varied group, for example 3–5 people with little or no development experience, plus a few learners who meet the M020 programming prerequisites. This is a proposed practical starting point, not a statistically justified efficacy sample. Analyse those groups separately: a newcomer can assess the standalone explanation, while the prepared learner can assess the full module path.

Ask participants to explain their interpretation at selected checkpoints. Record unfamiliar words, incorrect mappings, places they reread, unexpected tool prerequisites, requested help, and success on a related example. Ask for a short explanation again after a delay. Record actual active and setup time without presenting speed as the learning objective.

Use these observations to answer concrete questions:

- Does the learner distinguish the person, browser, and server program?
- Can they interpret a new supplied exchange instead of repeating the café story?
- Do they confuse headers with page headings or status with visible content?
- Can they explain an unsuccessful response versus no HTTP response?
- After guided tool instruction, can they locate the relevant real request and justify their interpretation?
- Does the unfamiliar setting in a transfer question reveal a missing concept or merely unfamiliar vocabulary?

Any recurring misconception should trigger revision and another focused check. This trial is for finding design defects and calibrating instruction. Claims about learning efficacy, completion, independence, or graduate readiness require appropriate later evidence.

