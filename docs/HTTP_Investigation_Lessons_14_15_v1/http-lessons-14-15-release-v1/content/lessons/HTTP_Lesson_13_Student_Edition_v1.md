---
document_id: FSSE-HTTP-STUDENT-13
version: "1.0.0-draft"
date: "2026-09-18"
module: M021
candidate_lesson_id: LS-M021-05
course_order: 13
status: "Student-facing draft; owner browser review pending"
prerequisites: ["Explain fresh reuse and conditional validation from Lessons 10–12", "Distinguish a page from its requests", "Compare a stated contract with server and client evidence"]
introduced_concepts: ["Origin response versus browser-cache handling versus page state", "Fetch cache modes in the supplied client", "A 304 origin exchange with a 200 response exposed to page code", "Bypass versus refresh versus repair", "Limits of evidence from reload and request logs"]
learning_outcomes: ["Reconcile origin and page observations without treating one status as the entire story", "Run controlled comparisons without unintentionally disabling caching", "Explain why obtaining current content once does not establish a durable repair"]
exercise_kit: HTTP_Lessons_09_13_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-09-13
runtime_target: "Node.js 24.x, curl, and Chrome/Chromium"
assessment_scope: "Guided layered investigation; browser procedure requires owner rehearsal, and this correct fixture is not the later seeded validator defect"
deferred: ["Unfamiliar faulty-validator investigation: M021-06/07", "Service workers and offline state: M023", "CDN/shared-cache incidents: later networking and reliability modules"]
---

# Lesson 13: What the server sent is not always what the page received

The server log says 304. The page reports 200 and displays a complete notice. Which observation is wrong?

Neither needs to be wrong. They may describe different parts of the same operation. The origin can send a body-free validation response while the browser supplies page code with content from a successfully validated stored response.

This lesson makes those viewpoints explicit. You will also investigate why a request that bypasses storage can show new content without fixing what a normal read does next.

The fixture remains deliberately correct. We are learning the expected mechanisms before meeting a validator that violates them in the later investigation.

## 1. Three jobs in one visible result

Imagine you have yesterday's café notice photograph. You telephone the café to check its edition, receive confirmation that it still applies, and read the closing time from your photograph to a friend.

The café did not send a new photograph during the call. Your friend still received the information. “No photograph crossed the telephone connection” and “my friend heard the closing time” describe different steps, so they do not conflict.

In our browser experiment, separate these jobs:

| Layer | What it does | Evidence available here |
| --- | --- | --- |
| Origin | Selects a representation and responds to a received request | The Node request log; a direct curl exchange |
| Browser HTTP cache | Applies storage, selection, freshness, and validation rules | Browser Network details combined with origin evidence |
| Page code and display | Receives a result from the browser and renders it | The local lab's result panel and source code |

A **layer** here simply means a part of the system with a different responsibility. We are not introducing a new physical server for every row. Your browser performs more than one of these jobs internally.

The visible page is the outcome of that work. Its text alone does not reveal which path produced it.

## 2. Understand the four buttons

Open the same `/lab` page from Lesson 10. Its buttons all request `/api/notice`, but their JavaScript selects different browser cache modes:

| Button | Supplied browser option | Intended behavior for this experiment |
| --- | --- | --- |
| Start with a current copy | `cache: 'reload'` | Obtain a current network response and permit it to update the HTTP cache |
| Read normally | `cache: 'default'` | Use the browser's ordinary freshness and validation behavior |
| Validate the stored copy | `cache: 'no-cache'` | Check an eligible stored response before reuse, even if it was fresh |
| Bypass storage for this read | `cache: 'no-store'` | Obtain a network response without using or updating the HTTP cache for this read |

If there is no matching stored response to validate, the browser needs a normal retrieval. The button cannot create a previously stored copy just by being called “validate.” [Request cache modes](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache)

These are options given by page code to the browser. They are distinct from a response's `Cache-Control` header, which is supplied by the origin. Similar names occur on both sides, so always say whether you mean the request's browser mode or the response's policy.

We use explicit buttons to control the experiment. A browser's ordinary reload or hard-reload gestures can involve other behavior, and DevTools settings can change it. Naming the exact action is more useful evidence than writing only “I refreshed.”

## 3. Trace the page code without confusing it with the cache

Open `public/lab.js`. The important request line is:

```javascript
const response = await fetch('/api/notice', { cache: button.dataset.mode });
```

`fetch` asks the browser to retrieve the resource. The `cache` option comes from the chosen button. `await` lets this function use the result after that operation finishes, as in the supplied test helper from Lesson 7.

Then the page reads:

```javascript
const text = await response.text();
```

It puts `response.status`, selected headers, and that text into the visible panel. The code does not implement its own response cache. It has no service worker, local-storage archive, or custom validator comparison; the browser's HTTP machinery performs the caching behavior under study.

Once the text is drawn, it stays there until page code changes it. Looking at the panel again does not call fetch. Changing the origin's file does not automatically run this page's code either.

If a later fetch fails, the lab explicitly says that the previous result remains visible. That is another reason an old notice on screen cannot, by itself, prove that a particular HTTP-cache entry was reused.

## 4. Observe a validation from both sides

Start the server if needed. In Terminal B, set a known body and validation policy:

```sh
node state.mjs baseline
node state.mjs validate
```

Open `http://127.0.0.1:4319/lab` in Chrome/Chromium and its Network panel. Keep **Disable cache unchecked**. Use your alternative port everywhere if needed. Filter for `api/notice` so the page and script requests do not obscure the comparison.

Press **Start with a current copy**. Expect the origin to log 200 and the page to display the 17:00 body with status 200. This seeds a known stored response under the current policy.

Now press **Validate the stored copy** without changing the source. Compare three observations:

1. The origin log should record an If-None-Match value and status 304.
2. The browser's Network details describe the validation/cache activity. The exact display and combined cached-response presentation can vary with browser version.
3. Page code should receive usable content from the validated stored response; this lab's panel can therefore show status 200 with the complete 17:00 notice.

This is the expected mechanism, not a supplied recording of your run. Record the actual fields you see. If they differ, use the troubleshooting section rather than forcing the result to match a screenshot.

The source of the body matters. The origin's 304 did not contain new notice text. The browser used the retained response after validation and exposed the resulting response to fetch. Its original successful retrieval status and content can therefore appear in the page's view. [Browser handling of cached validation](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching#validation)

When reading DevTools, distinguish a raw origin exchange from any reconstructed or cached view the tool presents. Use the server log to anchor what this local origin actually decided. In a larger system, you would also need to account for intermediaries; our fixture intentionally has none.

## 5. Compare with curl without assuming it is the browser

Use the Lesson 11 save-and-compare workflow on the same URL. An unchanged conditional curl request should show 304 and no new body in the terminal.

curl in those commands does not merge the response with your saved JSON file and render a page. The browser's fetch path does perform HTTP-cache handling. The difference in what you see is a difference in client behavior and observation point, not evidence that HTTP gave contradictory outcomes.

A plain curl request without If-None-Match can receive 200 even while the browser performs conditional validation and the origin responds 304 to that browser request. Compare method, URL, request headers, and source state before calling two requests “the same.”

The practical habit is to specify the observation:

> “The origin responded 304 to this conditional request.”

or:

> “Page code received a usable 200 response after browser cache handling.”

Either is more informative than “the request was 200” without saying where that number came from.

## 6. Set up a bypass comparison

Now we will create a fresh stored copy again. Run:

```sh
node state.mjs baseline
node state.mjs fresh
```

Press **Start with a current copy**. Confirm the page shows 17:00 and the five-minute policy. This action matters: changing the origin's policy in a file did not itself update an old cache entry.

Then run:

```sh
node state.mjs later
```

Before clicking anything, look at the page. It still shows 17:00. That observation alone says only that page code has not replaced the displayed result.

Press **Read normally** promptly, within the original freshness window. In the ordinary lab setup, the browser can still supply its stored 17:00 response without contacting the origin. Now you have performed an operation that can actually demonstrate cache reuse.

If the window expired or the entry was evicted, repeat the setup instead of assuming every older-looking result must be a fresh cache hit.

## 7. Bypass once, then return to the normal path

Press **Bypass storage for this read**. The origin should receive a new request and return the current 18:00 body. The page now displays it.

Have we replaced the earlier stored HTTP-cache response? Not through the requested behavior of this button. Its `no-store` fetch mode bypasses the HTTP cache for this read without using the result to update that cache.

Press **Read normally** again while the earlier entry is still fresh. The page can return to showing 17:00, obtained from that older stored response.

That can feel surprising because the screen just showed 18:00. But the screen and HTTP cache are not the same storage location. The bypass result changed what the page displayed without replacing the entry that the next normal fetch could reuse.

Use a table to keep the operations distinct:

| Action after the source changes to 18:00 | Body exposed to page in the expected sequence | Origin notice request? |
| --- | --- | --- |
| Merely look at the existing panel | Previous 17:00 display remains | No new operation |
| Read normally while the old entry is fresh | 17:00 from the retained response | Normally no |
| Bypass storage for this read | 18:00 from the origin | Yes |
| Read normally again inside the old window | 17:00 can be reused again | Normally no |

Record what happens in your browser, including any reasons the preconditions for this sequence were not met. Do not treat the table as proof that you observed it.

## 8. Validation can update the normal path

Now press **Validate the stored copy**. The browser has a tag for the older 17:00 representation, while the origin selects 18:00. In this correct fixture, the comparison does not match. The origin responds 200 with the current body and validator, and the browser can update the eligible stored response.

A subsequent normal read can use the new 18:00 entry. Validate once more without changing the source: the origin can now answer 304, while the page again receives usable stored content.

You have seen why “checking the copy,” “bypassing the copy,” and “using the normal path” are different operations. Their consequences depend on the current policy and whether an entry exists.

This is also why a diagnostic action is not automatically a repair. If bypassing makes a reported symptom disappear, it establishes that this alternate path can obtain useful content. It does not identify the cause of the normal path's behavior or prove that future users will receive the right result.

In our current experiment, the older normal result followed an explicit freshness policy. In the upcoming defect investigation, the problem will instead involve an incorrect validation decision. Similar visible symptoms can arise from different mechanisms, so the evidence needs to distinguish them.

## 9. Avoid changing the experiment accidentally

Several common actions affect different kinds of state:

| Action | What it does not establish by itself |
| --- | --- |
| Clear the Network panel's rows | That the browser's stored responses were erased |
| Reload the page | That every relevant cache entry was removed or the server defect repaired |
| Edit `data/cafe.json` | That a browser has received the new data or new cache policy |
| See no new origin log line | The exact cause, without also checking that the page performed the intended action |
| See a current body through curl | That the browser's normal path is fixed |
| Enable Disable cache | What would happen with ordinary browser caching enabled |

When an observation differs, first confirm the same host, port, and URL; the chosen button; the policy seeded into the stored response; the elapsed time; and DevTools settings. Then inspect the request condition and origin outcome.

If the lab is not running, a retained visible panel can still show an earlier result. Read the page's status message before interpreting its body as the outcome of your latest action.

## 10. Practice: write the strongest supported conclusion

### Practice A: two statuses

The origin records a matching conditional GET with status 304. The page shows status 200 and the existing notice. Explain how both observations fit one operation, including where the body came from.

### Practice B: bypass is not a repair report

A developer writes, “I bypassed caching and got the new closing time, so the bug is fixed.” What did the action establish? What follow-up comparison would test whether the normal path now behaves as required?

### Practice C: an unchanged screen

The source file has been edited, but nobody has pressed a button or reloaded the page. The old notice remains visible. Can you conclude that the browser reused an HTTP-cache entry after the edit? What evidence would be needed?

### Practice explanations

For A, the origin's body-free 304 validated a stored response. The browser then made the retained successful response content available to fetch, and page code rendered it. The old body did not travel in the new origin response.

For B, the bypass demonstrated that its request path could obtain the newer content. Repeat the normal path under recorded cache state and policy, inspect the conditional exchange where applicable, and compare the result with the actual requirement. Current content once is not evidence of a durable correction.

For C, an unchanged display without a new operation does not establish a cache reuse. Confirm that page code made a retrieval, inspect the browser's handling, and correlate any origin request. The page may simply be holding its previously rendered text.

## 11. What you are now ready to investigate

The pieces between the introductory request/reply story and a deeper cache incident are now in place: selected representations, change dependencies, storage permissions, freshness, validators, conditional cases, and distinct observation layers.

The next investigation can therefore ask a more demanding question: the source has changed, a client asks whether its copy still applies, and the system incorrectly says yes. You will need to identify which dependency or decision makes that happen, test a repair, and explain why an attractive workaround is incomplete.

Before moving on, save one comparison with your initial prediction, actual observations, revised explanation, and help used. Use the owner review form to flag any step where the lesson expected a mechanism it had not taught. These observations will help us improve the deeper investigation without lowering its intended depth.
