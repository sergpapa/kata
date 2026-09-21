---
document_id: FSSE-HTTP-STUDENT-03
version: "1.0.0-draft"
date: "2026-09-11"
audience: "A learner new to web development who has worked through Lessons 1–2"
module: M020
candidate_lesson_id: LS-M020-03
status: "Student-facing draft; owner trial and application integration pending"
prerequisites:
  - "Distinguish a request, a response, a status, a header, and a body at the introductory level"
  - "Find the host, port, and path in the local cafe URL"
  - "Start and stop the supplied Node server using Lesson 2's instructions"
introduced_concepts:
  - "Representing the same information as plain text, HTML, and JSON"
  - "HTML elements and a small JSON object, with the syntax needed to read these examples"
  - "Content-Type as a description of a response body"
  - "An HTTP API as an agreed interface for programs"
exercise_kit: HTTP_Lessons_03_05_Local_Kit_v1.zip
runtime_target: "Node.js 24.x; native desktop browser and terminal on the same machine"
assessment_scope: "Guided reading and observation of supplied representations; no handler implementation required"
deferred: ["Complete HTML and JSON grammars", "Writing fetch code", "Content negotiation", "Cache behavior", "Security rules for type handling"]
---

# Lesson 3: One menu, three ways to carry it

In Lesson 2, the café returned a few lines of text. Your browser displayed them, and you could read the drinks. That was enough to prove that a running server could answer your request.

Now imagine two new customers for the same information. One wants a neatly structured web page. The other is a program that needs to find the list of drinks without guessing which line means what.

Do we need three different menus? We need three ways to **represent** the menu: express the same information in a form suited to its use.

By the end of this lesson, you should be able to look at a small response and explain what information it carries, how that information is organized, and what its `Content-Type` header tells the recipient. You will also open each version in a real browser.

You do not need to write a web page or a JSON parser. We will explain the small amount of syntax needed to read these examples. If you have already studied HTML elsewhere in the course, treat the HTML section as a refresher.

## 1. Start with three uses for the same café menu

You phone a friend who is standing in the café. “What can I order?” you ask. Your friend sends a message:

```text
Cafe menu
Tea
Coffee
Hot chocolate
```

You understand it because you know the situation. The first line looks like a title. The next three lines look like drinks. Nobody needed to explain a formal structure.

Later, you help the café put the menu on a page. Now you want to say more than which words occur. You want to say, “This is the main heading, and these are items in a list.” That lets a browser build a page with meaningful parts. It also gives tools such as screen readers useful structure.

Finally, suppose a separate ordering program needs to offer those drinks in a selection box. Its author wants a dependable answer to “Which part contains the drink names?” Asking the program to infer that from the position of lines would be fragile. If someone added “Welcome!” above the title, would the program accidentally offer **Cafe menu** as a drink?

We can instead give the list a name: `drinks`. The ordering program can be written to look for that named part.

The underlying facts have stayed the same. The forms serve different purposes:

| Use | What the recipient needs |
| --- | --- |
| A quick message | Readable words and line breaks |
| A web document | Words organized into headings, lists, and other document parts |
| An agreed program interface | Values organized under names the receiving program expects |

This is the reason to learn formats. They let programs exchange meaning using rules, instead of making a new guess each time.

## 2. Plain text: the words, without document markup

The first version is **plain text**. In this example, it contains ordinary characters and line breaks. It does not use HTML instructions to identify a heading or create a list.

Here is a shortened illustration of its response. Other real headers are omitted so we can focus on the parts we are studying:

```http
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8

Cafe menu
Tea
Coffee
Hot chocolate
```

Read it in layers. `200` is the status for this successful request. `Content-Type` describes the body. After the blank line comes the body itself: the menu.

The value `text/plain` names a media type, which is a standard label for a content format. The extra `charset=utf-8` tells the recipient how characters are encoded. For now, think of UTF-8 as the agreed way to turn the transmitted bytes into characters, including characters beyond the basic English alphabet. You do not need to calculate those bytes in this exercise.

The word **plain** does not mean useless. Logs, simple messages, and many development tools work very well with plain text. It means we have not identified this body as an HTML document with document elements.

You may still recognize a title in the first line. That is your interpretation of the words and their position. This particular format has not explicitly marked that line as the page's main heading.

## 3. HTML: give the document meaningful parts

HTML stands for **HyperText Markup Language**. Markup adds structure to content. An HTML element can identify a heading, paragraph, link, or list item. A browser reads that structure to build the document it presents. [MDN explains the basic element syntax](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content/Basic_HTML_syntax).

Here is the important part of our HTML menu:

```html
<h1>Cafe menu</h1>
<ul>
  <li>Tea</li>
  <li>Coffee</li>
  <li>Hot chocolate</li>
</ul>
```

Read the first line slowly. `<h1>` starts a main heading. `Cafe menu` is its content. `</h1>` ends that heading. The slash marks the closing tag. Together, these pieces form an element.

The next element, `<ul>`, starts an unordered list: a list whose items do not have a required numbered sequence. Each `<li>` contains one list item. `</ul>` closes the whole list.

The angle-bracket parts are not drink names. They identify what the surrounding content does in the document. The browser will ordinarily show a heading and a bulleted list rather than print the tags themselves. Exact font sizes and spacing are presentation choices; the useful idea here is the structure.

Our complete file also has a small outer structure:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Cafe menu</title>
  </head>
  <body>
    <h1>Cafe menu</h1>
    <ul>
      <li>Tea</li>
      <li>Coffee</li>
      <li>Hot chocolate</li>
    </ul>
  </body>
</html>
```

This excerpt leaves out the supplied file's tab-icon setting. Nothing in that setting is needed for today's explanation.

The opening declaration identifies the document as modern HTML. `<html lang="en">` surrounds the document and declares English as its language. The `<head>` section contains information about the document, including the title normally used for the browser tab. The `<body>` section contains the page content we want to present.

There are two uses of the word **body** to keep separate. The **HTTP response body** carries the entire HTML document, including both `<head>` and `<body>`. The **HTML `<body>` element** is one part inside that document.

Similarly, HTML's `<head>` is not a set of HTTP headers. In our response, `Content-Type: text/html; charset=utf-8` is an HTTP header. `<title>Cafe menu</title>` is HTML inside the HTTP body.

| Piece | Where it belongs |
| --- | --- |
| `Content-Type: text/html; charset=utf-8` | The HTTP response's headers |
| The complete HTML document | The HTTP response's body |
| `<head> ... </head>` | Inside the HTML document |
| `<body> ... </body>` | Also inside the HTML document |

If these names briefly collide in your head, return to the containers: a response carries a document; the document has its own parts.

## 4. JSON: name the information a program will use

Now consider the ordering program. It wants the menu title and the list of drinks as separate values. Our server can return this body:

```json
{
  "title": "Cafe menu",
  "drinks": ["Tea", "Coffee", "Hot chocolate"]
}
```

This is **JSON**, short for JavaScript Object Notation. Despite its name, programs written in many languages can read and produce it. It is a text format for structured data. Its punctuation gives the values an agreed organization. [MDN's JSON introduction](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Scripting/JSON) describes that role.

Let us unpack our small example rather than try to learn every possible JSON value at once.

The outer braces, `{` and `}`, enclose an **object**. Here, an object is a collection of named properties. Each property pairs a name with a value.

In `"title": "Cafe menu"`, the property name is `title`. The colon separates that name from its value, `Cafe menu`. Both are written between double quotation marks. A text value like `"Cafe menu"` is called a **string**.

The second property's name is `drinks`. Its value is an **array**, shown by square brackets: `[` and `]`. An array is an ordered collection of values. Ours has three string values, separated by commas. The comma after `"Cafe menu"` separates the object's two properties.

Read the whole object aloud as:

> The title is “Cafe menu.” The drinks are “Tea,” “Coffee,” and “Hot chocolate.”

Notice how little mystery is left once we attach each mark to a job. The punctuation is a structure around familiar information.

The receiving program can **parse** the JSON: read it according to JSON's rules and turn it into values the program can work with. Parsing does not decide what the café should charge or which drink you prefer. Application code must supply those decisions.

The property name `drinks` also needs an agreement between the two programs. JSON defines how to write a name and value; it does not require every café to use that particular name. If the server changed it to `beverages` while the client still expected `drinks`, the text could remain valid JSON while their agreement broke.

That is a useful distinction: correct punctuation and correct application meaning are separate questions.

For the examples in this lesson, remember three reading rules: property names and strings use double quotes; commas separate neighboring properties or array entries; the final entry has no trailing comma. The full format supports other values too, but we will introduce them when we need them. The precise syntax is defined by [the JSON standard, RFC 8259](https://www.rfc-editor.org/rfc/rfc8259.html).

### Pause: read the data before reading the answer

Suppose you received this different, valid object:

```json
{
  "title": "Evening menu",
  "drinks": ["Tea", "Water"]
}
```

Which text is the title? How many drinks are listed? Is `drinks` itself one of the drinks?

Write a sentence before continuing. The answer appears in the practice explanations near the end.

## 5. What makes this an API response?

You will often hear a developer say, “Get the menu from the API.” An **API**, or application programming interface, is an agreed way for software to interact with other software.

In our small HTTP example, that agreement includes a request and the form of its answer: send `GET` to `/api/menu`, and a successful response provides a JSON object with `title` and `drinks`. A client programmer can use that agreement to write the receiving side.

The letters `/api/` are a naming choice made by this server's author. They do not activate a special transport system. A browser visiting that path still sends an HTTP request. The response still has a status, headers, and a body. A path without `/api/` could also be part of an API.

JSON is common for HTTP APIs, but an API does not have to use JSON. Nor does receiving JSON prove there is a database. Our supplied server keeps this tiny menu directly in its program. The interface tells the client what it can request and receive; it does not expose every internal implementation choice.

In this lesson you will view the JSON directly. In Lesson 5, a small supplied page will request it and turn the drink values into visible list items. That will let you see why separating data from its presentation is useful.

## 6. The content label and the content must agree

Here is our JSON response, again shortened to the parts being taught:

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "title": "Cafe menu",
  "drinks": ["Tea", "Coffee", "Hot chocolate"]
}
```

`application/json` describes the body as JSON. The `Content-Type` header does not contain the drink list and does not turn arbitrary text into valid JSON. It tells the recipient what format the server is supplying. [The Content-Type reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Type) documents this header.

Imagine placing a label saying “itemized order form” on a scrap containing only “Hello.” The label tells a reader what to expect, but it has not added the missing fields. A program expecting a JSON object cannot obtain `drinks` merely because a header claims the body is JSON.

The same distinction applies to HTML. Our lab includes an experiment in which exactly the same HTML text is supplied with two different content labels. In one case the browser treats it as an HTML document. In the other it displays the markup as plain text.

This is a deliberately controlled example. Real browsers have additional rules for handling content types, missing labels, and unsafe uses. We will study those later. For this lab, the useful habit is to check both what the response claims to contain and what it actually contains.

Also notice `/api/menu`: it has no `.json` ending. A URL path need not be a filename, as we began to see in Lesson 2. Our server's code chooses a response for that path. The content type is a better explicit clue than guessing from an extension alone.

## 7. Start the shared lab for Lessons 3–5

The new kit is **HTTP_Lessons_03_05_Local_Kit_v1.zip**. It contains more café responses and the small page we will investigate in Lesson 5. Keep your Lesson 2 folder; extract this kit into its own folder.

If the old café is still running, you may stop it in its terminal with **Ctrl+C**. On macOS, use Control, not Command. Clear any selected terminal text first. This new kit normally uses port **4315**, while Lesson 2 used **4312**. The separate port helps distinguish the two labs.

1. Extract the whole ZIP. Open the `http-lessons-03-05-lab` folder in VS Code with **File → Open Folder**.
2. Confirm that you can see `server.mjs` and the `public` folder beside it. Do not move `server.mjs` away from the other supplied files.
3. Choose **Terminal → New Terminal**. This should open a terminal in the folder you opened.
4. Check that Node is available:

```sh
node --version
```

The kit targets Node.js 24.x. If you cannot run Node, return to Lesson 2's setup help before continuing. No package installation is needed inside this project.

Start the server:

```sh
node server.mjs
```

Wait for a message beginning:

```text
Cafe lab for Lessons 3-5 is listening on http://127.0.0.1:4315
```

Leave this terminal open. The message identifies the program and port that should answer your next requests.

If it says the port is already in use, stop your previous copy if you recognize it, or use:

```sh
node server.mjs 4316
```

Then substitute **4316** for **4315** in every URL and later curl command. Follow the address printed by the successful start. Do not stop an unfamiliar program just to free the example port.

If Node cannot find `server.mjs`, check the open folder and terminal location. If the café reports a missing supplied file, extract the whole ZIP again into a separate folder. The lab's README describes its file layout. If the browser cannot connect, first compare the exact port with the listening message and confirm that the server is still running.

These instructions assume your terminal, Node, and browser run in the same ordinary desktop environment. Remote workspaces and containers introduce another networking boundary; keep this first experiment on your own desktop.

## 8. Predict, open, compare

Before opening the URLs, write a prediction: **What do you expect to remain the same, and what do you expect to look different?** A short sentence is enough. Preserve it so you can compare it with what you observe.

Open these addresses one at a time in your browser, using your actual port:

| Address | What to look for |
| --- | --- |
| `http://127.0.0.1:4315/menu.txt` | The title and drinks as lines of text |
| `http://127.0.0.1:4315/menu.html` | A heading and a list built from HTML |
| `http://127.0.0.1:4315/api/menu` | Named values in the JSON body |

Compare the information, not just the appearance. Each version names the same three drinks. The browser may show JSON as raw text or offer a formatted, collapsible view. Either can be a way to inspect the same data; your browser's formatting is not a different menu returned by the café.

Look at the server terminal after each visit. Lines such as `GET /api/menu -> 200` are the supplied server's summaries. They tell you the method, path, and response status that this server recorded. They are not the complete HTTP message.

Now open:

```text
http://127.0.0.1:4315/menu-as-text
```

Here, the server supplies the same HTML body as `/menu.html`, labelled `text/plain`. You should see markup such as `<h1>` as text instead of seeing it used as the page heading. The drinks have not changed. The way the browser treats the content has changed.

At this point, the lesson tells you which headers the fixture sends. You have directly observed the browser's presentation and the server's summaries. In Lesson 4, you will inspect the response headers yourself, which will give you another kind of evidence.

Record one observation that matched your prediction and one detail that surprised you. If something failed, record the URL and the actual message. That is a useful observation too.

## 9. Practice: separate meaning, format, and outcome

These are learning questions, with full explanations below. Try an answer first if you can. Use the explanation whenever it would help.

### Practice A: explain the three forms

A friend says: “The JSON menu is a different menu because it has braces. And the HTML menu contains five drinks: Tea, Coffee, Hot chocolate, h1, and li.”

Correct the explanation. Refer to the actual drink names and to the job of the punctuation or markup.

### Practice B: investigate a label

This is a supplied example, not a response you need to create in the lab:

```http
HTTP/1.1 200 OK
Content-Type: application/json

Tea, Coffee, Hot chocolate
```

The intended client expects the JSON object with `title` and `drinks` shown earlier. Does the status prove the body follows that agreement? Would changing only the header create that object? Explain what is missing.

### Practice C: choose a useful form

You need to let another program find the drink list reliably. Which of today's forms makes that named list most explicit in our examples? What must the two programs still agree about?

Then change the requirement: you want to present a simple document with a main heading and list. Which of today's forms directly expresses that document structure?

### Practice explanations

**The earlier JSON pause:** The title is `Evening menu`. There are two drinks: Tea and Water. `drinks` is the property name for the array; it is not an extra array entry. If you counted three drinks, look inside the square brackets and identify each quoted value there.

**Practice A:** All three representations describe Tea, Coffee, and Hot chocolate. JSON's braces organize an object; they do not change the drinks. HTML's `h1` and `li` names identify elements. The text between the relevant opening and closing tags supplies the heading or list-item content.

**Practice B:** `200` reports success for the HTTP request as handled by the server. It does not prove that the body meets the client's expectations. The supplied words are not the agreed JSON object. A truthful plain-text label would describe those words, but it would not satisfy a client expecting `title` and `drinks`. To satisfy that agreement, the server must send the correctly structured object and describe its format accurately.

**Practice C:** Our JSON example names the list `drinks`, making it straightforward for a program written to that agreement to find it. Both sides must still agree on the property name and the expected value structure. For the simple web document, the HTML example directly identifies a heading and list items. These are choices for the stated uses, not a rule that one format is universally best.

## 10. What the café comparison does—and does not—explain

The café helped us separate the facts from their representation: one menu can be passed along in several forms. It also helped explain why an agreed structure matters to a receiving program.

A human can often recover meaning from a badly labelled note. A program usually follows the specific rules its author supplied. Valid JSON does not guarantee that the required properties exist; a successful HTTP response does not guarantee a useful menu; a content label does not repair the body.

Those are different checks, and you now have words for each one.

Before moving on, explain one of today's responses using **status**, **Content-Type**, and **body**. Then explain why `/menu.html` and `/menu-as-text` looked different even though their bodies were the same.

Keep the lab folder. You may leave the server running for Lesson 4 or stop it with Ctrl+C and restart it later. Next, you will use a terminal client to see the response fields that a browser normally keeps out of the page itself.
