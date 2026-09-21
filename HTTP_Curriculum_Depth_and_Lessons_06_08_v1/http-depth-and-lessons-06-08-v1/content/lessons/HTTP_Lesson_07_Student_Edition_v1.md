---
document_id: FSSE-HTTP-STUDENT-07
version: "1.0.0-draft"
date: "2026-09-18"
audience: "A learner who can trace the supplied handler from Lesson 6"
module: M020
candidate_lesson_id: LS-M020-07
status: "Student-facing draft; owner review pending"
prerequisites:
  - "Follow path/method conditions, helper calls, and return in LS-M020-06"
  - "Save a source file, restart the local process, and inspect a response"
introduced_concepts:
  - "An explicit behavior contract and a case table"
  - "POST as a different method; 405 with Allow for the supplied resource"
  - "Positive and negative cases; focused assertions; regression checks"
  - "A test of saved source versus a request to an already-running process"
learning_outcomes:
  - "Add a bounded hours route while preserving menu and missing-path behavior"
  - "Read one supplied automated test and explain its expectation"
  - "Observe the requirement fail before implementing it and pass after"
exercise_kit: HTTP_Lessons_06_08_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-06-08
runtime_target: "Node.js 24.x and curl; curl.exe in Windows PowerShell"
assessment_scope: "A guided feature change and bounded contract checks; not independent test-strategy or production-server competence"
deferred: ["Broader testing: M007/M038", "Request body processing and validation: M029/M030", "Authentication and authorization: M031/M032", "Rate-limit contracts: M030"]
---

# Lesson 7: Add opening hours—and check the promise

The café can send a menu, but someone planning a visit also needs to know when it is open. You will add that information to the server you traced in Lesson 6.

This sounds like a small change, and it is. The interesting question is how you decide that the change is correct. Seeing some text once is a useful observation, but it leaves other questions: did the original menu still work? Did a missing path start receiving invented success? Does HEAD still omit its body?

We will make the promise explicit, change the code, and check several cases against that promise. You will also meet a test that can repeat those checks for you.

## 1. Turn a request into an agreement

Imagine the owner asking you to add an opening-hours card beside the menu cards. The request is not just “print something new.” It has several expectations:

> When someone asks for hours, give them the hours card.
>
> Keep giving the menu to people who ask for a menu.
>
> If someone asks for a service we do not provide, explain that instead of pretending it exists.

The expectations belong together. You could satisfy the first by handing everyone an hours card, but that would break the second and third.

In software, an explicit agreement about observable behavior is often called a **contract**. Here it describes what a client can request and what response the application promises. It does not have to be written in a special tool. A precise table can do the job.

## 2. Read the café's contract

Use the same `http-lessons-06-08-lab` folder as Lesson 6. The required change belongs in its main `handler.mjs`, not in an incident folder.

For this exercise, opening hours are fixed teaching data:

```json
{
  "weekdays": "08:00-17:00",
  "weekend": "Closed"
}
```

The client expects the two keys and their values exactly as shown. `weekdays` means Monday through Friday in this fixture. We are not calculating holidays, time zones, or whether the café is currently open. Those would require a larger agreement.

| Request | Required result in this lab |
| --- | --- |
| GET `/api/menu` | 200 with the original title and drinks as JSON |
| GET `/api/hours` | 200 with the opening-hours JSON above |
| GET `/api/hours?source=lesson` | The same hours response; this handler ignores the query |
| HEAD `/api/hours` | 200 with the supplied helper's corresponding metadata and no body |
| POST `/api/hours` | 405 with `Allow: GET, HEAD` and JSON containing `error: "Method not allowed"` |
| GET `/api/unknown` | 404 with JSON containing `error: "Not found"` |
| POST `/api/unknown` | 404 under this application's path-first policy |
| HEAD `/api/unknown` | 404 with no body |

A **positive case** exercises behavior the application should provide. A **negative case** exercises an input it should refuse or report as missing. A negative case succeeds as a test when the application refuses it correctly. “All tests passed” does not mean “every request received 200.”

Notice the scope of the table: it is our exercise's contract. It does not prescribe how every website orders path, method, and permission checks.

## 3. Understand the method refusal before implementing it

So far, you have mainly used GET to retrieve content and HEAD to inspect response metadata without a body. **POST is another HTTP method.** It asks a resource to process a request according to that resource's meaning. A later API might use it to submit an order. The method name alone does not tell us that an order will be created.

Our hours resource offers retrieval only. If we send POST to this known resource, it should report that the method is not allowed there. The relevant response is **405 Method Not Allowed**, accompanied by an `Allow` header listing supported methods. [HTTP semantics for POST](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.3), [405 and Allow](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.6)

In the supplied code, this statement prepares that header:

```javascript
response.setHeader('Allow', 'GET, HEAD');
```

The response helper then supplies status 405 and the JSON explanation. Setting the header does not itself implement the method check; the condition in the handler makes the decision.

There is also a distinction to keep for later security lessons: a resource's supported methods and a particular person's permissions are different questions. `Allow` is not a list of authorized users.

## 4. Observe the missing behavior first

If the Lesson 6 process is not running, start it in Terminal A:

```sh
node server.mjs
```

In Terminal B, request hours:

```sh
curl -i "http://127.0.0.1:4317/api/hours"
```

Use `curl.exe` in Windows PowerShell. If you selected port 4318, use that port consistently.

The unchanged starter returns 404. Record that result. It is our **baseline**: what the code does before the requested change. A baseline helps you distinguish “this feature now works because of my change” from “it already worked and I did not notice.”

Now run the supplied checks from the lab folder:

```sh
node --test checks/lesson-07.test.mjs
```

`--test` asks Node to run tests. The path names the specific set for this lesson. You do not need a package installation or an account. The test runner displays which checks passed and which failed. [Node.js test runner](https://nodejs.org/docs/latest-v24.x/api/test.html#running-tests-from-the-command-line)

For the fresh starter, expect **eight tests: four pass and four fail**. The failing tests concern the new hours behavior. The original menu and missing-path cases already satisfy this contract. A failure here is useful evidence that the requested behavior has not yet been implemented.

If the output instead reports a missing file, a syntax error, or a connection/setup problem, do not interpret that as the expected contract failure. Read the first error and repair setup. The README distinguishes these situations.

### Which program do these tests contact?

The supplied tests load the saved handler file into their own short-lived Node process. Their helper starts a local HTTP server on an available temporary port, sends a real request, records the response, and closes that server. They do **not** send their requests to the process you left running on 4317.

That choice isolates the test from an accidentally stale process. It also means a passing test cannot establish that the long-running process in Terminal A loaded your latest changes. Later, you will restart that process and check it with curl too.

## 5. Read one test as a small experiment

Open `checks/lesson-07.test.mjs`. Its job is to import your handler and pass it to a shared set of cases. Open `checks/contract-cases.mjs` to read those cases.

Find the test named `GET hours supplies the agreed opening hours`. Its important steps are:

```javascript
const result = await requestOnce(handleRequest, 'GET', '/api/hours');
assert.equal(result.status, 200);
assert.equal(result.headers['content-type'], 'application/json');
assert.deepEqual(JSON.parse(result.body), hours);
```

Treat this as an experiment with four parts.

First, `requestOnce` is the supplied helper that makes the local exchange described above. The inputs identify the handler, method, and path. `await` says to wait for the helper's result before using it. The enclosing test function is marked `async` to allow this style of waiting. You can read this supplied test without mastering asynchronous programming; the programming modules develop that mechanism separately.

Second, an **assertion** states an expectation. `assert.equal(result.status, 200)` checks the observed status against 200. If they differ, the assertion fails and the test runner reports a failure.

Third, the next assertion checks a header. Brackets select a property whose name contains a hyphen. The test client presents header names in lowercase, so this is written as `'content-type'`.

Finally, `JSON.parse` turns the received JSON text into a JavaScript value. `assert.deepEqual` compares its contents with the agreed `hours` object defined near the top of the file. This catches the wrong data even when the status is 200 and the content type is JSON.

The test is a repeatable request and comparison, not a source of truth independent of its expectations. A wrongly written test can be misleading. Today the table supplies the agreement; you should be able to connect each check back to it.

## 6. Add the new branch

Open the main `handler.mjs`. Find the menu block you traced in Lesson 6. Below it, but **before** the final 404 call, add a corresponding branch for `/api/hours`.

Before using the worked implementation, describe what the branch needs to do. There are three decisions to keep straight: select the path, refuse methods other than GET/HEAD, and choose the hours data for accepted requests. Once it has answered, it must leave the handler.

The following is a complete block to insert at that location. It is not a replacement for the entire file:

```javascript
if (path === '/api/hours') {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendJson(request, response, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(request, response, 200, {
    weekdays: '08:00-17:00',
    weekend: 'Closed',
  });
  return;
}
```

Why put it before the fallback? The fallback supplies the missing-path answer. The handler needs to check the additional known path before deciding that none matched.

Why keep the menu branch? The requested change adds one behavior; it does not remove the existing agreement with menu clients.

Why use the same response helper? It already implements the JSON formatting, headers, and HEAD handling used in this kit. Repeating those details in every branch would create more places for small inconsistencies. Later design lessons will examine when sharing code helps and when it hides important differences.

This implementation repeats a short method check in two branches. That is acceptable for this bounded lesson. A different organization can also satisfy the contract. Correct behavior and a clear explanation matter more here than matching the reference file's shape.

Save the file. If you need a complete comparison, `reference/lesson-07-handler.mjs` contains the full worked implementation. It is available for learning; record when you use it instead of treating help as a failure.

## 7. Verify the saved source, then the running process

Run the same test command again:

```sh
node --test checks/lesson-07.test.mjs
```

With the worked implementation, all eight checks should pass. Compare that with the baseline. You have observed the required behavior fail before implementation and pass afterward, while checks for the original behavior stayed in place.

Now focus Terminal A, stop the old server with Ctrl+C, and start it again with the same command and port. Confirm its startup label and handler location. Then use curl in Terminal B:

```sh
curl -i "http://127.0.0.1:4317/api/hours"
curl -I "http://127.0.0.1:4317/api/hours"
curl -i -X POST "http://127.0.0.1:4317/api/hours"
curl -i "http://127.0.0.1:4317/api/menu"
```

Run these as separate commands. `-X POST` asks curl to use the method POST. This particular check sends no request body and should be refused; it does not place an order or change stored data.

Inspect the relevant fields rather than matching a whole transcript. GET hours should supply the agreed JSON with 200. HEAD should show headers and no body. POST hours should produce 405 and `Allow`. The menu should still contain its original data. Dates, header order, and timing can vary.

If tests pass but curl still receives 404, those observations are not contradictory. The tests loaded the saved file in a new process; curl contacted whichever process is listening at that address. Check the restart, port, working folder, and printed handler location before changing the implementation again.

## 8. Check that a test can catch a plausible mistake

Keep your correct file saved. Now make one controlled temporary mistake: in the new hours data, change `weekend: 'Closed'` to `weekend: 'Open'`. Save and rerun the Lesson 7 tests.

At least the hours-content checks should fail because the response violates the declared agreement. The status can still be 200. That distinction is the point of this experiment: a status assertion alone would miss this wrong answer.

Restore `weekend: 'Closed'`, save, and rerun the tests until they pass. If you restarted the manual server while the wrong value was present, restart again after restoring it.

A test that catches one controlled mistake has demonstrated some value. It has not proved that no other defect exists. The table does not cover real-world calendars, concurrent updates, authentication, malformed request bodies, or every possible HTTP input. We have made the scope inspectable instead of treating a green test report as universal correctness.

## 9. Practice: explain the evidence

### Practice A: repair an overclaim

A developer says, “The hours request returned 200, so opening hours are correct.” What else should they inspect? Name the case in the supplied tests that would catch a wrong hours value.

### Practice B: choose the next check

Your tests pass after adding the route, but curl receives the starter's 404. What could explain that? Choose a check that would help distinguish a stale running process from a wrong URL.

### Practice C: evaluate a shortcut

Someone proposes replacing the final fallback with a 200 hours response so that `/api/hours` works. Which existing promise would that break? Would testing only GET hours catch the problem?

### Practice explanations

For A, inspect the JSON values against the contract. The named test `GET hours supplies the agreed opening hours` checks both status and content; it would reject `weekend: 'Open'`.

For B, the tests and curl may be exercising different process instances or source copies. Compare curl's host, port, and path with the successful startup message, inspect the printed handler location, and restart the intended process after saving. Report the observation that settles your case; do not simply assert that “it must be caching.”

For C, unknown paths would start returning hours instead of the agreed 404. A single happy-path test could miss that. The unknown-path cases preserve the distinction between providing a supported response and fabricating success for everything.

## 10. Keep a small change record

In your practice notes, record the requested behavior, one before-and-after result, a negative case that matters, and how you confirmed the running server matched the saved code. Include help used and any unexplained result.

This is a small version of a professional change review: what was required, what changed, what supports the claim, and what remains outside the check. You will use that habit in the next lesson when the starting point is a report of a defect rather than an explicit implementation instruction.

Stop the manual server when you finish. Keep your working `handler.mjs`; Lesson 8 uses a separate incident copy so you can retain this successful implementation.
