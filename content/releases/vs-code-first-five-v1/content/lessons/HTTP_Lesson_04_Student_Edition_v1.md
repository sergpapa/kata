---
document_id: FSSE-HTTP-STUDENT-04
version: "1.0.0-draft"
date: "2026-09-11"
audience: "A learner who has completed the first three introductory HTTP lessons"
module: M020
candidate_lesson_id: LS-M020-04
status: "Student-facing draft; owner trial and application integration pending"
prerequisites:
  - "Start and stop the shared Lessons 3–5 cafe lab"
  - "Read a simple JSON object and explain Content-Type"
  - "Distinguish the introductory 200 and 404 responses"
introduced_concepts:
  - "curl as a terminal HTTP client"
  - "A command option and case-sensitive -i versus -I"
  - "Inspecting response status, headers, and body"
  - "HEAD as a request for response metadata without the response body"
  - "An HTTP error response versus failure to establish the local connection"
exercise_kit: HTTP_Lessons_03_05_Local_Kit_v1.zip
runtime_target: "Node.js 24.x and curl; use curl.exe in Windows PowerShell"
assessment_scope: "Guided command use and evidence interpretation; no broad HTTP or shell mastery claim"
deferred: ["Request bodies and POST", "Automation exit-code policies", "Proxies", "TLS troubleshooting", "Packet capture", "Cache investigation"]
---

# Lesson 4: Ask the café directly—and inspect its reply

You can now visit the café in a browser and recognize several forms of its menu. But the visible page leaves some questions unanswered. Which status did the server return? Which content type did it declare? Did the server answer at all, or did the browser create the error message you are seeing?

Today you will use **curl**, a program that can make a request from your terminal and show the response. It gives you a smaller, more direct view of the exchange.

This is a professional tool, but you do not need to learn a long list of commands to use it. We will begin with one address, add one option, and compare two deliberately different failures.

By the end, you should be able to support a statement such as “the café returned JSON with status 404” using fields you actually inspected. You should also be able to explain why that is different from “curl could not connect to the café.”

## 1. A different way to ask the same question

Think back to asking a friend for the café menu. Your friend might take the café's reply, tidy it up, and show you just the drink names. That is convenient when your goal is choosing a drink.

If you are investigating a problem, you may want to examine the reply before someone turns it into a presentation. Was it a menu? Was it an explanation that no menu was available? What did its label say?

The browser is still an HTTP client. It also knows how to present documents, run page code, and help a person interact with a site. curl is another client. For the simple commands in this lesson, it requests the URL you give it and writes the received body to your terminal. We will ask it to show the response headers too.

You have not changed the café server by choosing curl. You have changed the program asking the question and the way you inspect the answer.

The café analogy has a limit here: curl is not a person interpreting the menu for you. It displays transferred content according to its command options. You supply the interpretation.

## 2. Keep the server running while you use another terminal

Use the **shared Lessons 3–5 kit** from Lesson 3, not the older Lesson 2 folder. Its default address is `http://127.0.0.1:4315`.

Open `http-lessons-03-05-lab` in VS Code. If the server is not running, choose **Terminal → New Terminal** and run:

```sh
node server.mjs
```

Wait for the listening message. If you chose port `4316` during setup, start with that same port argument and use it throughout this lesson.

Now choose **Terminal → New Terminal** again, or use the terminal panel's plus button to create another terminal. Leave the first terminal running the server. We will call it **Terminal A**. Use the new terminal, **Terminal B**, for curl.

The names A and B are just labels for our explanation; you do not have to rename anything in VS Code.

Why two terminals? Node is occupying Terminal A while it runs the server. It prints request summaries there and waits for more requests. Terminal B gives you a command prompt where you can run a separate client. Your computer can run both programs at the same time.

If you stop Node to regain the first prompt, you have also removed the program that should answer curl. Keeping those roles separate will make the later stop-and-retry experiment much easier to understand.

## 3. Check which curl command to use

In **macOS or Linux**, run this in Terminal B:

```sh
curl --version
```

In **Windows PowerShell**, use the executable name explicitly:

```powershell
curl.exe --version
```

You should see output beginning with `curl` and a version number. The other lines describe that installation's supported features. You do not need to understand them all to use today's HTTP commands.

Why the Windows distinction? Some PowerShell environments use `curl` as an alias for a different command. Writing `curl.exe` selects the curl executable and avoids confusing that other command's options with curl's. Microsoft's [curl on Windows documentation](https://learn.microsoft.com/en-us/windows/curl/) explains the Windows command.

**For the remaining examples, use `curl` on macOS/Linux and replace that program name with `curl.exe` in Windows PowerShell.** The rest of each command stays the same. Here is the first request in both forms:

```sh
curl "http://127.0.0.1:4315/api/menu"
```

```powershell
curl.exe "http://127.0.0.1:4315/api/menu"
```

If the version command is not recognized, curl is not available to that terminal under that name. Keep the exact message. The official [curl download page](https://curl.se/download.html) lists platform distributions. Use your operating system's supported installation route, reopen the terminal, and repeat the version check. Ask for setup help if you are unsure which route applies; this lesson does not depend on guessing an installation command.

The worked examples remain available even if setup takes another session. Distinguish reading an example from observing your own command.

## 4. Make one request and read the body

Before running the first request, predict the important content: **Which named values should this path return?** Use the JSON menu you studied in Lesson 3.

Run the appropriate command above. Its pieces have straightforward jobs:

| Piece | Job |
| --- | --- |
| `curl` or `curl.exe` | Start the client program |
| The URL | Identify the scheme, host, port, and target path |
| Double quotes around the URL | Keep the address together as one command argument; they are not part of the URL sent |

For this ordinary HTTP invocation, curl uses `GET`. We have not supplied an option that asks it to send a different method.

The body should contain:

```json
{
  "title": "Cafe menu",
  "drinks": [
    "Tea",
    "Coffee",
    "Hot chocolate"
  ]
}
```

This example uses more line breaks than the small JSON example in Lesson 3. The named values and array entries are the same. Whitespace around these punctuation marks can make JSON easier to read without adding another drink.

curl may also show transfer progress, depending on the command and environment. Progress information belongs to the client tool's display; it is not another property in the café's JSON object.

Look at Terminal A. You should find a new summary:

```text
GET /api/menu -> 200
```

Now explain what you have observed. curl displayed the JSON body. The supplied server recorded a GET for `/api/menu` and a 200 response. You have not yet asked curl to display the actual response status line and headers.

That last distinction matters. “I saw the menu” and “I inspected the Content-Type header” are different observations. A careful investigation keeps track of what its evidence can support.

## 5. Add `-i` to include the response headers

A command **option** changes how a program operates. curl has many options; today you will need very few.

Run this in Terminal B, substituting `curl.exe` on Windows PowerShell:

```sh
curl -i "http://127.0.0.1:4315/api/menu"
```

The option is a hyphen followed by a lowercase letter **i**. It asks curl to include response headers in its output. It does not change this request into a different HTTP method. The [curl manual](https://curl.se/docs/manpage.html) documents this option and the others used here.

This time you should see a status line, header lines, a blank line, and the body. A shortened example is:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 91

{
  "title": "Cafe menu",
  "drinks": [
    "Tea",
    "Coffee",
    "Hot chocolate"
  ]
}
```

This excerpt deliberately omits several headers. Your actual output also includes fields such as `Date`, and their values can vary between requests. Do not edit your observation to make it look like the shortened example.

Start with three questions:

1. **What outcome did this response report?** Read `200` from the status line.
2. **What format did it declare?** Read `application/json` from `Content-Type`.
3. **What information arrived?** Read the title and drink array from the body after the blank line.

`Content-Length: 91` is an additional useful clue in this fixture. It describes the body length in bytes. Our supplied JSON includes indentation and a final line break, which count toward that length. Do not treat the number as the count of drinks or assume that every possible JSON layout must have this length.

Other headers are real parts of the response, but you are not expected to explain them yet. We will return to connection handling, caching, and browser type rules in their own lessons. Today, confidently identifying three relevant fields is more useful than guessing the meaning of every line.

Also be precise about direction: **`-i` shows response headers, not a transcript of the outgoing request.** You chose the target in the command, and this invocation uses GET. The server's summary gives another record of what it received. The browser tools in Lesson 5 will let you inspect request details directly.

### A small comparison

Now inspect the other form of the same menu:

```sh
curl -i "http://127.0.0.1:4315/menu.html"
```

Find the status, the content type, and the start of the body. The body should contain HTML source, including tags. curl has not turned that source into a visible heading and bulleted list. This is the same reason a text editor can show HTML markup while a browser presents the document built from it.

Write a short observation: “This request returned status ____, declared ____, and its body contained ____.” Fill in what you actually saw.

## 6. Ask for a menu the café does not have

Keep the server running. Before the next command, predict whether a missing menu means there can be no HTTP response.

Then run:

```sh
curl -i "http://127.0.0.1:4315/api/missing-menu"
```

The shortened response should be:

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "Menu not found"
}
```

There is a response. It has a status, a content type, and a body. The server could be contacted, understood enough of the request to choose this answer, and reported that it had no menu at that path.

The body is still JSON. `error` is a property name chosen by the café's author, and `Menu not found` is its string value. JSON can describe a failure as well as a successful result.

You should also see `GET /api/missing-menu -> 404` in Terminal A. Compare that summary with curl's output. Both describe the same request outcome from different places in the system.

It would be inaccurate to write “the server is down” on this evidence. In this controlled experiment, the server just answered you. A better statement is: “The server returned 404 for `/api/missing-menu`; `/api/menu` returned 200.”

There is one tool detail worth keeping in mind. By default, curl does not treat an HTTP 404 response as a failed transfer for its process exit result. It can complete its job of transferring an error response. Scripts can request other failure policies with additional options; we will study that when we use curl in automation. For now, inspect the **HTTP status**, rather than assuming that the return of a normal-looking terminal prompt means the requested menu was supplied.

## 7. Stop the server and ask again

We will now change one thing: whether the server program is running. Use the known working path so you do not change the path and the server state at the same time.

First, make a prediction. **If the program that answers port 4315 is stopped, who could supply a 404 response?**

Go to Terminal A and press **Ctrl+C**. Clear any text selection first. You should see the café's stopped message and a command prompt. Stop only your own supplied server.

Return to Terminal B and repeat the known working request:

```sh
curl -i "http://127.0.0.1:4315/api/menu"
```

If nothing else is listening at that address and port, curl should report that it failed to connect. The wording varies by operating system and curl version. A typical message begins with `curl: (7)` and says it could not connect to the server.

That message comes from **curl**, not from an HTTP response body sent by the stopped café. You should not receive the café's `HTTP/1.1 404 Not Found` response, because the stopped process cannot choose and send that answer.

| Experiment | What you can observe | What it supports in this lab |
| --- | --- | --- |
| Running café, `/api/menu` | HTTP 200 and a menu body | The server supplied the menu for this request |
| Running café, `/api/missing-menu` | HTTP 404 and an error body | The server answered but had no menu at that path |
| Café stopped, known working path | A curl connection error, with no café HTTP status line | The client could not establish this connection |

The last observation alone would not diagnose every possible connection problem on a real network. Here, you have additional evidence: you deliberately stopped the only lab server. Keep the conclusion as specific as the experiment allows.

If you still get a response, investigate instead of forcing the expected answer. Did you stop the right terminal? Does the URL use the port printed by this server? Is another copy running? Those questions reuse Lesson 2's distinction between a source file, a process, and a listening address.

Restart the café in Terminal A:

```sh
node server.mjs
```

Use your alternate port argument if you chose one. Wait for the listening message, then repeat the known working request from Terminal B. Confirm that you can obtain the menu again.

You have now carried out a small controlled investigation: establish a working case, change one relevant condition, observe the result, and restore the working case.

## 8. A capital letter changes the request: `-I` and HEAD

So far, the option was lowercase `-i`. curl also has uppercase `-I`, pronounced “capital eye.” These are different options.

With the café running, try:

```sh
curl -I "http://127.0.0.1:4315/api/menu"
```

For HTTP, `-I` asks curl to use the **HEAD** method. HEAD asks for the response metadata corresponding to a GET while requiring the server to omit the response body. This can be useful when a client wants descriptive information without transferring the content. The HTTP specification defines [HEAD's relationship to GET](https://www.rfc-editor.org/rfc/rfc9110.html#name-head).

Look at both terminals. curl should show response headers but no JSON body. Terminal A should record:

```text
HEAD /api/menu -> 200
```

That line gives you a concrete way to distinguish the two commands. Lowercase `-i` left this request as GET and included the returned headers in the display. Uppercase `-I` made curl send HEAD.

You may still see `Content-Length: 91`. In this HEAD response, it describes the size of the body that the corresponding GET would have sent. It does not mean 91 body bytes followed the HEAD response headers.

This also revises a possible assumption from the first examples: a successful response does not always carry the requested content as a body. Request methods have rules, and HEAD intentionally omits that body. You can understand this case without memorizing every other method today.

## 9. Practice: choose evidence before a conclusion

Use your notes or repeat a command if that would help. The complete explanations follow the questions.

### Practice A: repair a diagnosis

A teammate says: “curl showed 404 for the missing menu. That proves no server was running.”

Rewrite the diagnosis using the observed status and body. What additional observation from today's lab could you use to show that the known menu still worked?

### Practice B: explain a missing body

You ran `curl -I` for `/api/menu`, saw status 200, and received no drink list. Before declaring a bug, what method should you check in the server log? Which command would request the body and show its response headers?

### Practice C: plan a two-case comparison

Someone reports “the menu doesn't work.” You are allowed to use this local lab. Choose two requests or controlled conditions that would help separate “the server answered with no menu at this path” from “the client could not connect.” Explain what evidence you would record, not just which command you would type.

### Practice explanations

**Practice A:** A 404 response shows that an HTTP server answered the request with that status. In this lab, its JSON body says the menu was not found. Requesting the known `/api/menu` path and recording its 200 response and drink list would show that the supplied café can still serve that menu. Do not generalize a failure at one path to every part of a system.

**Practice B:** Check for `HEAD /api/menu -> 200`. The absence of a response body is expected for HEAD. Use `curl -i "http://127.0.0.1:4315/api/menu"` to make the ordinary GET request and include its response headers in the display. Use `curl.exe` on Windows PowerShell and your actual port. If you confused `-i` and `-I`, the server log can help you catch the difference.

**Practice C:** With the server running, request `/api/missing-menu` and record the HTTP status, content type, and error body. Separately, stop your own lab server and request the previously working `/api/menu`; record the connection error and absence of a café response status. Keep the original prediction, actual outputs, and the conditions under which each was observed. Then restore the server and confirm the working case. This supports a comparison between the two failures in this controlled environment.

## 10. Keep the observation and the explanation together

Your useful result from this lesson is a small record: the command you ran, the server state, what appeared, and what you concluded. A screenshot or copied output can support that record, but the explanation tells us whether you understand it.

If you used the walkthrough, say so. If your output differed, keep the difference and ask about it. A copied expected answer is less informative than an honest report that helps us find the missing step.

Before moving on, explain these two distinctions in your own words: **an HTTP error response versus a connection failure**, and **GET with `-i` versus HEAD with `-I`**.

Next you will return to the browser and open its Network panel. There you can connect the fields you inspected in curl to the separate requests that build and update one visible page.
