---
document_id: FSSE-HTTP-STUDENT-14
version: "1.0.0-draft"
date: "2026-09-21"
module: M021
candidate_lesson_id: LS-M021-06
course_order: 14
status: "Student-facing investigation draft; learner and browser review pending"
prerequisites: ["Selected representations and source dependencies: Lesson 9", "Freshness versus validation: Lessons 10–11", "Conditional cases and HEAD: Lesson 12", "Origin, browser cache, and page observations: Lesson 13", "Hypotheses and small code traces: Lessons 6–8"]
introduced_concepts: ["A validator invariant across two requests", "Discriminating experiments in an unfamiliar repository", "An incomplete dependency used to validate changed content", "Observations versus reports and scope of conclusions"]
learning_outcomes: ["Reproduce a stale-notice incident using preserved response evidence", "Distinguish a failed save from an incorrect validation decision", "Trace selected content and validator inputs to explain the defect", "State a bounded diagnosis and a regression requirement"]
exercise_kit: HTTP_Lessons_14_15_Investigation_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-14-15
lab_initial_state: "incident scenario; baseline data; original supplied implementation"
runtime_target: "Node.js 24.x, curl 7.68+ for ETag file options; optional browser observation"
assessment_scope: "An investigation using taught mechanisms; hints and full walkthrough available; independent competency is not awarded automatically"
deferred: ["Repair and regression evidence: Lesson 15 / M021-07", "Formal peer-review revision: M021-08", "Later fresh independent transfer: M021-09", "Intermediaries and wider production incidents: M022 and later reliability work"]
---

# Lesson 14: The notice changed. Why are returning visitors still seeing the old one?

Until now, we have used a correct server to learn what caching is supposed to do. You could change the source, predict a response, and compare the result with a known mechanism.

Now you inherit a small service with a reported defect. The task is to work out which explanation the evidence supports. You already have the HTTP concepts needed; the new difficulty is combining them while reading code you did not write.

By the end, you should be able to reproduce the problem, explain where the wrong decision originates, and describe a test that would catch it. We will make and defend the repair in Lesson 15.

## 1. Read the report as a starting point

Here is the fictional support report supplied with the exercise:

> Riverside café changed today's closing time from 17:00 to 18:00. The editor says the change saved. Some returning visitors still see 17:00. A colleague thinks the database did not save. Another says a hard refresh fixes it. The page's colours changed recently too.

Which sentences describe observations, and which offer explanations? “A visitor saw 17:00” is an observation to reproduce. “The database did not save” is a hypothesis. “A hard refresh fixes it” needs a more precise description of the action and what happened afterwards.

This repository actually stores the incident's source in a JSON file. There is no database service to repair. The inaccurate database reference is deliberate: a real report can use the wrong technical language while describing a real symptom. Respect the report without treating every proposed mechanism as established.

The packet in `incident-packet/` gives the product contract, stakeholder messages, and one recent change. Those messages are authored exercise material, not recordings from a real production system.

## 2. Recover the useful model

Return to the café notice photograph from Lesson 11. You have a photograph of a notice and a label identifying its edition. You telephone the café, give the label, and ask whether you need a replacement photograph.

Suppose the café's labelling process looks only at the heading “Riverside café notice.” It ignores the closing time written underneath. Tomorrow the closing time changes, but the heading stays the same. The clerk compares your old label with the current label and honestly reports that they match.

The clerk's comparison can be implemented perfectly and still produce an unhelpful answer. The label failed to represent a change that matters. Inspecting only the comparison would miss the earlier mistake.

This is a model to reason with, not yet proof of this incident's cause. The exercise asks you to find evidence for or against it.

The requirement we need is an **invariant**: a relationship that must remain true across the relevant operations. For this service, if the selected notice changes from “17:00” to “18:00,” a request carrying the earlier notice's validator must not be told that the old notice still applies.

We use strong validators for these uncompressed JSON representations. A strong validator must distinguish relevant changes to the representation data. The local contract additionally asks for stable tags when the selected bytes do not change, so useful conditional reuse remains possible. That stability requirement is our fixture's contract; do not turn every extra tag change into a claim of a protocol violation. [Validator semantics, reviewed 2026-09-21](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8)

If these distinctions are still uncertain, revisit Lesson 9's source-to-body comparison, Lesson 11's saved body/tag pair, or Lesson 12's conditional matrix before continuing. You can use those lessons as references throughout the investigation.

## 3. Open the unfamiliar service

Extract **HTTP_Lessons_14_15_Investigation_Kit_v1.zip** into a new folder. Open `http-lessons-14-15-lab` in VS Code. Keep your earlier kit and observations; this is a separate case.

From this new folder, restore the incident's data:

```sh
node state.mjs baseline
```

This sets the café's title, closing time, and internal note back to their supplied values. It does not reset code edits, erase notes, clear a browser cache, or change the transfer case. A fresh extraction supplies the original code when you need to start the entire investigation again.

Start the incident server in Terminal A:

```sh
node server.mjs incident
```

It listens at `http://127.0.0.1:4321`. If that port is occupied, choose another allowed port, such as `node server.mjs incident 4322`, and use that port consistently. Open Terminal B in the same folder for the commands below. Use `curl.exe` instead of `curl` in Windows PowerShell.

The service reads incident data for each API request. Code modules are loaded by the running process: after editing code, stop and restart it. Do not restart merely to apply one of the incident data changes.

Read `incident-packet/Contract.md` before opening a solution. In particular:

- `/api/notice` selects a full title/message object.
- `?view=short` selects only the closing time.
- Successful notice responses use `private, no-cache`, so stored responses require validation before reuse.
- The service supports GET and HEAD, including the conditional behavior developed in Lesson 12.

This is not the five-minute freshness experiment. An old result here cannot be explained merely by an intentional five-minute permission to skip validation.

## 4. Plan comparisons before changing code

Write two or three explanations that could account for the report. For each, choose a comparison whose outcomes would differ depending on whether that explanation is true.

Here is one worked example:

> Hypothesis: the changed closing time never reaches the service's source. If so, reading the source and making a direct ordinary request should both still show 17:00. If they show 18:00 while a request using the old validator receives 304, that hypothesis does not explain the full sequence.

You can apply the same pattern to these possibilities:

| Possibility | A useful comparison |
| --- | --- |
| The source change did not persist | Read source state before and after the controlled edit |
| The origin builds the wrong current content | Inspect an ordinary response without a condition |
| The origin incorrectly validates the older content | Compare an ordinary response with a request carrying the preserved old validator |
| The page's rendering change causes the entire problem | Try reproducing the inconsistent responses with curl, without running page code |

The comparisons are useful because they separate mechanisms. Running the same refresh gesture ten times without recording its inputs usually does not.

## 5. Preserve the earlier answer

With baseline data, use one command to capture the initial body, headers, and tag:

```sh
curl --etag-save observations/before.etag --dump-header observations/before.headers --output observations/before.json "http://127.0.0.1:4321/api/notice"
```

Open the files in VS Code. Check the status, cache policy, JSON message, and complete quoted ETag. The expected starting message is “Today we close at 17:00.” Do not rely on an exact hash printed in someone else's notes.

Next check the unchanged case:

```sh
curl -i --etag-compare observations/before.etag "http://127.0.0.1:4321/api/notice"
```

An unchanged notice should produce 304 without a body. That successful case is valuable: the service is not simply broken on every conditional request.

These ETag file options need curl 7.68 or newer. If unavailable, use Lesson 11's header-file approach: save the actual initial tag in a file containing `If-None-Match: ` followed by that quoted tag, then supply it with `-H "@observations/condition.headers"`. The file-header option requires curl 7.55 or newer. The comparison must use the actual old tag, whichever supported command you use.

## 6. Change one selected value

Write your prediction before the next requests. Then make the controlled edit:

```sh
node state.mjs later
node state.mjs show
```

Run the commands separately. `later` sets the closing time to 18:00; `show` reads the source without modifying it. Inspect `cases/incident/data.json` as well.

Retrieve the current origin answer under different capture names:

```sh
curl --etag-save observations/after.etag --dump-header observations/after.headers --output observations/after.json "http://127.0.0.1:4321/api/notice"
```

Now ask about the **old** copy:

```sh
curl -i --etag-compare observations/before.etag "http://127.0.0.1:4321/api/notice"
```

Keep `before.etag` unchanged. Replacing it with the new response's tag before the comparison would ask a different question and could hide the defect.

Compare the two bodies, the two tag files, and the conditional outcome. With the supplied implementation, the ordinary request can return 18:00 while the conditional request still returns 304. The selected content changed but its validator did not.

This establishes more than “the screen looks old.” It gives a reproducible disagreement between the representation the origin can currently send and the origin's decision about an older representation.

An eligible cache trusts the validator and conditional response supplied by the origin; it does not receive the new body inside the 304 to compare for itself. That explains how a wrong origin decision can keep an old response in use. [Updating stored responses after validation, reviewed 2026-09-21](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.3.4)

## 7. Locate the decision in the code

If you want to investigate without a file-level hint, pause here and follow the request through `server.mjs` and `handler.mjs`. The walkthrough remains available below.

Start by locating where the handler reads source data, selects a representation, compares a condition, and chooses a response. Those are four different jobs. A correct conditional comparison cannot compensate for an incorrect input tag.

In `cases/incident/representation.mjs`, the essential excerpt is:

```javascript
const body = encode(value);
const etag = tagFor(encode({ title: state.title, view }));
return { body, etag };
```

Read this excerpt; it is not a replacement file. `value` was selected immediately above it. For the full view, it contains the title and a message built using `state.closingTime`. For the short view, it contains only the closing time.

`encode` is the supplied JSON formatting helper. `tagFor` calculates a quoted fingerprint from the text passed to it. Their small implementations are in `support/encoding.mjs`; Lesson 11 explained why a fingerprint is one possible validator strategy. We are not asking you to implement cryptography.

Now compare the dependencies:

| Selected output | Inputs used in the supplied implementation |
| --- | --- |
| Full body | Public title and closing time |
| Short body | Closing time |
| Validator input | Public title and selected view name |

The closing time affects both body choices but not the tag input. Changing 17:00 to 18:00 therefore leaves the comparison key unchanged. The handler then sees a matching condition and makes the otherwise familiar 304 decision.

This is the causal explanation. The ordinary request read the saved update correctly. The validator construction lost a dependency before the condition was evaluated.

## 8. Deal with the distracting change

The packet includes a small style diff. The changed colour can affect appearance, but that property is not an input to the notice body or tag. More decisively, the inconsistency reproduces with curl when no page script or style is involved.

That is evidence for setting the style change aside in this incident. It is not a universal rule that frontend changes never cause stale content. A different page could have an incorrect rendering condition or its own application cache. Follow the actual dependency and observation paths.

Likewise, changing the title might make one failed comparison look repaired because this implementation does incorporate the title. A workaround that happens to change the tag does not establish that closing-time edits will work tomorrow.

## 9. Optional browser observation

The command-line path already reproduces the origin defect. You can also connect it to the returning-visitor experience using the supplied `/lab` page. These steps describe expected behavior; record your actual browser results.

1. Restore baseline data while retaining the original incident implementation.
2. Open `http://127.0.0.1:4321/lab`. Keep Network **Disable cache** unchecked and use `/api/notice` in the target field.
3. Press **Start with a current copy**. Confirm 17:00 and `private, no-cache`.
4. Run `node state.mjs later` in Terminal B.
5. Press **Read normally** or **Validate the stored copy**. Inspect the request condition, origin status, and body exposed to the page.
6. Press **Bypass storage for this read**. Compare it with another normal read, without treating the bypass itself as a repair.

Under the intended cache conditions, the faulty origin validates the old response, while the bypass can retrieve the newer body. If your browser has no retained entry or is bypassing its cache, you may see a different sequence. Check settings and request evidence rather than rewriting your notes to match the expected narrative.

Browser behavior needs an actual browser rehearsal. The kit's automated HTTP checks are not a substitute for that observation. You may complete the origin diagnosis using the CLI while documenting this limit.

## 10. Hints you can use at any point

**Hint 1 — direction:** Compare the answer without a condition with the answer using the preserved old tag.

**Hint 2 — subsystem:** If the ordinary response has the new content, follow how the system decides whether it may omit that content during validation.

**Hint 3 — diagnostic:** List the source values that determine the selected body beside those that determine the tag. Which change influences only one list?

**Hint 4 — source trace:** Follow `createReader` in the incident's representation module. The tag's input contains the title and view, while the body also depends on the closing time.

**Full explanation:** Sections 5–8 provide the complete causal walkthrough. If you used it, reproduce one comparison yourself and explain why the unchanged case is still useful. Record the help used without discarding the reasoning you did independently.

## 11. Practice: turn the diagnosis into a defensible claim

### Practice A: the smallest convincing comparison

Keep the initial body/tag, one controlled source change, an ordinary current response, and a conditional response using the old tag. Explain what each contributes. Which result rules out a failed save as the complete explanation?

### Practice B: review the tempting fix

A colleague proposes changing the title whenever the closing time changes. Explain why that might make today's symptom disappear, and why it leaves the dependency problem in place. What future edit would expose the weakness?

### Practice C: bound your conclusion

Write a short diagnosis with observed behavior, causal path, the violated requirement, and one limit of your evidence. If you used only curl, make that clear. If you did not finish, describe your strongest supported finding and the next discriminating experiment.

### Practice explanations

For A, the earlier body/tag identifies the old copy; the source edit supplies a controlled cause; the ordinary response proves the running origin can construct the new notice; and the old-tag request tests the claim that the earlier copy still applies. An ordinary 18:00 body together with a false 304 cannot be explained solely by a failed save.

For B, changing the title changes an input the existing validator does include. It masks the missing closing-time dependency. Another closing-time change without a title change repeats the defect. It also makes an internal technical workaround part of an unrelated editorial action.

For C, a useful diagnosis says the origin constructs changed content but derives its tag from inputs that omit the closing time, causing old-tag requests to receive 304. A CLI reproduction establishes that origin behavior. It does not by itself establish every browser's cache state or the scope of a real-world incident.

## 12. Carry evidence into the repair

Keep the failing sequence and state the outcome it should have produced: after a selected closing-time change, the old-tag request should receive the current representation with 200 and an appropriate new validator. Also keep the unchanged case that should continue to receive 304.

Those two requirements pull in different directions if the proposed fix is “always send the body.” Lesson 15 will turn your comparison into a regression test, repair the dependency, and check that useful behavior survives. The aim is a correct relationship you can explain, not a refresh ritual that happens to look successful once.
