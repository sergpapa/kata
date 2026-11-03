---
title: 'QA Automation Engineering Module Syllabus'
document_id: 'QAAE-SYL-001'
version: '0.1'
date: 2026-11-03
status: 'Draft for owner review; no lessons authored'
companion: 'Curriculum_Architecture_v0_1.md'
---

# QA Automation Engineering Module Syllabus v0.1

Each module is marked with its source:

- **Shared** — a full-stack (FSSE) module used as-is. Authored once, listed by both courses.
- **Bridged** — FSSE lessons plus a short bridge lesson that frames them for a tester. The bridge
  may also narrow the depth (for example, reading the DOM rather than building pages).
- **New** — written for this course only.

Topics describe planned coverage, not finished lessons. Hours are author estimates.

## 1. Map of the full-stack modules

| FSSE module                                        | Use here                 | QAAE module |
| -------------------------------------------------- | ------------------------ | ----------- |
| M001 Orientation and safe setup                    | Bridged                  | Q01         |
| M002 Terminal                                      | Shared                   | Q02         |
| M003 Git                                           | Bridged                  | Q03         |
| M004–M008 Programming foundations                  | Replaced by new modules  | Q04–Q08     |
| M009 JavaScript semantics                          | Bridged                  | Q09         |
| M010 Objects and modules                           | Bridged                  | Q10         |
| M011 TypeScript                                    | Bridged                  | Q11         |
| M012 Async                                         | Bridged                  | Q12         |
| M013 Dependencies and tooling                      | Shared                   | Q13         |
| M017 HTML and accessibility                        | Bridged, reading depth   | Q14         |
| M018 CSS                                           | Bridged, narrow slice    | Q15         |
| M019 DOM, events, forms                            | Bridged, reading depth   | Q15         |
| M020 HTTP (Lessons 1–8 and onward)                 | Shared                   | Q16         |
| M021 Caching and origins (Lessons 9–15 and onward) | Shared                   | Q17         |
| M022 Networking                                    | Bridged, awareness slice | Q18         |
| M024 SQL foundations                               | Bridged                  | Q28         |
| M030 API contracts                                 | Bridged                  | Q27         |
| M031 Authentication                                | Bridged                  | Q23, Q29    |
| M038 Risk-based testing                            | Bridged, expanded        | Q41         |
| M040 Collaboration and AI verification             | Bridged                  | Q42         |
| M041 Security labs                                 | Bridged, tester slice    | Q33         |
| M049–M050 Containers and Compose                   | Bridged                  | Q38         |
| M051 CI pipelines                                  | Bridged                  | Q39         |
| M055 Telemetry                                     | Bridged, reading slice   | Q40         |
| M056 Profiling and load                            | Bridged, load slice      | Q32         |

**Not used:** M014–M016, M023, M025–M029, M032–M037, M039, M042–M048, M052–M054 and M057–M068.
Where a tester needs to know a mechanism exists (queues, caches, replicas), Q18 and Q40 cover it at
awareness depth.

Count: 46 main-path modules — 4 shared, 20 bridged, 22 new — plus 4 optional mobile modules, all
new.

## 2. Module records

### S00 Setup and the new workbench

#### Q01 Orientation, setup and the grading kit

**Source:** Bridged (M001). **Prerequisites:** entry diagnostic. **Effort:** 6–10 h.
**Topics:** M001 content; minimum hardware; installing Node, Docker and the portfolio repository
template; running the grading kit once on a sample suite; the Codespaces appendix for machines
without install rights; what the diagnostic credits from testing experience.
**Exit:** A working workspace that has run one grading pass; a recovery note.

#### Q02 Terminal and local program operation

**Source:** Shared (M002). **Prerequisites:** Q01. **Effort:** 10–18 h.

#### Q03 Git as change history

**Source:** Bridged (M003). **Prerequisites:** Q02. **Effort:** 10–18 h.
**Bridge:** test code is product code; a pull request for a test change; reviewing someone's test.

### S01 Programming for testers

Every example in this stage checks something the learner would otherwise check by hand.

#### Q04 Values, expressions and first checks

**Source:** New (replaces M004). **Prerequisites:** Q02. **Effort:** 14–24 h.
**Topics:** values, variables, arithmetic and Boolean logic, strings, output; execution order;
writing a price calculation and checking it against an expected value; boundaries as values.
**Exit:** A program that checks a pricing rule at its boundaries, with predictions recorded first.

#### Q05 Control flow, functions and test steps

**Source:** New (replaces M005). **Prerequisites:** Q04. **Effort:** 18–30 h.
**Topics:** conditions, loops, functions, parameters, return values, scope; a repeated test step
becomes a function; a table of inputs becomes a loop (data-driven checking).
**Exit:** A data-driven checker for a validation rule; a trace explaining a loop defect.

#### Q06 Collections and comparing results

**Source:** New (replaces M006). **Prerequisites:** Q05. **Effort:** 16–28 h.
**Topics:** arrays, objects, maps, sets; searching, grouping, sorting, deduplication; comparing an
expected list with an actual one; order-sensitive versus order-insensitive comparison.
**Exit:** A report-diff tool that explains every mismatch between two result sets.

#### Q07 Errors, assertions and debugging

**Source:** New (replaces M007). **Prerequisites:** Q06. **Effort:** 16–28 h.
**Topics:** exceptions, stack traces, the debugger, breakpoints; what an assertion message must say;
minimal reproduction — a skill testers already have, now applied to code; hypotheses and evidence.
**Exit:** A diagnosed and fixed defect in an unfamiliar small program, including a first hypothesis
that was wrong.

#### Q08 Project: build TinyRunner

**Source:** New (replaces M008). **Prerequisites:** Q03, Q07. **Project:** QP01. **Effort:** 20–32 h.
**Topics:** registering tests, running them, catching failures, reporting; setup and teardown;
skipping and filtering; why real runners isolate tests.
**Exit:** A working toy runner, plus a written account of three things a real framework does that
TinyRunner does not.

### S02 TypeScript and the runtime

#### Q09 JavaScript semantics and identity

**Source:** Bridged (M009). **Prerequisites:** Q08. **Effort:** 12–20 h.
**Bridge:** `toBe` versus `toEqual` — why two identical-looking objects are "not equal"; a mutated
shared test fixture that breaks the next test.

#### Q10 Objects, modules and classes

**Source:** Bridged (M010). **Prerequisites:** Q09. **Effort:** 14–24 h.
**Bridge:** the class as the shape a page object will take in Q22; modules as how a suite is split.

#### Q11 TypeScript and runtime contracts

**Source:** Bridged (M011). **Prerequisites:** Q10. **Effort:** 16–28 h.
**Bridge:** typing test data; validating an API response at runtime; why a passing compile misses a
changed response.

#### Q12 Asynchronous execution

**Source:** Bridged (M012). **Prerequisites:** Q11. **Effort:** 18–30 h.
**Bridge:** the missing `await`, which does not always fail: an un-awaited action can pass on lucky
timing and fail later at random (an un-awaited assertion fails in current Playwright); ordering
surprises as the root of flaky tests.

#### Q13 Dependencies, builds and repeatable tooling

**Source:** Shared (M013). **Prerequisites:** Q11, Q12. **Effort:** 8–14 h.

### S03 The web as a system under test

#### Q14 HTML and the accessibility tree

**Source:** Bridged (M017, reading depth). **Prerequisites:** Q01. **Effort:** 14–24 h.
**Bridge:** roles, names and labels as what `getByRole` and `getByLabel` read; why a locator built on
the accessibility tree survives a redesign and a CSS path does not.

#### Q15 Browser behaviour: layout, events, forms and DevTools

**Source:** Bridged (M018 narrow slice, M019 reading depth). **Prerequisites:** Q09, Q14.
**Effort:** 12–20 h.
**Bridge:** visible versus present; an element covered by an overlay; focus and form validation;
reading a page in DevTools before automating it.

#### Q16 HTTP requests and a local web server

**Source:** Shared (M020, Lessons 1–8 onward). **Prerequisites:** Q12, Q15. **Effort:** 20–34 h.

#### Q17 Caching, cookies and origins

**Source:** Shared (M021, Lessons 9–15 onward). **Prerequisites:** Q16. **Effort:** 16–28 h.

#### Q18 Networks and the parts you cannot see

**Source:** Bridged (M022 awareness slice). **Prerequisites:** Q16. **Effort:** 8–14 h.
**Bridge:** DNS, TLS, proxies, CDNs, caches and queues at the depth needed to say "this failure is
the environment, not the product", and to prove it.

### S04 Playwright in depth

New, except Q23. BookingLab R0 arrives at Q20.

#### Q19 Why automate, and when not to

**Prerequisites:** Q08. **Effort:** 8–14 h.
**Topics:** what automation is good and bad at; cost of writing, running and maintaining a test; the
test pyramid and its critics; exploratory testing as something automation cannot replace.
**Exit:** A decision note choosing which of 20 manual regression cases to automate, and why.

#### Q20 First Playwright tests

**Prerequisites:** Q13, Q15, Q19. **Project:** QP02 R0, QP03 begins. **Effort:** 16–26 h.
**Topics:** the runner; locators; actions; web-first assertions; auto-waiting (the 2-second-sleep
scene); headed and headless runs; the three browser engines.
**Exit:** First suite against R0; first grading pass.

#### Q21 Test design in code

**Prerequisites:** Q20. **Project:** R1. **Effort:** 16–26 h.
**Topics:** isolation; fixtures and hooks; test data factories; parametrised tests; parallel runs and
what they break; boundary, equivalence and decision-table design in code.
**Exit:** Suite covers R1 booking rules; passes when run in parallel and in random order.

#### Q22 Suite architecture

**Prerequisites:** Q21. **Effort:** 16–28 h.
**Topics:** page objects, components, helpers; when an abstraction helps and when it hides the test;
naming; readability as a maintenance cost.
**Exit:** Refactored suite with a decision note on its structure.

#### Q23 Sessions, roles and multi-user scenarios

**Source:** Bridged with M031 concepts. **Prerequisites:** Q17, Q22. **Project:** R2.
**Effort:** 10–16 h.
**Topics:** stored authentication state; testing as several users at once; why logging in through the
UI in every test is slow and fragile.
**Exit:** Multi-role tests for R2; grading pass.

#### Q24 Diagnosing failures

**Prerequisites:** Q22. **Effort:** 12–20 h.
**Topics:** trace viewer, screenshots, video, reporters; triage: product bug, test bug or environment;
writing the bug report from automated evidence.
**Exit:** Three triaged failures with bug reports.

#### Q25 Flakiness is a race

**Prerequisites:** Q12, Q24. **Effort:** 14–24 h.
**Topics:** run a failing test 10 times in isolation before judging it; the failure signature — a
wrong value usually means a real race in the product, a timeout usually means a waiting or load
problem; why retries and longer timeouts hide causes.
**Exit:** A written diagnosis of a planted flaky test, with its root cause fixed.

#### Q26 Controlling the network

**Prerequisites:** Q17, Q24. **Project:** R3. **Effort:** 10–16 h.
**Topics:** route interception; stubbing an external service; simulating slow and failing responses;
when a mock lies about the real system.
**Exit:** Tests of R3 behaviour when the external price service fails.

### S05 Beyond the UI layer

#### Q27 API testing

**Source:** Bridged (M030). **Prerequisites:** Q16, Q26. **Project:** R3. **Effort:** 18–30 h.
**Bridge:** Playwright's request context; status, headers and body checks; schema validation; API
tests as setup for UI tests; which checks belong at which layer.

#### Q28 Data and SQL for testers

**Source:** Bridged (M024). **Prerequisites:** Q21. **Effort:** 14–24 h.
**Bridge:** verifying state in the database; seeding and resetting data; why tests must not share
rows.

#### Q29 Permissions testing

**Source:** Bridged (M031). **Prerequisites:** Q23, Q27. **Project:** R4. **Effort:** 12–20 h.
**Bridge:** the role-and-action matrix; IDOR (reading another user's data by changing an ID in the
request); testing what must be refused, not only what must work.

#### Q30 Contract testing

**Source:** New. **Prerequisites:** Q27. **Effort:** 10–16 h.
**Topics:** consumer-driven contracts with Pact; what contract tests catch that API tests do not;
when the cost is not worth it.

#### Q31 Accessibility, visual and device checks

**Source:** New. **Prerequisites:** Q14, Q22. **Project:** R5. **Effort:** 10–18 h.
**Topics:** automated accessibility scans with axe and what they cannot detect; visual comparison
and its false alarms; mobile web through device emulation.

#### Q32 Performance testing

**Source:** Bridged (M056 load slice). **Prerequisites:** Q27. **Project:** R6. **Effort:** 12–20 h.
**Bridge:** load tests with k6; percentiles instead of averages; finding the double-booking race that
only appears under concurrency.

#### Q33 Security testing for testers

**Source:** Bridged (M041 tester slice). **Prerequisites:** Q29. **Effort:** 10–18 h.
**Bridge:** authorized scope only; injection, XSS and broken access control from a tester's view;
turning a finding into a regression test.

### S06 Tools compared and transferred

#### Q34 Selenium WebDriver in Java

**Source:** New. **Prerequisites:** Q22. **Effort:** 30–50 h.
**Topics:** a Java bridge limited to what Selenium tests need; the WebDriver protocol; explicit waits
and why Selenium needs them; page objects in Java; porting five Playwright tests.
**Exit:** Ported tests plus a comparison note.

#### Q35 Cypress compared

**Source:** New. **Prerequisites:** Q22. **Effort:** 8–14 h.
**Topics:** running inside the browser, and what that makes easy and impossible.

#### Q36 BDD and Gherkin

**Source:** New. **Prerequisites:** Q22. **Effort:** 8–12 h.
**Topics:** Given/When/Then; when shared language with the business pays off; when it is ceremony.

#### Q37 Choosing a tool

**Source:** New. **Prerequisites:** Q34, Q35, Q36. **Effort:** 6–10 h.
**Exit:** A decision record choosing a tool and language for a supplied team brief, defended against
the criteria in the architecture Section 3.1.

### S07 Tests in the delivery pipeline

#### Q38 Containers and test environments

**Source:** Bridged (M049, M050). **Prerequisites:** Q20. **Effort:** 14–24 h.
**Bridge:** running BookingLab in Compose; health and readiness — why tests fail when they start
before the application is ready; resetting to a known state.

#### Q39 Suites in CI

**Source:** Bridged (M051). **Prerequisites:** Q25, Q38. **Effort:** 16–26 h.
**Bridge:** GitHub Actions on the learner's own public repository; sharding; artifacts and reports;
a retry policy that does not hide races.

#### Q40 Reading logs and telemetry

**Source:** Bridged (M055 reading slice). **Prerequisites:** Q38. **Effort:** 8–14 h.
**Bridge:** correlating a failed test with server logs through a request ID.

### S08 Quality strategy and the team

#### Q41 Risk-based test strategy

**Source:** Bridged (M038, expanded). **Prerequisites:** Q27, Q31. **Effort:** 14–24 h.
**Bridge:** layers and omissions; coverage and its limits; mutation testing — the technique the
grading kit uses.
**Exit:** A test strategy for BookingLab, including what is deliberately not tested.

#### Q42 Reviewing tests, including AI-written ones

**Source:** Bridged (M040). **Prerequisites:** Q22. **Effort:** 12–20 h.
**Bridge:** reviewing a colleague's test; AI-generated tests that assert nothing, assert the wrong
thing or copy the bug into the expected result.

#### Q43 Reporting and arguing for quality

**Source:** New. **Prerequisites:** Q39. **Effort:** 8–12 h.
**Topics:** metrics that mislead (pass rate, raw coverage); a release-readiness report; telling a
team which tests to delete.

#### Q44 Keeping a suite alive through change

**Source:** New. **Prerequisites:** Q41. **Project:** R7. **Effort:** 12–20 h.
**Topics:** triage after a product release; real bug versus intended change; refactoring under a
moving target.
**Exit:** Suite updated for R7, with a written triage of every failure.

### S09 Capstone and readiness

#### Q45 Capstone: an unfamiliar system

**Source:** New. **Prerequisites:** S08. **Project:** QP04. **Effort:** 40–70 h.
**Topics:** orient in an unknown application; strategy, framework, CI, findings.
**Exit:** A strategy, a working suite in CI, bug reports for the faults found, and a grading pass.

#### Q46 Readiness review

**Source:** New. **Prerequisites:** Q45. **Effort:** 10–16 h.
**Topics:** defending the portfolio and capstone in an interview-style review; answering a changed
requirement live.

### S10 Mobile track (optional)

#### QM01 The mobile testing landscape

**Prerequisites:** Q34. **Effort:** 8–12 h.
**Topics:** native, hybrid and mobile web; emulators and real devices; device clouds and their cost.

#### QM02 Appium and WebDriver on Android

**Prerequisites:** QM01. **Effort:** 20–34 h.
**Topics:** Appium architecture; locators in native apps; sessions and capabilities.

#### QM03 Mobile test design

**Prerequisites:** QM02. **Effort:** 14–24 h.
**Topics:** gestures, permissions, interruptions, rotation, poor networks, app lifecycle.

#### QM04 Mobile project

**Prerequisites:** QM03. **Project:** BookingLab mobile client. **Effort:** 20–32 h.
**Exit:** A mobile suite for the BookingLab client, graded by the kit.
