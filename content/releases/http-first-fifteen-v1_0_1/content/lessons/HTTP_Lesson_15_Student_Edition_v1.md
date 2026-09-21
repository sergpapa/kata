---
document_id: FSSE-HTTP-STUDENT-15
version: "1.0.0-draft"
date: "2026-09-21"
module: M021
candidate_lesson_id: LS-M021-07
course_order: 15
status: "Student-facing repair draft; learner and browser review pending"
prerequisites: ["Reproduce and explain the incident from Lesson 14", "Read small asynchronous request tests from Lesson 7", "Conditional case matrix from Lesson 12", "Distinguish observation layers and bypass from repair from Lesson 13"]
introduced_concepts: ["An incident comparison expressed as a regression test", "Behavioral repair acceptance and preserved unchanged cases", "Alternative validator strategies under explicit constraints", "In-process reuse keyed by a selection; a supplied Map reading bridge", "A bounded transfer check with a different failure location"]
learning_outcomes: ["Show a meaningful test failing before a repair and passing afterwards", "Repair validator dependencies while preserving conditional behavior", "Defend a fix using changed, unchanged, HEAD, failure, and variant cases", "Distinguish wrong selected content from a validator that misdescribes correct content"]
exercise_kit: HTTP_Lessons_14_15_Investigation_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-14-15
lab_initial_state: "original incident implementation for the regression; separate transfer scenario starts faulty"
runtime_target: "Node.js 24.x; curl; optional Chrome/Chromium observation"
assessment_scope: "Repair, regression design, and supported transfer; full solutions available; later fresh independent transfer remains M021-09"
deferred: ["Formal review and response to feedback: M021-08", "Fresh independent transfer: M021-09", "Origins and cookie scope: M021-10", "Mutable shared caches, invalidation, and concurrency: M043 and M048"]
---

# Lesson 15: Repair the cause—and make the evidence survive your fix

You found a relationship that the service breaks: a visible closing-time change can leave the validator unchanged, so an earlier copy is incorrectly validated. Now you need to change the implementation without losing behavior that already works.

This lesson asks three questions. Can a test demonstrate the original defect? Does the repair satisfy both changed and unchanged cases? Can you recognize a different cause when another service produces a similar symptom?

Keep your Lesson 14 observations. A repair becomes easier to review when the evidence explains why the code had to change.

## 1. Turn the requirement into a regression

A **regression test** preserves an important behavior as a repeatable check. Here, the behavior was already required but broken. After repair, the test helps detect a later change that reintroduces the defect.

Think of testing an edition-label printer. Printing one label successfully tells you little. Print a label for one notice, change its closing time, and print again. Then check whether the earlier label still incorrectly describes the new notice. The sequence and relationship matter more than the incidental characters in the label.

The same applies to our HTTP test. Do not assert that the ETag equals a particular hard-coded hash. Assert that the old-tag request after a relevant edit receives the required current content, while an unchanged request can still validate successfully.

Open `checks/learner-regression.test.mjs`. It contains a skipped worksheet:

```javascript
test.skip('my regression: a changed notice must not validate the old copy', () => incident(async (send, state) => {
  // Retrieve the original response, change a selected source field,
  // then send the original validator and assert the required outcome.
}));
```

This excerpt is a worksheet to complete. A skipped test is not a pass and supplies no evidence that the defect was exercised. Replace `test.skip` with `test` only when you add meaningful requests and assertions.

## 2. Understand the supplied test boundary

The test helper `incident` starts a real temporary loopback HTTP server using this kit's handler. It gives your callback a `send` function and a controlled `state` object. The server's source reader uses that object for this test instead of the on-disk data file.

- `send('GET', '/api/notice')` performs an actual local request and returns status, headers, and body.
- `await` waits for the request result before the next step of this callback.
- `state.closingTime = '18:00'` changes the controlled source that the following request will read.
- The helper stops its server when the callback finishes, including when an assertion fails.

These tests do not use your manually running server or depend on port 4321. They do not modify your observation files or simulate a browser cache. The actual implementation under test still comes from the incident case's source file.

This boundary makes the failure reproducible without coordinating a file edit in another terminal. Lesson 14's CLI comparison separately checked the running service and its real data file. The two forms of evidence answer related questions through different setups.

## 3. Write the comparison before changing the implementation

Try completing the worksheet from your own diagnosis first. The complete version below is available whenever helpful; you can also find it in `reference/learner-regression.test.mjs`.

Replace the worksheet file with this complete test if using the worked version:

```javascript
import test from 'node:test';
import assert from 'node:assert/strict';
import { incident } from './fixtures.mjs';

test('changed closing time supplies a replacement for the old copy', () => incident(async (send, state) => {
  const before = await send('GET', '/api/notice');
  state.closingTime = '18:00';
  const after = await send('GET', '/api/notice', {
    'If-None-Match': before.headers.etag
  });
  assert.equal(after.status, 200);
  assert.equal(JSON.parse(after.body).message, 'Today we close at 18:00.');
  assert.notEqual(after.headers.etag, before.headers.etag);
}));
```

The last three assertions check different things: the conditional outcome, the actual selected content, and the relationship between validators. A status alone would miss a 200 response containing the old notice. A changed tag alone would miss a system that changes tags but still selects the wrong content.

From the kit root, run:

```sh
node --test checks/learner-regression.test.mjs
```

With the original incident implementation, the completed test should fail: the status is 304 where the requirement calls for 200. Keep that failure. A syntax error or missing import is a different kind of failure and does not establish that the regression caught the incident.

If the test is skipped, it has not run. If it passes before you have repaired anything, check whether you already edited the implementation, accidentally compared the new tag, or changed the public title along with the closing time. A fresh extraction lets you recover the original case without overwriting your current work.

## 4. Choose what the validator should describe

The body builder already selects the intended content. The missing relationship is between that selected body and its tag.

A direct repair is to fingerprint the exact body text that the response will use. The existing helper already performs that operation; give it the selected body as input.

The complete worked replacement for `cases/incident/representation.mjs` is:

```javascript
import { encode, tagFor } from '../../support/encoding.mjs';

export function createReader() {
  return (state, view) => {
    const value = view === 'short'
      ? { closingTime: state.closingTime }
      : { title: state.title, message: `Today we close at ${state.closingTime}.` };
    const body = encode(value);
    return { body, etag: tagFor(body) };
  };
}
```

You can make the smaller edit yourself or copy this replacement from `reference/incident-representation.mjs`. The reference file's imports are written for its destination under `cases/incident/`; do not execute it from the reference folder.

The conditional parser and response decision do not need to change. They will receive a tag that now follows the content they are being asked to validate.

Notice what happens in both views. Changing the closing time changes both selected bodies and their tags. Changing the title affects the full body but not the short body. Changing only the internal note affects neither. Deriving the tag from the selected bytes keeps these relationships together as the body builder evolves.

This is a useful engineering pattern: derive dependent metadata from the final selected value when practical, instead of maintaining a second hand-written list of fields that is easy to forget to update.

## 5. Re-run a meaningful set of cases

Run your completed regression, then the supplied incident suite:

```sh
node --test checks/learner-regression.test.mjs
node --test checks/incident.test.mjs
```

Run these as separate commands. The complete regression should now pass. The supplied incident suite has 22 checks; the unchanged starter has five failures, while the worked repair passes all 22.

Read the cases as requirements, not a green total:

| Case | What the check protects |
| --- | --- |
| Closing-time edit and old tag | A changed selected notice is not falsely validated |
| Unchanged content | Conditional reuse continues to work |
| Internal-note edit | Unselected source data does not defeat the fixture's reuse requirement |
| Public title edit in the short view | The tag follows this selected view, not every public field |
| Full versus short view | A tag from one different representation does not validate the other |
| Ordinary and conditional HEAD | Status and metadata remain correct even though no content is sent |
| Missing path and unsupported method | Conditions do not hide ordinary request failures |
| Weak, list, and wildcard conditions | The supplied comparison contract still holds |

The internal-note and short-title checks enforce an efficiency/stability requirement stated in this exercise. Their failure is not the same as falsely declaring changed bytes equivalent. Explain the difference when reviewing an alternative fix.

Tests sample the stated behavior. They do not prove all possible inputs, runtime environments, future selection rules, or user experiences. The reasoned explanation remains part of the repair evidence.

## 6. Check the manually running service too

Your server process does not automatically reload edited modules. Stop Terminal A with Ctrl+C and start `node server.mjs incident` again.

Then repeat the short sequence from Lesson 14 using separate `repaired-before` and `repaired-after` capture names:

1. Restore baseline incident data.
2. Retrieve and save the 17:00 body and tag.
3. Change only the closing time with `node state.mjs later`.
4. Present the preserved 17:00 tag. Expect 200 with the 18:00 body.
5. Retrieve and save the current tag under the new name.
6. Present that current tag without another source change. Expect 304 without a body.

If you are rehearsing the browser sequence, seed a known baseline response after restarting, make the same source edit, and inspect the normal validation path. Expect a replacement after the edit and a valid unchanged comparison afterwards. Record the browser's actual behavior and cache settings.

Do not report the browser as verified merely because the Node suite passed. Do not test only the “start with a current copy” button: that path can look successful while a conditional path remains wrong.

## 7. Compare alternatives without turning one implementation into dogma

Several strategies can produce a useful validator. Their assumptions and maintenance costs differ.

| Proposal | What to assess under this contract |
| --- | --- |
| Hash the selected body | Directly follows emitted bytes; this fixture builds the body before hashing, so body-generation work is not avoided |
| Track a representation revision | Can avoid rebuilding content to determine a tag, but every relevant edit and selection change must advance the right revision; explain how that relationship is maintained |
| Hash the entire source object | Detects the visible edit, but changes tags for internal notes and short-view-irrelevant fields, missing this exercise's stability requirement |
| Add the closing time to today's partial tag input | May address today's visible edit, but needs a complete account of each selected view and future body changes |
| Produce a new tag for every request | Avoids some matches by defeating stable reuse; it does not satisfy this exercise's unchanged-case requirement |
| Always return 200 | May be a temporary mitigation under a changed operational contract; it does not satisfy this task's required conditional reuse |

An alternative should be judged by behavior and a defensible change rule. The assignment does not require SHA-256 specifically or an incidental variable name. A revision-based implementation could be acceptable if it genuinely meets the declared relationships; simply naming a counter does not make its update rules correct.

The two-sided reasoning matters. Avoiding a false 304 protects content correctness. Avoiding unnecessary invalidations preserves useful reuse. Those goals are related, but they are not identical.

## 8. Describe the repair so another engineer can assess it

A compact review note should cover the reported behavior, reproduced evidence, cause, change, checks, and remaining limits. For example, this is a **worked outline**, not a claim that you ran it:

> A closing-time edit changes the current full notice, but the original tag used only title and view. The old-tag request therefore received 304. I derived the tag from the selected body, kept conditional handling intact, and checked changed and unchanged responses in both views. My saved regression failed before the change and passed afterwards. Browser observations are listed separately from protocol checks.

Replace the outline with your actual results. If you studied the full solution first, say so. If a setup issue prevented a browser check, state the supported protocol result without inventing the missing observation.

This is useful engineering communication because another person can challenge the causal claim and repeat the important comparison.

## 9. A new symptom: the wrong edition arrives even on an ordinary request

Now try the separate transfer case. It changes the source-selection rule and introduces server-side saved results. The tags in this case already fingerprint their associated bodies correctly. Copying the previous tag calculation will not repair the selection mistake.

This short task is supported practice in transfer. It does not replace the later fresh independent task planned for M021-09. Reading its walkthrough changes the help used, not its value as a learning activity.

Stop the incident server when finished. Start a fresh transfer process:

```sh
node server.mjs transfer
```

It uses `http://127.0.0.1:4323`. Its source contains a morning notice and an evening notice. `?edition=morning` and `?edition=evening` must select the corresponding object. Omitting the parameter selects morning.

Unlike the incident, the transfer source is a **fixed snapshot for this process**: it is read once at startup. Restarting reloads it and clears the server's saved results. We will not edit source data during this task. That boundary makes a selection mistake separable from cache expiration or live-update rules.

## 10. Read a tiny saved-result mechanism

Before investigating, learn the new helper mechanism. Imagine putting a morning notice and an evening notice into labelled folders. Reuse is useful only if the folder label distinguishes the choice you need. If both are filed under “notice,” retrieving the folder may give you whichever one was filed first.

JavaScript's `Map` holds values under keys. In this supplied code:

- `new Map()` creates the collection.
- `saved.has(key)` asks whether that key is present.
- `saved.get(key)` retrieves the value under it.
- `saved.set(key, result)` stores that result under the key.

The map is created outside the returned request-reading function, so successive calls made through the same reader share it. A new reader starts with an empty map. That is why request order and process restart can matter. This is ordinary server process memory, separate from a browser's HTTP cache. [Map operations, reviewed 2026-09-21](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)

Here is a worked, unrelated example to make the operation concrete:

```javascript
const labels = new Map();
labels.set('cup-1', 'Tea');
labels.set('cup-2', 'Coffee');
labels.get('cup-1'); // Tea
```

If both drinks were stored under `cup-1`, that key could not identify two different drinks. In our server, the early return on an existing key makes the first saved result persist for subsequent reads under that key. Follow the actual code rather than assuming every cache overwrites on every request.

## 11. Reproduce in two orders

From Terminal B, with a freshly started transfer process, run:

```sh
curl -i "http://127.0.0.1:4323/api/notice?edition=morning"
curl -i "http://127.0.0.1:4323/api/notice?edition=evening"
```

Run them separately. Read the `edition` and `message` in each body. These commands send no If-None-Match and curl is not maintaining a browser response cache here. If the second response has the wrong edition, the failure already exists before conditional validation could explain it.

Stop and restart the transfer server, then request evening first and morning second. Record how the symptom depends on order. Restarting matters because it clears this process's saved results; merely clearing your terminal does not.

Your task is to make both orders select correctly, preserve reuse for repeated requests of the same edition, and retain the normal HTTP cases. Run:

```sh
node --test checks/transfer.test.mjs
```

The supplied starter has eight checks, five of which fail. The tests use fresh handlers to separate the two orders. Investigate before opening the next section if you want a less guided attempt.

## 12. Transfer hints and full walkthrough

**Hint 1:** Since ordinary requests already show the wrong content, compare selection and any saved result before blaming the validator comparison.

**Hint 2:** In `cases/transfer/representation.mjs`, follow the early return on `saved.has(key)`. Does changing `edition` change the key used for that lookup?

**Full explanation:** The implementation uses the constant `/api/notice` as its saved-result key. After the first request, every supported edition lookup finds that same entry and returns it. The code that would select `state[edition]` is skipped. The resulting ETag correctly fingerprints the wrong selected body; hashing again is not the missing repair.

For this fixed-source, single-route fixture, using the normalized supported edition as the key distinguishes the two choices:

```javascript
const key = edition;
```

Replace the key line in the transfer representation file, or use the complete destination-ready `reference/transfer-representation.mjs`. Then run the eight checks, restart the manually running process, and repeat both request orders. All eight checks should pass with the worked repair.

Removing the server's saved-result optimization is also a defensible correction here if you explain its cost and preserve correct selection and stable conditional behavior. The task's “reuse” requirement concerns valid unchanged conditional responses; it does not require an internal Map. A key that distinguishes the actual selection is one repair, not the only allowed architecture.

The fixed-source assumption is essential. If you later allow live edits, an edition key alone does not invalidate an already saved older result. That would require an update rule, versioning, invalidation, or rebuilding. We name that boundary now and develop mutable and shared caches later; it is not a hidden requirement of this exercise.

## 13. Practice: explain what the tests and fixes establish

### Practice A: useful failure before the fix

Show your completed regression failing because the old-tag request received 304, then passing after repair. Explain why a syntax error, skipped test, or passing unconditional request would not establish the same thing.

### Practice B: a different kind of incomplete repair

An engineer hashes the whole source object. It now detects the changed closing time, but internal-note edits change the tag too. Is that the same correctness failure as the original false 304? Which requirement does the alternative miss in this assignment?

### Practice C: distinguish the two incidents

For each case, identify where information was lost: constructing the validator or selecting a saved result. Explain why the incident repair did not solve the transfer case. State the fixed-source assumption that limits the transfer repair.

### Practice explanations

For A, a requirement failure on the original implementation followed by success with the same assertion establishes that the repair changes the targeted behavior. Syntax errors and skips do not reach that assertion. An unconditional request never exercises the stale-validator branch.

For B, detecting a relevant change protects correctness; invalidating unnecessarily does not falsely validate changed content. Hashing unselected source data misses this task's requirement to retain stable reuse when the selected bytes are unchanged. It is important to describe that performance/contract issue accurately.

For C, the main incident constructs current content but gives it a tag that ignores a relevant field. The transfer case retrieves the wrong saved content because its key collapses two selections. Correctly hashing that wrong content cannot make it the requested edition. The edition-key repair is sufficient here because the source is fixed for the process; it is not a complete live-update cache design.

## 14. What comes next

You have now followed a mechanism from a patient explanation through a reproducible failure, a source-level diagnosis, a repair, and checks that challenge an attractive shortcut. The supported transfer case asks whether you can move the reasoning to a different point in the data path.

The next planned lessons add review and revision, then a later fresh transfer task with help recorded. Origins and cookie scope follow after those. Broader security and rate-limiting work remains in the curriculum, with its own prerequisite mechanisms.

Keep the code change, failing/passing evidence, and your explanation. Finishing the worksheet is course progress. Being able to repeat this reasoning in an unfamiliar situation with appropriate independence is the stronger capability we are building toward.
