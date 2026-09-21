---
document_id: FSSE-HTTP-STUDENT-09
version: "1.0.0-draft"
date: "2026-09-18"
module: M021
candidate_lesson_id: LS-M021-01
course_order: 9
status: "Student-facing draft; owner review pending"
prerequisites: ["Trace a request and compare response content from Lessons 6–8", "Use curl and a local Node server", "Read a small JSON object"]
introduced_concepts: ["Resource identity versus a representation at a particular time", "Stored source fields versus selected response data", "A query that affects selection", "A controlled change and an unchanged comparison"]
learning_outcomes: ["Explain why a stable URL can return changed content", "Predict which supplied data changes affect a response", "Distinguish identical paths from identical request targets"]
exercise_kit: HTTP_Lessons_09_13_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-09-13
runtime_target: "Node.js 24.x, curl, and later Chrome/Chromium"
assessment_scope: "Representation and selection reasoning in a bounded fixture; no cache-debugging mastery claim"
deferred: ["Storage and freshness: Lesson 10", "Validators: Lesson 11", "Header-selected variants and Vary: later HTTP work", "Faulty-validator investigation: M021-06/07"]
---

# Lesson 9: The same address can give you a different answer

The café has a notice: “Today we close at 17:00.” Later, the owner decides to stay open until 18:00. A customer asks for the notice again using exactly the same address.

Should the answer change? Yes. Should the address necessarily change? No.

That distinction seems ordinary until we start keeping copies. If a browser already has yesterday's answer to a request, what does it mean to say that it “has the notice”? It has some content obtained at a particular time. That is not automatically the content the café would provide now.

Before studying caching, we need a precise model of what was requested and what was returned. This lesson develops that model using a small change you can observe directly.

## 1. A noticeboard and the notice currently on it

Imagine a noticeboard beside the café door. Its location stays the same all week. On Monday, the owner pins up a sheet saying the café closes at 17:00. On Tuesday, a replacement sheet says 18:00.

When a friend asks, “What does the café noticeboard say?”, you know which board they mean. But to answer accurately, you need the content currently displayed there. Knowing the board's location does not tell you which sheet is on it today.

Now imagine taking a photograph of Monday's sheet. The photograph faithfully records what you saw. It does not change itself when the owner replaces the paper on Tuesday. Both statements can be true: your copy is an accurate record of an earlier answer, and it is unsuitable as today's answer.

The analogy gives us two separate ideas:

- **Identity:** which thing we are asking about.
- **Representation:** the content supplied to describe that thing in this exchange.

In HTTP, a **resource** is something identified by a URI; the URLs we have used are familiar examples of URIs. A response can supply a **representation** of that resource. For our small service, the café-notice URL identifies the requested information, and its JSON response describes the selected notice. [HTTP resources and representations](https://www.rfc-editor.org/rfc/rfc9110.html#section-3.1)

You do not need to imagine a literal file at every URL. Our earlier handler constructed JSON from values. This server will do the same. The board-and-sheet analogy is useful for separating identity from content, but the server may generate the content when asked rather than fetch a preprinted sheet.

## 2. Open the caching kit

Extract **HTTP_Lessons_09_13_Local_Kit_v1.zip** and open its `http-lessons-09-13-lab` folder in VS Code. It is separate from the previous kit. Keep your earlier work and notes.

This kit uses Node.js 24.x and the same curl workflow. In Windows PowerShell, replace `curl` with `curl.exe` in the commands below. We will need curl 7.68 or newer for the file-based validator options in Lesson 11; check `curl --version` or `curl.exe --version` now. If those options are unavailable later, that lesson includes a file-header alternative.

In a terminal opened in the new folder, run:

```sh
node state.mjs baseline
```

This resets the supplied `data/cafe.json` fixture to its starting values. It does not clear your notes or the browser's cache. Here is the starting data:

```json
{
  "closingTime": "17:00",
  "editorNote": "Opening draft checked",
  "policy": "no-store"
}
```

`closingTime` is used in the public notice. `editorNote` is an internal note for this fictional café. `policy` chooses a cache policy that we will develop in Lesson 10. These are all teaching data, not real customer information.

Start the server:

```sh
node server.mjs
```

Wait for the listening message at `http://127.0.0.1:4319`. Leave that terminal running and open a second terminal for client and state commands. If the port is occupied, use `node server.mjs 4320` and substitute 4320 in every manual URL. The README has setup help.

From the second terminal, request the notice:

```sh
curl -i "http://127.0.0.1:4319/api/notice"
```

You should receive 200 and JSON with this content:

```json
{
  "title": "Cafe notice",
  "message": "Today we close at 17:00."
}
```

You will also see headers including `ETag` and `Cache-Control`. We will explain those before asking you to reason from them. For now, concentrate on the requested address and the body.

## 3. The response is selected from the source

Compare the fixture with the response. They are different objects with different jobs.

The source contains `closingTime`, `editorNote`, and `policy`. The public JSON contains `title` and `message`. The program uses the closing time to build a sentence; it does not copy every source field into the response.

Open `support/representation.mjs` and find the part that builds the full notice:

```javascript
{ title: 'Cafe notice', message: `Today we close at ${state.closingTime}.` }
```

This is an excerpt to read, not a replacement file. `state.closingTime` reads the source value. The backtick-delimited text is a **template string**: `${state.closingTime}` inserts that value into the sentence. With the starting state, the sentence contains `17:00`.

The helper also has a short-view branch and produces an ETag. We will visit those ideas in order. You do not need to understand the fingerprint calculation to identify which source field supplies this sentence.

This source-to-response relationship is important. A change to the data file might change the response, but that depends on what the representation uses. A change to an unrelated source field need not affect the selected content at all.

That is more precise than saying “the data changed” without identifying which data and which response.

## 4. Make one change that should not affect the body

Predict what will happen if only the editor's internal note changes. Write down the part of the response you expect to remain the same.

Run this in Terminal B, while the server keeps running in Terminal A:

```sh
node state.mjs note
```

The command changes only `editorNote` to another fixed teaching value. Now request the same URL again:

```sh
curl -i "http://127.0.0.1:4319/api/notice"
```

The notice body should remain the same. The helper did not use the editor's note when constructing it. Some response metadata, such as the Date header, can differ between requests; “unchanged body” is not the same claim as “every byte of both HTTP messages is identical.”

We have deliberately separated a source edit from a visible-content edit. This will matter when we decide what a validator should identify. An implementation that uses any source edit as its change signal may be conservative; one that overlooks a source field affecting the returned content can be incorrect. We will develop that distinction with concrete cases later.

### Why was no restart needed?

In this kit, the handler reads `data/cafe.json` for each API request. The state command changes that data file, so the next request can use the new values.

That is different from the JavaScript edits in Lessons 6–8, where a running process kept the code it had loaded at startup. If you edit this kit's JavaScript, restart it. If you use the supplied state commands, the handler reads the changed fixture on the next request. This is behavior we chose for the lab, not a universal promise that servers automatically reload all files.

## 5. Make a change that should affect the body

Now the café will close at 18:00. Predict what will change and what will remain the same in the exchange.

```sh
node state.mjs later
```

Then repeat the same curl request:

```sh
curl -i "http://127.0.0.1:4319/api/notice"
```

The response should say `Today we close at 18:00.` The URL remains `/api/notice`, and the request method remains GET. The new source value changed the representation returned from that address.

You did not need a new URL such as `/api/notice-version-2` for the application to change its current answer. Some systems deliberately use versioned URLs, but this one exposes the current notice at a stable address.

Here is the observation in a compact table:

| Change | Requested URL | Selected body |
| --- | --- | --- |
| Starting state | `/api/notice` | Full notice with 17:00 |
| Internal note changes | `/api/notice` | Same full notice with 17:00 |
| Closing time changes | `/api/notice` | Full notice with 18:00 |

This is the first dependency you should be able to explain: the selected sentence depends on `closingTime`, while `editorNote` is outside this body's calculation.

## 6. A query can select different content

The earlier menu lab ignored the query when choosing a response. This lab deliberately uses one query field. Ask for a short view:

```sh
curl -i "http://127.0.0.1:4319/api/notice?view=short"
```

After the previous change, the body should be:

```json
{
  "closingTime": "18:00"
}
```

Both requests have the pathname `/api/notice`, but their full targets differ because one includes `?view=short`. Here that query changes the selected content. The server's code gives the query meaning; the punctuation alone does not say what “short” should do.

Do not conclude that two requests identify the same cache entry just because their pathnames match. At this stage, keep the whole URL in your evidence. HTTP caches also have further selection rules, including rules for response variation by request headers; those will receive their own explanation. [Cache keys and selection](https://www.rfc-editor.org/rfc/rfc9111.html#section-2)

The full and short views draw on the same underlying closing time, but they are not interchangeable response bodies. A client expecting `message` would not find that field in the short object. The distinction is part of the API agreement, even though a person can infer the same closing time from either.

Try the default full view again and check that it is still available. Selecting the short view did not rewrite the source or replace what every other request receives.

## 7. What exactly could a copy contain?

Return to the photograph of the noticeboard. It records the sheet you saw, not the owner's future decisions. Similarly, if a client keeps a copy of the 17:00 response, changing the source to 18:00 does not reach backward and alter that client's stored bytes.

We will use the word **origin** for the server supplying the authoritative response for this resource. In this lab, that is your running Node process. A cached response can be an earlier result from that origin, with information describing how it may be reused.

Three questions are now distinct:

1. Which resource or request target is this about?
2. Which representation did the server select at the time?
3. Under what conditions may someone reuse a stored response later?

Today we worked through the first two. Lesson 10 supplies the third. It would be premature to diagnose a cache fault merely because you saw older content: first we need the reuse rules.

## 8. Practice: predict the relationship

### Practice A: source fields and visible content

The full notice currently says 18:00. A colleague changes only `editorNote`. Should the selected body's `message` change? Explain using the response calculation, not a guess about how often websites update.

### Practice B: identity across time

Two saved response bodies from `/api/notice` contain different closing times. Does that prove the requests used different URLs? What else could explain the difference in this kit?

### Practice C: two targets with one pathname

A proposed client stores every response under just `/api/notice`, discarding the query. It first saves the short view, then uses that saved body to answer a full-view request. What requirement could it violate, even if the closing time is still current?

### Practice explanations

For A, the full body's sentence depends on `closingTime`, not `editorNote`. That source edit does not require a different sentence. Other metadata can still differ between exchanges.

For B, the same stable URL can return a different representation after source data changes. The saved bodies alone do not establish that the requested URLs differed. Record the actual targets and times when comparing evidence.

For C, the full-view client expects a title and message, while the short view contains only a closing-time field. Collapsing the two targets can substitute the wrong shape of content. A current value is not enough if the selected representation is wrong for the request.

## 9. Prepare for reuse

Save a brief explanation connecting one source change, its selected body, and the unchanged request target. Include the actual commands you ran and any help you needed. Then stop the server if you are taking a break.

The next lesson asks why we keep a copy at all, how long we may reuse it without checking, and why “fresh” is a technical permission rather than proof that nobody changed the source.
