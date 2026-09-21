---
document_id: FSSE-HTTP-STUDENT-10
version: "1.0.0-draft"
date: "2026-09-18"
module: M021
candidate_lesson_id: LS-M021-02
course_order: 10
status: "Student-facing draft; owner review pending"
prerequisites: ["Explain resource, representation, and source changes from Lesson 9", "Use the caching kit state commands", "Open the browser Network panel from Lesson 5"]
introduced_concepts: ["An HTTP cache and a stored response", "Freshness lifetime versus current age", "Freshness versus actual source changes", "Cache-Control max-age, no-cache, no-store, private, and must-revalidate in scoped examples"]
learning_outcomes: ["Explain a fresh reuse that makes no origin request", "Predict freshness at a stated age", "Distinguish storage permission from permission to reuse without checking"]
exercise_kit: HTTP_Lessons_09_13_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-09-13
runtime_target: "Node.js 24.x, curl, and Chrome/Chromium"
assessment_scope: "Guided browser-cache observation and bounded policy reasoning; not broad cache-control expertise"
deferred: ["Validation exchange mechanics: Lesson 11", "Exact conditional case matrix: Lesson 12", "Browser/origin/display evidence: Lesson 13", "Shared caches and authenticated content: later M021 lessons"]
---

# Lesson 10: Keeping a copy is not permission to reuse it forever

You check the café's opening hours, then check again a moment later. Must your browser ask the café twice? If it can reuse the first answer, it might avoid another trip across the network.

That can make the application faster and reduce repeated work. But the owner might change the hours between those two checks. Reuse creates a question that did not exist when we imagined asking the origin every time: under which conditions is an earlier response an acceptable answer now?

Today we will separate keeping a copy, reusing it without asking, and checking whether it still applies. The distinction matters more than memorizing a collection of header names.

## 1. A photograph with a checking rule

Suppose you photograph the café notice before leaving home. Your friend calls two minutes later and asks when it closes. You could open your photograph instead of contacting the café again.

Keeping the photo is useful, but it does not decide whether to trust it. Imagine the café has supplied this rule:

> You may reuse this notice for five minutes without checking with us again.

That rule gives you a time window. During it, you can answer from the copy. Afterward, you need another basis for using it: perhaps ask whether it is still current, or obtain a new notice.

The owner might still change the actual notice during those five minutes. The rule is not a promise that change is physically impossible. It is a decision about how much delay in discovering a change this workflow accepts.

A shorter window discovers changes sooner but makes more checks necessary. A longer window reduces requests but can leave users relying on an older answer for longer. Those are consequences you can reason about, not a universal reason to choose one fixed duration.

The photograph analogy has another limit. A browser cache stores response content and relevant metadata, not a picture of the pixels on your screen. A screen can remain unchanged even when no reusable HTTP response is retained. Lesson 13 will separate those layers explicitly.

## 2. What an HTTP cache does

An **HTTP cache** keeps eligible responses and applies rules to decide whether they can answer later requests. A stored body without its selection and reuse rules is not enough to explain caching behavior.

The relevant copy must match the new request. From Lesson 9, you already know why ignoring a meaningful query can substitute the wrong content. Later lessons add further variation and shared-cache boundaries. Here we use one browser, one local origin, and a fixed URL.

When the matching stored response is **fresh**, its policy permits reuse without validation. **Validation** means checking with the origin whether the stored representation can still be used. A response that is no longer fresh is **stale**. Stale does not mean the bytes are necessarily wrong; it means the freshness permission has expired. [HTTP cache freshness](https://www.rfc-editor.org/rfc/rfc9111.html#section-4.2)

A café notice can remain identical for a week while a five-minute freshness window repeatedly expires. Conversely, a notice can change a minute after a response was generated while the earlier response is still within its allowed window.

That gives us two different questions:

| Question | What it concerns |
| --- | --- |
| Is this response fresh under its policy? | Whether reuse without checking is permitted now |
| Does this body equal what the origin would send now? | Whether the selected content has actually changed |

The cache cannot answer the second question merely by looking at a clock.

## 3. Read a concrete freshness policy

Our local lab can send this response header:

```http
Cache-Control: private, max-age=300, must-revalidate
```

This is an illustrative header, not a terminal command. Its pieces have different jobs:

- `private` confines storage under this directive to a private cache, such as this browser's cache, rather than a shared intermediary cache. It does not encrypt the response or authorize a user.
- `max-age=300` gives this response a freshness lifetime of 300 seconds: five minutes.
- `must-revalidate` prevents this stored response being reused while stale without successful validation; it is not an instruction to check every request while fresh.

These directives do not force a browser to keep a response forever. A cache can discard entries, and request settings can change its behavior. They establish permissions and constraints for the caching behavior we are studying. [Cache-Control response directives](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)

### Work through the clock

For this exercise, suppose the response's **current age** is already known. Freshness is a strict comparison: the freshness lifetime must be greater than the current age.

| Freshness lifetime | Current age | Fresh? |
| ---: | ---: | --- |
| 300 seconds | 20 seconds | Yes |
| 300 seconds | 299 seconds | Yes |
| 300 seconds | 300 seconds | No |
| 300 seconds | 420 seconds | No |

At exactly 300 seconds, the permission has expired. Reading the same fresh entry again does not restart that entry's age clock.

In a real cache, age calculation accounts for timestamps, time spent in transit, and time retained in caches. It is not universally “seconds since I clicked.” In our quick local experiment, elapsed time since the original response is a useful approximation. Keep that approximation labeled; we are not deriving the full age algorithm today.

## 4. Prepare the real browser experiment

Use the Lessons 9–13 kit. If necessary, start it with `node server.mjs` in Terminal A. In Terminal B, run these commands separately:

```sh
node state.mjs baseline
node state.mjs fresh
```

The first restores closing time 17:00. The second chooses the five-minute policy. These commands change the fixture, not any already-stored browser response.

Open `http://127.0.0.1:4319/lab` in Chrome or Chromium. If you chose port 4320, use it here and in curl. The page is part of the local teaching kit; it is separate from your course application.

Open the Network panel as in Lesson 5. Make sure recording is on and **Disable cache is unchecked**. That checkbox deliberately changes the experiment. A check intended to observe ordinary cache reuse should not simultaneously ask DevTools to disable it.

Filter for `api/notice` if other rows make the exchange hard to see. The page and its script also make requests, but loading the page does not automatically request the notice. Wait until you press a button.

The page offers four buttons. Today use **Start with a current copy** and **Read normally**. The first deliberately obtains a current origin response and allows it to populate the browser's HTTP cache. It gives us a reproducible starting point without asking you to clear browsing data. The second uses the browser's normal cache behavior for this request. We will inspect all four choices in Lesson 13.

## 5. Observe reuse before changing anything

Press **Start with a current copy**. The page should display the notice with 17:00, status 200 as exposed to page code, and the five-minute cache policy.

In Terminal A, locate the request log for GET `/api/notice`. Each log line records an origin request that reached this process. The `status` field records the response it chose. Ignore the page and script requests when counting notice requests.

Now predict what will happen if you press **Read normally** immediately. Will it need another origin response?

Press the button. Under the standard lab setup, the browser can reuse its matching fresh response. The content remains 17:00. You should not see a new notice request reach the origin for that reuse. DevTools may identify a memory/disk cache result or show different transfer details depending on its version.

Use more than the row's status as evidence. The page can report 200 even when this particular read was satisfied from a stored response. Compare the requested URL, browser transfer indication, and origin request log.

If another origin request does appear, check the elapsed time, the actual policy you seeded, and Disable cache. A browser may also evict an entry or have settings that prevent storage. Report what happened rather than changing your notes to match the expected case.

## 6. Change the origin while the copy is still fresh

Keep the page open. In Terminal B, change the café's closing time:

```sh
node state.mjs later
```

Then ask the origin with an ordinary curl request:

```sh
curl -i "http://127.0.0.1:4319/api/notice"
```

Use `curl.exe` in PowerShell. This command does not consult your browser's cache. It should receive the new 18:00 content from the origin.

Return to the unchanged page and press **Read normally** while its original five-minute window is still open. The browser may continue to give the page its stored 17:00 response without another origin request.

Both observations can be correct:

| Observation | Explanation in this experiment |
| --- | --- |
| curl receives 18:00 | A new origin request sees the changed source |
| Normal browser read receives 17:00 | The browser reuses an earlier response still fresh under its policy |

The state command did not send a message to the browser saying “invalidate that copy.” The origin's change and the browser's stored-response policy are separate parts of the system.

If you paused for more than five minutes, reseed deliberately: set `early`, press **Start with a current copy**, set `later`, and repeat the comparison promptly. Do not keep retrying an expired entry while assuming it is fresh.

This is not yet our deliberately defective cache investigation. We have observed an intended consequence of the declared policy. Whether that policy is appropriate depends on the product's requirements. A rapidly changing safety announcement and a rarely updated decorative image need not accept the same delay.

## 7. Storage and checking are different permissions

Two directives have names that often mislead learners:

```http
Cache-Control: no-store
```

```http
Cache-Control: no-cache
```

In the response examples we use, `no-store` tells caches not to store the response. `no-cache` allows storage but requires successful validation before that stored response is reused. The word “cache” in the second name does not mean that no bytes may be retained. [MDN caching guidance](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)

Think of two instructions attached to the café card:

- “Do not keep this as a reusable copy.”
- “You may keep a copy, but ask us before relying on it again.”

These lead to different workflows. In the second, a check may confirm that the stored content still applies, avoiding another transfer of the whole body. Lesson 11 shows how that exchange works.

Do not treat a new response directive as a universal remote eraser. A browser must receive information before it can act on it, and separate application state can exist. A copy that is reused without contacting the origin cannot learn a changed origin policy from a response it never received.

## 8. Practice: reason before naming a directive

### Practice A: fresh does not mean unchanged

A response has a 300-second freshness lifetime and a current age of 90 seconds. The origin changed its notice 30 seconds ago. Is the stored response fresh under that lifetime? Does the time calculation prove its body equals the origin's current body?

### Practice B: stale does not mean different

The cache's copy has age 301 seconds. Its lifetime is 300 seconds, but the café has not changed the notice. Why can both “the copy is stale” and “the content is still the same” be true?

### Practice C: select a policy for a stated requirement

For this exercise, a product owner permits keeping the notice locally but requires checking before every reuse. Which of the two directives, `no-cache` or `no-store`, expresses that storage-plus-checking model? What additional mechanism do we need to understand next?

### Practice explanations

For A, 300 is greater than 90, so the response is fresh by the stated comparison. That does not inspect the source or prove the body is unchanged. Policy freshness and current content equality are different claims.

For B, the freshness permission expired at age 300. The source can nevertheless remain identical. A validation exchange can establish whether the stored representation still applies.

For C, `no-cache` is the response directive matching the described model. Storage is permitted, but reuse needs successful validation. Next we need a way to identify the stored representation and interpret the origin's answer to a conditional request.

## 9. Explain one observation in layers

Save one browser/curl comparison and explain why the observations differed. Include the policy, whether you were still inside the freshness window, and whether the origin logged another notice request. If the expected reuse did not occur, record that and your diagnostic checks.

Do not infer an invisible cache event solely from a familiar-looking screen. The next lessons will give you stronger evidence: a representation validator, a conditional request, and a response that deliberately carries no new body.
