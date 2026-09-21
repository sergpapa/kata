---
document_id: FSSE-HTTP-STUDENT-08
version: "1.0.0-draft"
date: "2026-09-18"
audience: "A learner who has traced and changed the cafe handler in Lessons 6–7"
module: M020
candidate_lesson_id: LS-M020-08
status: "Student-facing draft; owner review pending"
prerequisites:
  - "Explain the Lesson 7 hours contract and positive/negative checks"
  - "Inspect a response with curl and connect it to a handler decision"
  - "Distinguish saved source from a running process"
introduced_concepts:
  - "A hypothesis, a diagnostic comparison, and a control request"
  - "A route table using object keys; property lookup and an explicit membership check"
  - "A regression case, an evidence-based repair explanation, and a changed transfer case"
learning_outcomes:
  - "Investigate wrong content under a successful status in a small unfamiliar handler"
  - "Connect the failing response to the source decision and demonstrate a repair"
  - "State what evidence supports the conclusion and what it does not establish"
exercise_kit: HTTP_Lessons_06_08_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-06-08
runtime_target: "Node.js 24.x and curl; curl.exe in Windows PowerShell"
assessment_scope: "A bounded investigation using taught mechanisms; the later transfer activity is practice, not automatic independent competency certification"
deferred: ["HTTP cache investigation: M021", "Production incidents with incomplete telemetry: M062", "Security attack/repair labs: M041", "Distributed rate limiting: M043/M048"]
---

# Lesson 8: The reply arrived. Why is it the wrong one?

A colleague sends you this report:

> “The opening-hours feature is broken. I ask for hours, but I get the drinks menu. The request says 200, so perhaps the display is confused. The menu itself still seems fine.”

This time you do not receive an instruction saying which line to change. You receive a reported symptom, a small repository, and the expected behavior. Your job is to turn those into an explanation you can support.

You already have the necessary HTTP ideas. We will introduce one different way to organize the handler's data before asking you to reason about it. The investigation is deliberately small; later incidents will combine more mechanisms and less complete information.

You may use hints or read the complete walkthrough at any point. Keep a note of what you worked out and what help supplied. The point is to learn a method you can reuse, including when the first explanation that comes to mind is wrong.

## 1. A correct delivery can contain the wrong card

Imagine asking at the café counter, “What time do you close on weekdays?” The person promptly says, “Here you are,” and gives you a drinks menu.

Several things worked. Your request reached a person. They replied. A legible card reached your hands. Yet your actual question remains unanswered.

You could investigate several possibilities. Perhaps they misheard you. Perhaps the drawer marked “hours” contains menus. Perhaps you asked another café by mistake. These explanations lead to different checks.

If you only ask whether a card arrived, you cannot distinguish them. You need to compare what was requested with what was supplied, then follow the decision that connected the two.

That is the relationship in this incident. A 200 status reports success for the exchange, but we still need to compare its content with the application's promise. The analogy does not identify the bug for us; it helps us choose evidence that could.

## 2. Establish which system you are investigating

Use the same extracted kit. Keep the main `handler.mjs` you changed in Lesson 7. The incident lives separately under `incidents/hours`.

Stop the Lesson 7 server with Ctrl+C in its terminal. From the **root of `http-lessons-06-08-lab`**, start the incident:

```sh
node incidents/hours/server.mjs
```

The startup label should begin:

```text
Lesson 8 hours investigation is listening on http://127.0.0.1:4317
```

The printed handler location should end in `incidents/hours/handler.mjs`. If it names the main handler instead, you are investigating the wrong running copy.

If you need another port, use `node incidents/hours/server.mjs 4318` and change every manual request accordingly. The test commands later still use their own temporary ports.

The agreed contract is the same as Lesson 7: GET hours returns the fixed weekdays/weekend values, GET menu returns the original menu, HEAD omits its body, POST on a known route is refused, and unknown paths remain missing. The incident is a different implementation of that agreement.

## 3. Reproduce the report before editing

In Terminal B, make these two requests separately:

```sh
curl -i "http://127.0.0.1:4317/api/hours"
curl -i "http://127.0.0.1:4317/api/menu"
```

Use `curl.exe` in Windows PowerShell. Read the actual output before looking for a source-code fix.

Record the following fields for each request:

| Evidence | What to record |
| --- | --- |
| Target | The host, port, and path you actually requested |
| Reported outcome | The response status |
| Content description | The Content-Type value |
| Content | Which data keys and values arrived |
| Program identity | The startup label and handler location |

In the untouched incident, both requests receive 200 and JSON, but hours receives menu data. The menu request is our **control request**: a nearby behavior expected to work. It helps us see that this process can provide useful responses and that the mismatch is associated with a particular request.

The control does not prove that every other part of the service is correct. It makes our comparison more specific.

Also observe what curl contributes. It does not use the café page's rendering code. If it receives the wrong content for hours, a defect solely in that page's display cannot explain this particular observation. A display problem could still exist separately; we now have evidence of a wrong HTTP response to investigate.

## 4. Write hypotheses that lead to checks

A **hypothesis** is a possible explanation that you can examine. “Something is broken” describes the situation but does not help select an experiment.

Here are three useful candidates before inspecting the handler:

| Hypothesis | A check that would help |
| --- | --- |
| I contacted the wrong running copy | Compare startup label, printed source location, and the request address |
| The request target differs from the intended target | Compare the exact curl command and the server's request summary |
| The intended handler selects the wrong data | Trace the hours path through the source and inspect the selected value |

You do not need to invent a long list. Prefer a few plausible explanations and checks that separate them. Keep evidence and interpretation distinct: “the command uses `/api/hours`” is an observation; “therefore the response-selection code is worth inspecting next” is a conclusion drawn from several observations.

The colleague's “perhaps the display is confused” is also a hypothesis. It is not an instruction to start editing the frontend. Reports often mix accurate symptoms with guesses about their cause.

### Practice A: choose your next comparison

Before reading further, record which hypothesis you would check next and why. What result would make you revise it? If you have already inspected the source, say so and explain which evidence you used.

## 5. Read a different arrangement of familiar ideas

Open `incidents/hours/handler.mjs`. The file still receives a request, selects a path, checks a method, and sends JSON. However, it stores path-to-data choices together in an object called `routes`.

First understand this smaller illustration. It is not a replacement file:

```javascript
const openingCard = { weekdays: '08:00-17:00', weekend: 'Closed' };
const cards = {
  '/hours': openingCard,
};
const wantedPath = '/hours';
const selectedCard = cards[wantedPath];
```

The key `'/hours'` labels an entry. Its value is the `openingCard` object. Square brackets in `cards[wantedPath]` mean: use the current value of `wantedPath` as the property name to look up. The result is the object stored under `'/hours'`.

This is different from `cards.wantedPath`, which would ask for a property literally named `wantedPath`. Our request path changes from one request to another, so the bracket form lets the program use that variable value.

The incident also uses:

```javascript
const knownPath = Object.hasOwn(routes, path);
```

For this exercise, read that as “does this route table contain its own entry with this key?” It produces a boolean: either `true` or `false`. The condition `if (!knownPath)` uses `!` to mean “not,” so that block handles the missing-entry case. We use an explicit entry check rather than assuming any property lookup establishes a configured route.

You now have the additional reading mechanism needed for this file. If bracket lookup remains unclear, trace the small illustration on paper before continuing. The challenge should be choosing and evaluating evidence, not guessing untaught syntax.

## 6. Trace the selected value

For the exact failing request, answer these questions using the incident file:

1. What does `path` contain?
2. Does the table contain that key?
3. Does GET pass the method check?
4. Which value does `routes[path]` supply to `sendJson`?
5. Does that value match the hours contract?

Write the value's name and its contents. Merely saying “the route is wrong” leaves the mechanism unexplained.

Try this trace before opening the walkthrough below. If you are stuck, choose the smallest useful hint from `reference/Hints_and_Walkthroughs.md`. The hints and full solution remain available; you can also continue reading here.

### Walkthrough: connect the source to the observed reply

The file defines `menu` and `hours` values. Both contain sensible data. That fact alone does not determine which one is returned.

In the faulty table, the entries are:

```javascript
const routes = {
  '/api/menu': menu,
  '/api/hours': menu,
};
```

For `/api/hours`, the membership check succeeds because that key exists. GET passes the method check. But the value associated with the hours key is `menu`. The final call passes that value to the JSON helper, which correctly serializes what it received.

This explains the complete observation: a known path, an accepted method, status 200, valid JSON, and the wrong data. No failure of JSON parsing or browser display is needed to produce the symptom. The content-selection relationship is wrong.

Notice what we did not learn merely from looking at the constants: having correct hours data somewhere in the source does not ensure a request can receive it. We had to follow how the data was selected.

## 7. Capture a failing check, then repair the relationship

Before editing, run:

```sh
node --test checks/lesson-08.test.mjs
```

These tests load the incident handler, not your main Lesson 7 file. The hours-content cases should fail in the untouched incident. Read one failure and connect it to the response you observed with curl. The tests compare the body with the required content; a 200 alone cannot satisfy them.

Now repair the route-table entry in `incidents/hours/handler.mjs` so the hours key selects `hours`:

```javascript
const routes = {
  '/api/menu': menu,
  '/api/hours': hours,
};
```

Save and rerun the Lesson 8 checks. With this repair, all eight should pass. Restart the incident server after saving, then repeat both manual GET requests. Confirm that hours changed to the correct data while menu retained its original data.

The previously failing check is now a **regression check**: it can catch this broken behavior if a later edit introduces it again. Its value comes from checking the relationship promised to the client, rather than checking that the source contains a particular variable name.

You can inspect the full repaired file in `reference/lesson-08-handler.mjs`. Equivalent repairs are possible. The route-table edit is useful here because it directly corrects the mistaken association and preserves the surrounding behavior.

## 8. Challenge an attractive incomplete fix

Suppose someone proposes this change at the end of the handler:

```javascript
sendJson(request, response, 200, hours);
```

It would make the hours request receive hours. Why is that insufficient?

Trace the menu request. It reaches the same final call and now receives hours too. The proposal fixes the reported example by discarding the distinction between supported paths. The menu control and its test reject it.

Another proposal changes the successful status to 404 whenever the path is `/api/hours`. That would stop reporting success, but it would not supply the agreed information. It may describe a temporary withdrawal of a broken feature under a different operational decision; it does not satisfy this repair task.

This is why the investigation includes a contract, a control, and negative cases. “The screenshot looks different” or “the original symptom disappeared” is not enough to show that the intended behavior was restored.

## 9. Practice: write an engineering explanation

### Practice B: your short incident note

Write a note another developer could review. Include the reported symptom, the two requests you compared, the observed mismatch, the source decision that explains it, the change, and the checks you repeated. Finish with a limit of your conclusion.

For example, a supported limit is that these local checks cover the stated route contract, not the behavior of a deployed service under load. If you read the walkthrough before diagnosing the cause, record that assistance. The explanation can still show what you now understand.

Here is a model explanation based on the supplied fixture, not a claim about your execution:

> GET hours returned 200 with menu JSON, while GET menu returned the expected menu. The incident's route table associated both paths with the menu object, so the handler's successful branch selected the wrong data for hours. Associating the hours path with the hours object corrected that relationship. The hours-content check fails before this repair and passes afterward; menu, missing-path, and method cases protect the surrounding contract. Manual confirmation requires restarting the intended process. These checks do not establish production readiness.

Compare the reasoning structure with your note. You do not need to copy its wording.

## 10. Return later for a changed case

Once you have worked through the first investigation, stop its server. You can take a break and return to this activity later. It uses the same contract but a different cause; the first edit is not a universal answer.

From the lab root, start:

```sh
node incidents/transfer/server.mjs
```

This report is shorter:

> “The menu works. The documented opening-hours request comes back as not found.”

### Practice C: investigate the changed case

Use the same method: identify the running copy, reproduce the exact request, choose a comparison, and trace the selection. Find a repair that preserves the documented path `/api/hours`. Changing the client to an accidental server path would hide the contract mismatch rather than restore the agreed interface.

The checks for this copy are:

```sh
node --test checks/transfer.test.mjs
```

Record the failing behavior before repair and the passing behavior after. Stop and restart this manual server after saving changes. Keep the original and transfer notes separate so you can explain how their causes differ.

Hints and the full explanation are in `reference/Hints_and_Walkthroughs.md`, with a repaired implementation in `reference/transfer-handler.mjs`. They are available whenever needed. If you study the solution first, treat this as worked practice; a later unfamiliar case is needed before claiming independent transfer.

## 11. The boundary of this first HTTP block

You can now connect a request to a small handler's decisions, change a response contract, and investigate a mismatch using source and observations. That is a stronger foundation than recognizing status codes, but it is still a bounded local system.

Next, caching changes the situation. A stored copy may participate in what a user sees. Before investigating a stale page, we must explain what a representation is, when a stored response may be reused, and how a server can answer a check without sending a new body. Those explanations come before the deeper investigation.

Rate limiting and security will build on the same habit: understand what the system is supposed to do, identify the inputs and boundaries, observe a controlled failure, and defend a repair. We will add those mechanisms in their own sequence rather than expecting today's small handler to teach them all at once.

Save your notes and use the accompanying owner review form to identify any place where the code, explanation, or investigation made an unsupported jump. Stop the local server when you finish.
