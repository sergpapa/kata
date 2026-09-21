---
document_id: FSSE-DEPTH-001
version: "1.0.0"
date: "2026-09-18"
status: "Authoring plan with a first learner review; advanced instruction remains to be authored and validated"
canonical_format: markdown
audience: "Course owner, curriculum authors, and AI coding/content assistants"
graduate_standard: "GCS-FSSE-001@1.1"
curriculum: "FSSE-CURR-001@1.1"
teaching_standard: "FSSE-AUTHOR-001@1.0.0"
module_count: 68
competency_domain_count: 27
lesson_batch: [LS-M020-06, LS-M020-07, LS-M020-08]
---

# Curriculum depth and progression map

## 1. Decision and evidence

The course starts with first principles and develops independent professional engineering. Its formal target remains strong mid-level full-stack competence. Advanced explanations and optional Heroic investigations can be useful to experienced engineers; completing the course does not establish senior organizational responsibility or specialist mastery in every discipline.

The owner reports enjoying Lessons 1–4, particularly their structure, analogies, and integrated examples. The owner also reports existing practical experience alongside gaps in underlying explanations, and uncertainty about the intended depth. This is valuable feedback from one learner. It supports preserving the approach and making the destination visible; it does not validate the entire program, a beginner population, or the unreviewed lessons.

The 68-module architecture supplies broad coverage. This revision supplies an explicit bridge between introductory instruction and difficult questions. It retains stable module IDs and graduate outcomes. No completion percentage or topic mention is converted into mastery.

## 2. Four kinds of understanding to develop

These are authoring lenses, not another grading scale. Keep the existing P competency, H assistance, and L difficulty scales.

| Lens | Learner can do | Insufficient evidence |
| --- | --- | --- |
| Working model | Explain the relevant entities and relationships in plain language; connect the model to an actual example | Repeat an analogy without identifying its technical counterparts |
| Mechanism | Trace inputs, decisions, state, outputs, and timing; predict a controlled variation | Recognize a term or copy a command |
| Investigation | Compare expectations with observations, distinguish hypotheses, repair a defect, and test a meaningful counterexample | Obtain a successful status or follow a known fix without explanation |
| Judgment and transfer | Apply the mechanism in a changed setting; weigh constraints, alternatives, and uncertainty; defend a decision | Use a fashionable technology or repeat the original exercise |

Every core topic needs a route through these lenses. A small lesson can cover only part of that route. An awareness topic can stop earlier if its boundary is explicit. More code, unfamiliar vocabulary, and more tools are not substitutes for deeper understanding.

## 3. Entry routes for mixed experience

Record practical familiarity and conceptual understanding separately. A learner who has deployed an API may still benefit from an explanation of response semantics. A learner who explains HTTP clearly may need help starting a local process.

Use a short, optional placement check: explain one example, predict a changed example, and identify useful evidence for a mismatch. If the learner can do these, offer the relevant later activity. If not, link the exact repair section. Familiarity with terminology, employment history, and self-confidence are not placement evidence.

For personal study, these checks guide navigation; they do not lock content or withhold answers. Separate formal evidence requirements apply only when an independent competency claim is being assessed. A learner can study a walkthrough and then try a fresh task later.

The main curriculum provides programming before M020. The HTTP-first owner trial is a different entry route. Lessons 6–8 therefore include a narrow reading bridge for functions, objects, conditions, and return. That bridge supports the supplied tasks; it does not replace M004–M012 or award general programming competence. If it is insufficient, route to those foundations rather than treating confusion as an HTTP failure.

## 4. Whole-curriculum depth audit

All 27 competency domains retain their existing coverage mappings in the architecture. This table checks the intended progression and the question that must eventually become teachable. It is a design audit, not proof that all lessons or prerequisites have been validated.

| Domain | Foundation and mechanism | Later application and transfer | Depth question / authoring obligation |
| --- | --- | --- | --- |
| ENG inquiry | M001–M008: observation, explanation, small experiments | M039, M062, M064: unfamiliar code and research | Which observation would distinguish two plausible causes? Teach experiment design before an ambiguous incident. |
| SYS systems | M002, M014: process, memory, files, resources | M029, M049, M056 | Why does a correct local function behave poorly as a running service? |
| LNX operations | M002, M015: shell, permissions, processes | M050, M053, M062 | Which layer prevents a process from reading a file or reaching a service? |
| PRG programming | M004–M013: values, control flow, identity, modules, async | M029, M039, M044 | Which state and execution order explain the result? Do not introduce concurrency only as syntax. |
| DSA algorithms | M006, M016: collections, growth, measurement | M025, M046, M056 | Which cost grows, and does measurement support the proposed improvement? |
| GIT versioning | M003: changes and commits | M040, M051, M061 | How do we recover and reconcile meaning, not merely remove conflict markers? |
| NET networking | M020–M022: HTTP then transport, names, TLS, intermediaries | M048, M055, M062 | Where could an exchange fail, and what does each observation establish? |
| BRW browser | M019, M020, M023: DOM, requests, storage, lifecycle | M034, M036, M062 | Which request, stored state, or rendering decision produced this screen? |
| UI interface | M017–M019: semantics, layout, input | M035–M038, M061 | Can different users complete the workflow and recover from errors? |
| FEN frontend | M033–M036: state, rendering, async UI | M037, M047, M061 | What happens when responses arrive late or a connection is restored? |
| BEN backend | M029–M032: lifecycle, contracts, identity, permissions | M044, M048, M062 | Which invariant must survive repeated, concurrent, or incomplete work? |
| WEB integration | M020–M023: client/server and browser boundaries | M030, M034, M037 | Is this an application refusal, browser restriction, or failed exchange? |
| DAT data | M024–M028: relational model, plans, transactions, migrations | M054, M056, M062 | Why does the query or migration behave differently with real data and concurrent use? |
| DIS supporting systems | M021 then M043–M047: cache, queues, files, search, realtime | M048, M062 | Which source of truth, delivery rule, or stale copy explains the outcome? |
| SEC security | M019/M021 boundaries; M030–M032 trust and identity | M041, M052–M053, M063 | Which assumption can an actor violate, and why does the repair close that boundary? |
| TST testing | M007, M020-07: explicit expectations and negative cases | M038, M051, M061 | What defect would this test detect, and what could still be wrong? |
| DSG code design | M005, M010: decomposition and interfaces | M029, M039, M061 | How does a new requirement expose a harmful dependency? |
| ARC architecture | M030, M042: constraints and alternatives | M048, M060, M064–M068 | Which measured constraint justifies more complexity? |
| CTR containers | M014/M015 process model, then M049–M050 | M054, M058–M060 | Which filesystem, process, network, or persistence assumption failed? |
| CIC delivery | M003/M013 repeatability, M051 pipelines | M054, M067–M068 | Which artifact is running, and how can a change be released or reversed safely? |
| CLD cloud | M022 networking, M041 trust, M052–M053 infrastructure | M060, M063, M067 | How do identity, networks, state, and cost interact in this deployment? |
| KUB orchestration | M049–M050 containers, M058 workload model | M059–M060, M067 | Why is a workload unhealthy, and is orchestration justified for this system? |
| OBS observability | Early request evidence; M055 correlation, M056 profiling | M057, M062 | What can the signal establish, and what instrumentation is missing? |
| REL reliability | M029 bounds, M030 contracts, M043–M048 failures | M057, M062, M068 | How do retries, overload, partial success, and recovery interact? |
| PRD requirements | M008/M037 explicit user tasks; M042 constraints | M061, M065, M068 | Does the implementation satisfy the actual need under changed requirements? |
| COM communication | Explain small decisions and observations throughout | M040, M061–M068 | Can another engineer assess the evidence, assumptions, and remaining uncertainty? |
| AIE AI use | M013 source/tool judgment; M040 generated-change verification | M064–M068 | What evidence supports a generated claim or change, and what assistance was used? |

Before authoring each later block, expand its row into actual concept dependencies. The module map cannot certify those dependencies by itself. Maintain that expansion close to the next authoring work instead of inventing a fully detailed sequence for hundreds of unwritten lessons.

## 5. The HTTP route, lesson by lesson

Status on this release: Lessons 1–5 are existing authored drafts; the owner has positively reviewed 1–4. Lessons 6–8 are the accompanying new drafts with a separate lab. The M021 sequence below remains planned student instruction. Earlier advanced cache fixtures are reference assets and must be adapted to the new sequence before release.

| Lesson | Required earlier understanding | Mechanism developed here | Practice / evidence | Later question it prepares |
| --- | --- | --- | --- | --- |
| M020-01 | Browser use | Client, server, request, response, protocol | Explain a supplied exchange and an unsuccessful reply | Did anything answer? |
| M020-02 | Request/reply roles | Address, host, port, source versus process | Start, stop, and identify the local process | Am I testing the intended program? |
| M020-03 | Message anatomy | Text, HTML, JSON and content description | Inspect content versus its label | Can a successful reply carry the wrong thing? |
| M020-04 | Running server and body formats | curl, GET/HEAD, response versus connection failure | Predict and compare real responses | Which fields support my claim? |
| M020-05 | Requests and tool inspection | Several requests contributing to one page | Match document and data outcomes | Does one successful request establish feature success? |
| M020-06 | 1–5 plus included code-reading bridge | Handler input, path/method decisions, helper calls, return | Trace GET, HEAD, and a missing path | Which code chose this response? |
| M020-07 | Handler trace; narrow test-reading bridge included | Contract, 405/Allow, positive/negative cases, assertions | Add hours route; observe a failing requirement before repair | How do I know my change preserves other behavior? |
| M020-08 | Trace, contracts, local tests | Hypotheses, control requests, source-to-response evidence | Diagnose wrong content under 200; repair; fresh route variant | What distinguishes a plausible explanation from a supported one? |
| M021-01 | 6–8 and object reading | Resource identity versus selected representation | Change data that does / does not affect returned content | What exactly is a stored copy a copy of? |
| M021-02 | Identity, responses, elapsed time | Storage, freshness, validation | Predict whether a copy can be reused under a stated policy | Does stored mean reusable? |
| M021-03 | Freshness and validation | ETag, If-None-Match, 304 | Work unchanged and changed cases before defects | How can no new body lead to displayed content? |
| M021-04 | Conditions, headers, 304 model | Conditional case matrix, HEAD, comparison and parser contract | Test missing, matching, changed, and invalid cases | Which branch incorrectly claims equivalence? |
| M021-05 | Browser requests and conditional cases | Origin output, cache selection, display; bypass versus repair | Compare controlled observations at each layer | What can a refresh actually prove? |
| M021-06 | 01–05; hypothesis practice | A faulty validator in unfamiliar source | Diagnose a stale announcement with distracting evidence | Which changing value should influence the validator? |
| M021-07 | Diagnosis and case matrix | Repair alternatives and regression design | Prove a failing case before fix; defend valid alternatives | Does the fix work beyond this one example? |
| M021-08 | Evidence-based explanation | Review, justified disagreement, revision | Respond to feedback and identify unsupported claims | Can another engineer verify the reasoning? |
| M021-09 | Prior learning, later fresh attempt | Transfer under a changed selection rule | New case with help disclosed | Was a relationship learned or an answer remembered? |
| M021-10 | URL parts and browser requests | Origin and cookie scope | Trace when supplied state is sent | Which boundary carries identity-related data? |
| M021-11 | Origins and server responses | Cross-origin browser access | Two-origin observation and bounded diagnosis | Does browser permission establish server authorization? |
| M021-12 | Origins, state, cache policy | Redirect and private/shared-cache boundaries | Trace redirects and a scoped privacy case | Who else could receive a stored response? |

The 20-lesson count is a working decomposition. Split a lesson if prerequisite teaching or practice overloads it. Do not silently remove the deeper investigation to keep a target count.

M022 subsequently teaches DNS, transport, TLS, and intermediaries. M029/M030 revisit resource bounds and API contracts. M043/M048 deepen shared state and failure behavior. M055/M062 apply these models to incomplete production evidence. Each revisit must state the earlier model and the new condition that requires refinement.

## 6. Rate limiting: introduce, explain, implement, challenge

The first explicit rate-limit topic was M048. The revised architecture adds a bounded introduction in M029/M030, with identity-sensitive policy in M031/M032, abuse investigation in M041, shared state in M043, and distributed failure in M048. It does not insert a full overload/security course into M020.

| Placement | Teach before asking | Planned learner task | Boundary |
| --- | --- | --- | --- |
| M029 | Work per request, elapsed time, counters, basic service capacity | Observe a tiny, deterministic local quota; distinguish frequency from simultaneous work | A small simulation is not a capacity benchmark |
| M030 | Stated quota contract, refusal response, retry timing | Inspect 429 and an optional Retry-After; test a client against the stated policy | Refusal semantics do not prescribe an algorithm; retries need separate safety reasoning |
| M031/M032 | Identity, authentication, tenant and permission boundaries | Compare user, tenant, and address-based policy against supplied abuse and fairness cases | Authentication and rate limiting solve different problems |
| M041 | Input cost, identity and quota model | Investigate a deliberately weak limiter in an authorized local target; repair and explain limitations | Bounded requests and resettable test data; no uncontrolled traffic generation |
| M043 | Shared counters, expiration, concurrency and atomic operations | Move from one process to multiple instances; test a deliberately non-atomic decision/update | Teach the store operations before the race exercise |
| M048 | Prior limits, timeouts, retries, shared-state failure | Compare burst policy, store outage behavior, backpressure and load shedding | Explicitly consider what each control cannot protect |
| M056/M062 | Measurement, telemetry and previous mechanisms | Diagnose mixed legitimate demand and abuse using limited evidence | Do not label every overload an attack |

Algorithm comparison should include fixed windows, a sliding approach, and token-bucket reasoning once counters and time are understood. Start with a worked time sequence, then implementation, boundary cases, and tradeoffs. Do not teach a list of algorithm names as if that establishes design ability.

The protocol defines 429 as a rate-limit response and permits Retry-After; it does not choose the identifying key or counting implementation. Use the standard when authoring the contract. [RFC 6585 §4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)

Application controls are part of a wider availability design. Later instruction must distinguish expensive application work from infrastructure or network exhaustion and identify when upstream services are needed. [OWASP denial-of-service guidance](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)

## 7. Security: teach the mechanism before the attack

| Thread | Mechanism first | Defect / defense learning | Later transfer |
| --- | --- | --- | --- |
| Injection | M024 query structure; M030 untrusted input | Parameter binding and a local input-boundary defect | M041 alternative input paths; M063 review |
| XSS | M019 DOM/text/HTML interpretation | Explain how data becomes executable content; use context-appropriate handling | M041 stored/reflected cases and incomplete fixes |
| CSRF | M021 cookie carriage; M031 authenticated actions | Explain unwanted cross-site action and appropriate controls | M041 browser evidence; do not confuse with CORS |
| Authorization | M031 identity; M032 object/action rules | Cross-user and cross-tenant denial tests | M041 jobs/files/admin paths; M063 fresh system |
| SSRF / uploads | M022 outbound networking; M030/M045 server inputs and storage | Show which actor can influence a server-side operation | M041 or M063 scoped investigation after these concepts are taught |
| Secrets / supply chain | M013 dependencies; M031 credentials; M049/M051 artifacts | Identify exposure, rotate supplied test credentials, verify affected paths | M052/M053 least privilege; M063 deployment review |
| Availability / abuse | M029 resource bounds; M030 quotas | Bounded local abuse experiment and remediation | M043/M048 shared-state and failure tradeoffs |

**Dependency correction:** M041 contains multiple lab families. Its existing module prerequisites do not prove readiness for every family. Each lab must name its own concept prerequisites. For example, an upload lab that depends on M045 belongs after that instruction, or needs an explicit bridge before it. Module numbers are not a license to demand untaught knowledge.

Every lab supplies a legitimate workflow, a trust-boundary explanation, controlled proof of impact, a repair, a regression case, and discussion of an attractive incomplete fix. Targets are local, course-owned, or explicitly provisioned for the exercise. Deep exploit development and cryptanalysis remain specialist extensions rather than a hidden graduation requirement.

## 8. Authoring sequence and acceptance

1. Adopt the companion authoring standard and curriculum revisions.
2. Review Lesson 5 observations when the owner supplies them; do not invent that feedback or wait to produce the already authorized next batch.
3. Study and review Lessons 6–8 with their new kit. Look particularly for hidden JavaScript assumptions and whether the investigation is demanding for the right reasons.
4. Author M021-01 through M021-05 in coherent small batches. These teach the actual cache mechanisms required by the deeper investigation.
5. Author and rehearse M021-06/07 as the deeper reference experience, using the companion investigation design. Technical verification and learner review are separate gates.
6. Adjust that progression from feedback, then expand other subjects using the same mechanism-to-evidence mapping.

Reject a lesson batch when a required ordinary exercise depends on an unexplained concept, when a solution merely states the answer, when the lab cannot reproduce its claimed behavior, or when the announced depth has no destination and evidence task. Record unresolved platform/environment checks without claiming that a successful command-line rehearsal validates them.

## 9. What this release establishes

The mapping exposes a coherent intended route. The new lesson and lab batch makes the next step usable. It does not establish that advanced learning has occurred, that all 68 modules have full lesson-level dependency validation, or that all future security labs are built. Keep those as visible authoring work rather than completed course content.
