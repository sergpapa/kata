---
document_id: FSSE-HTTP-STUDENT-02
version: "1.0.0-draft"
date: "2026-09-11"
audience: "A learner new to web development who has completed the introductory request/response lesson"
module: M020
candidate_lesson_id: LS-M020-02
status: "Student-facing draft with a runnable local exercise; learner trial and application integration pending"
prerequisites:
  - "Explain client, server, request, and response using Lesson 1"
  - "Recognize GET, a path, and the introductory 200/404 examples"
  - "Open an extracted folder in an editor; guided preparation is included"
introduced_concepts:
  - "Scheme, host, explicit port, and path in a simple HTTP URL"
  - "Loopback address and the meaning of local"
  - "Source file, runtime, running process, and listening service"
  - "Terminal command, output, foreground operation, and stopping a process"
  - "Matching the browser destination to the running service"
exercise_kit: HTTP_Lesson_02_Local_Server_Kit_v1.zip
runtime_target: "Node.js 24.x; author verification used v24.19.0 on Linux"
assessment_scope: "Guided operation and explanation; independent tool competence requires later evidence"
deferred: ["Full URL syntax", "DNS mechanics", "TLS setup", "Cache inspection", "Node.js handler implementation", "Containers and remote development"]
---

# Lesson 2: Give the browser an address—and something to answer

In Lesson 1, your browser asked a fictional café for its menu. You followed the request and response and learned to distinguish the browser's job from the server's job.

This time, you will run the café yourself.

You will start a small program on your computer, ask it for a menu through your browser, and see the request recorded in your terminal. Then you will stop the program and investigate what changes. Finally, you will restart it at a different port and make the browser find it again.

The interesting question is not simply “Can I make a page appear?” It is:

> “Which program answered, how did the browser find it, and what evidence tells me that it is still running?”

We will explain the commands before you run them. The server code is supplied, so you can concentrate on the relationship between a file, a running program, and an address. You will study and change the handler code in a later lesson.

## 1. Bring back the previous model

Before starting, explain these three things in your own words:

- Which program was the client in our menu example?
- What did the server send in answer to the request?
- Why was a reply saying that a dinner menu was unavailable still a response?

The browser acted as the client. The server sent an HTTP response, which could contain the menu or an explanation. An unsuccessful request can still receive an answer; that is different from receiving no HTTP response.

If those distinctions are still uncertain, revisit the worked messages in Lesson 1. We will use them throughout this exercise.

## 2. An address needs to get you to the right place

Imagine the café is inside a shared building. The building also contains a library desk and a small repair shop.

You have three practical questions:

1. **Which building do I go to?** Its street address gets you to the right place.
2. **Which service inside do I approach?** A room or counter number helps you find the café rather than the repair shop.
3. **What do I ask for there?** At the café counter, you can ask for the menu or the opening hours.

Finding the building does not answer all three questions. You can reach the correct building and still approach the wrong counter. You can reach the café and ask for a dinner menu it does not have.

Our local HTTP address makes similar distinctions. Here is the address you will use once the server is running:

```text
http://127.0.0.1:4312/menu
```

Read it as:

> “Use HTTP to contact a service on this computer at port 4312, and ask for `/menu`.”

Let's explain each part before using it.

### `http`: how to communicate

The **scheme** is the first part of this URL: `http`. Here it tells the browser to use HTTP. The following `://` is punctuation separating this part of the address from the destination.

In Lesson 1, the fictional address began with `https://`. HTTPS uses a secure connection for HTTP communication. The small program supplied for this exercise speaks ordinary HTTP. Type the complete address beginning with `http://`; changing it to `https://` does not make the server acquire HTTPS support. [MDN: URL schemes](https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL#scheme)

### `127.0.0.1`: which computer, in this exercise

The **host** part identifies the destination. It can be a name, such as the fictional `cafe.example`, or an IP address written as numbers.

`127.0.0.1` is a special **loopback address**. For the setup used here, it directs the connection back to the same computer on which your browser is running. The request does not need to travel to a café's computer elsewhere on the internet. Your browser will talk to a program on your own machine. [IANA: IPv4 loopback address space](https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml)

The word **local** in “local server” refers to this arrangement: you are running the server in your own development environment.

You may have seen `localhost` in other tutorials. It is a special name for loopback addresses. A system can resolve it using either of two addressing forms, commonly `127.0.0.1` or `::1`. This exercise deliberately uses `127.0.0.1` everywhere, and the supplied server listens on that address. You do not need to learn the other form before continuing. [RFC 6761: localhost](https://www.rfc-editor.org/rfc/rfc6761.html#section-6.3)

### `4312`: which listening service

Your computer can run several programs that accept network connections. An address alone does not tell the computer which service you mean.

A **port** is a numbered part of the network destination. For our example, the server will ask the operating system to accept connections at `127.0.0.1` on port `4312`. When the browser connects there, the operating system can deliver that connection to this server.

This is the useful part of the numbered-counter comparison. The building address takes you to the building; the counter number distinguishes a particular service there.

Port `4312` is a choice for this exercise. It is not a special number meaning “café,” and it does not determine which drinks are on the menu. We could choose another available port, provided the server and browser agree on which one to use.

The colon in `:4312` separates the host from the port in this address. It is different from the colon earlier in `http://`.

### `/menu`: what to ask that service for

The **path** identifies what the browser is asking for at this service. You met paths in Lesson 1.

`/menu` and `/opening-hours` are two paths our café program understands. They select different content from the same running server. They are not two separate server programs, and each does not need its own port.

The leading `/` is part of the path. The server's code decides how to handle it. There does not have to be a file called `menu` in the folder on your computer.

### Put the parts together

| Part | Meaning in this exercise | Connection to the café |
| --- | --- | --- |
| `http` | Use HTTP to communicate | Follow an agreed way of asking and answering |
| `127.0.0.1` | Connect back to this computer | Reach the correct building |
| `4312` | Contact the service listening at this port | Approach the correct numbered counter |
| `/menu` | Ask that service for its menu | Specify what you want from the café |

The comparison helps distinguish the decisions. A port is a software networking mechanism, not a physical doorway or a USB socket. We will use “listening on a port” to mean that a running program has arranged to receive connections there.

### Why don't ordinary website addresses always show a port?

HTTP and HTTPS have default ports: `80` for HTTP and `443` for HTTPS. When a web URL leaves the port out, its scheme supplies the default. Our program will listen on `4312`, so we must include that number. Removing `:4312` would send the browser toward a different destination on the same computer. [HTTP and HTTPS URL defaults](https://www.rfc-editor.org/rfc/rfc9110.html#section-4.2)

You do not need a catalogue of port numbers. What matters is matching the address to the service that is actually listening.

**Pause and predict:** If you change `/menu` to `/opening-hours` but leave everything else unchanged, are you choosing another service or requesting different content from the same service?

You are requesting different content from the same service. The host and port remain unchanged.

## 3. A server file is not yet a running server

The exercise folder contains a file named `server.mjs`. It holds JavaScript instructions describing how our café program should answer requests.

Having those instructions on disk is only one part of running the service. Think about written instructions for staffing a café counter. The instructions can remain in a folder overnight, but a visitor will not get an answer from an unattended counter merely because that folder exists.

We need a program to execute the JavaScript instructions. For this exercise, that program is **Node.js**. You can think of Node.js as the runtime: the software that runs this JavaScript outside the browser.

When you start it with our file, your operating system creates a **process**, a running instance of the program. That process sets up the server and waits for connections. When you stop the process, the file remains on disk, but this instance is no longer there to answer requests.

| Thing | What it does here | What happens when you stop the café program |
| --- | --- | --- |
| `server.mjs` | Stores the instructions | The file remains available |
| Node.js | Runs the JavaScript instructions | Node.js stays installed; this running instance stops |
| The café process | Runs now and listens for requests | It stops listening and releases its port |
| Your browser | Sends requests and displays received content | It can remain open |

This distinction will matter whenever you run an application, change its source, restart a service, or investigate a stopped process. Today, you will observe it directly.

## 4. Prepare the exercise folder

Use the companion **HTTP_Lesson_02_Local_Server_Kit_v1.zip**. If you opened this lesson from its extracted folder, you already have the files.

You will need a browser, the desktop edition of VS Code, and Node.js 24.x. The main course introduces the editor and terminal earlier; the steps below refresh their use. Installation help is at the end if you are starting with this lesson on its own.

For this first exercise, run both Node.js and the browser directly in the same operating system on your computer. A remote workspace or a development container can give “this computer” a different meaning; use a local editor window for the steps below. Those environments get their own explanation later.

### Open the actual files

1. Extract the ZIP. On Windows, use **Extract All** from the file's context menu. On macOS, opening the ZIP normally creates an extracted folder. On Linux, use your archive manager's extraction action.
2. Find the folder named `http-lesson-02-lab` that contains `server.mjs` and `README.md`.
3. In VS Code, choose **File → Open Folder** and select that folder.
4. Confirm that `server.mjs` appears in the Explorer file list.

Open `server.mjs` if you want to see the supplied instructions. You are welcome to look through them, but writing or explaining every line is not required yet. Opening the file in the editor does not start the program.

### Open a terminal in that folder

Choose **Terminal → New Terminal** in VS Code. The terminal panel is a place to type commands and read their output. A command-interpreting program, called a **shell**, receives what you type and starts the requested program.

The integrated terminal normally starts in the open workspace folder. That current folder matters: when you type a filename without a longer path, the program will look relative to where the command is being run. If your terminal was already open in another folder, create a new one for this exercise. [VS Code: terminal basics](https://code.visualstudio.com/docs/terminal/basics)

The terminal may show a prompt ending in `$`, `%`, or `>`. Its appearance depends on your system. The examples below show only the command you type; do not add a prompt symbol.

### Check that Node.js is available

This command asks Node.js to print its installed version:

```sh
node --version
```

`node` names the program to start. `--version` is an option telling it what to do on this occasion.

You should receive output such as:

```text
v24.19.0
```

That is an example version, not a required exact patch number. This exercise targets the `24.x` release line; an up-to-date `v24` installation can show different later numbers. Node.js 24 is an LTS release line at the time this draft was authored. [Node.js releases](https://nodejs.org/en/about/previous-releases)

After printing the version, the command finishes and the prompt returns. If you get “command not found,” “not recognized,” or another version, use the setup help before starting the server. Keep the actual message: it tells us something about the environment, rather than about your understanding of HTTP.

## 5. Start the café and read what it tells you

The next command asks Node.js to execute the supplied file:

```sh
node server.mjs
```

Read it as “use Node.js to run the instructions in `server.mjs`.” Here, `server.mjs` is an argument specifying which file to run. The `.mjs` ending identifies this file as a JavaScript module; learning module syntax is not necessary for operating this example.

Type the command in the terminal and press Enter.

On a successful start with the default port, the program prints:

```text
Cafe server is listening on http://127.0.0.1:4312
Open in your browser: http://127.0.0.1:4312/menu
Leave this terminal open while you use the cafe.
To stop: focus this terminal and press Ctrl+C.
```

The first line is the useful milestone: the process has successfully started listening at that address and port. The second gives you a URL to request a particular page from it.

Unlike `node --version`, this command does **not** finish immediately. The process is doing its job by remaining available for requests. A missing prompt at this point is expected; the terminal is occupied by the running program.

Leave it running. You can switch to the browser without closing the terminal.

If the program prints that the address is already in use, the café did not start successfully. Read the occupied-port help near the end of this lesson and use the address from your successful startup. Do not proceed on the assumption that a different page already present at that address belongs to this exercise.

## 6. Ask for the menu

### Predict

What do you expect your browser to receive from `/menu`? What would tell you that the café program handled the request?

The program contains the same three-drink menu from Lesson 1. You should expect the menu in the browser and a matching request record in the terminal. Let's make the observation.

### Request

In your browser's address bar, enter the full address printed by the successful start:

```text
http://127.0.0.1:4312/menu
```

Press Enter. If you chose another port during setup, use that number instead.

This URL goes in the **browser's address bar**. `node server.mjs` went in the **terminal**. Those locations have different jobs: one starts the answering program, and the other asks that program for content.

The browser should display:

```text
Tea
Coffee
Hot chocolate
```

There is no decorative page design because this response contains plain text. Your browser is displaying the body supplied by the server.

### Connect the result to the running program

Return to the terminal. Look for this line:

```text
GET /menu -> 200
```

This is a **log entry**, a message our program writes about its activity. In this program, it says that a `GET` request for `/menu` was handled with a `200` response.

The line is a summary written by our code. It is not the complete HTTP request or response. Later you will inspect the actual message fields with dedicated tools.

Your browser may also request another resource automatically, such as an icon, causing an extra line. Locate the line for `/menu`; you are not expected to recognize every browser-generated request yet.

You now have two observations to connect: the server recorded handling the request, and the browser displayed the expected content. Neither observation requires a remote website: both programs are running in your local setup.

## 7. Change the path while keeping the service the same

Leave the server running. Change only the last part of the address:

```text
http://127.0.0.1:4312/opening-hours
```

Before pressing Enter, say what stayed the same and what changed. Then request the page.

Expected body:

```text
Monday-Friday: 08:00-17:00
Saturday-Sunday: Closed
```

Expected matching log entry:

```text
GET /opening-hours -> 200
```

The host and port stayed the same, so the browser contacted the same listening service. The path changed, so the server selected a different answer. You did not start a second server to obtain the opening hours.

Now consider `/opening-times`. A person may treat “opening times” and “opening hours” as equivalent. This small program recognizes `/opening-hours` and has no page at `/opening-times`.

Predict the outcome, then try:

```text
http://127.0.0.1:4312/opening-times
```

Expected body:

```text
404 Not Found
This cafe does not have that page.
Try /menu or /opening-hours.
```

The corresponding log should identify `/opening-times` and `404`.

Here, we deliberately included the words “404 Not Found” in the body so the lesson is easy to follow in the browser. The response also has a separate HTTP `404` status, which the server log reports. Text in a body is not, by itself, a way of inspecting the actual status.

The service answered your request and reported that this path was unavailable. Return to `/menu` and confirm that the café still serves it. A wrong path did not make the server disappear.

## 8. Stop the program and distinguish old content from a new response

### Predict before stopping

The menu is visible in your browser. What do you think happens if you stop the café process?

Consider two different questions:

1. Does the menu already drawn on the screen have to disappear immediately?
2. Can this stopped process answer a new request?

Write a prediction, even if you are unsure. Then run the experiment.

### Stop the process

Return to the terminal where the café is running. Make sure that terminal has keyboard focus and no text is selected. Press **Ctrl+C**. On macOS, use the Control key here, not Command.

This keystroke asks the foreground program to stop. Our server handles that request, closes its listening service, and prints:

```text
Cafe server stopped. The server.mjs file is still on your computer.
```

The shell prompt should return. You can now type another command there.

### Make a new request

First, look at the browser without reloading. The old menu may still be on the screen. Stopping the server does not instruct the browser to erase content it has already received.

Now reload the menu address, or enter the full address in a new tab. Assuming no other program has started at that address, there is no longer a café service to answer there. You should get a browser connection error instead of a fresh menu response. The exact wording depends on the browser and environment; it is not something to memorize.

Compare that with the earlier missing-path experiment:

| Situation | What the café process does | What you observed |
| --- | --- | --- |
| Running, asked for `/menu` | Handles the request and supplies the menu | Menu content and a matching `200` log entry |
| Running, asked for `/opening-times` | Handles the request and reports an unavailable path | The supplied error explanation and a matching `404` log entry |
| Stopped, a fresh request is attempted | This process cannot accept or answer the request | No new café log entry; normally a browser connection error |

The browser's connection-error page is produced by the browser. It is not the café sending our missing-page explanation.

If you still see the menu after a fresh navigation, record that honestly. Check whether you stopped the correct terminal, whether the address uses the expected port, and whether new log entries still appear. The setup help gives a recovery route. Do not rewrite an unexpected observation to match the lesson.

### Restart

In the same terminal, run the same start command again:

```sh
node server.mjs
```

Wait for the listening message, then reload the menu address. The program is available to answer again.

The source file was there throughout. What changed was whether a process was executing it and accepting connections.

## 9. Move the café to another port

You have changed a path and stopped a process. Now change the service's port.

Stop the running café with Ctrl+C before doing the next step. We will keep only one café instance running so the observation is easy to interpret.

The supplied program accepts an optional port number after its filename:

```sh
node server.mjs 4313
```

`4313` is another command argument. Our code reads it and uses it instead of the default `4312`. This is a feature of this particular supplied program; adding a number to an arbitrary command does not necessarily have this meaning.

Run the command and wait for the successful startup message. It should now name `4313`. If that port is occupied, use another available port as explained in the setup help.

Before opening the new address, compare these URLs:

```text
http://127.0.0.1:4312/menu
http://127.0.0.1:4313/menu
```

Both refer back to your computer, and both ask for `/menu`. They differ in which port the browser contacts.

Open the new address using the port from the startup message. The menu should be available there. Under the controlled setup where the old instance was stopped and nothing else is listening at `4312`, the old address will not reach this café.

This is like moving the café's service to another numbered counter inside the same building. Asking at the old counter does not redirect you automatically unless someone has deliberately provided that behavior.

You have not renamed the file, changed the menu, or moved the program to another computer. You have changed where this process listens for connections, then updated the client's destination to match.

When finished, stop this instance with Ctrl+C as well.

## 10. Follow the file and process over time

In this diagram, time runs downward. The source file remains available through the whole sequence; starting and stopping affect the process executing it.

```mermaid
sequenceDiagram
    actor Learner as You
    participant Terminal as Terminal and shell
    participant Server as Cafe process
    participant Browser as Browser
    Learner->>Terminal: Run node server.mjs
    Terminal->>Server: Start the supplied program
    Server-->>Terminal: Listening on 127.0.0.1:4312
    Learner->>Browser: Open the menu URL
    Browser->>Server: Request GET /menu
    Server-->>Browser: Respond with the menu
    Server-->>Terminal: Record the handled request
    Learner->>Terminal: Press Ctrl+C
    Terminal->>Server: Ask the process to stop
    Server-->>Terminal: Stopped; the file remains
    Learner->>Browser: Make a fresh request
    Note over Browser: No answer from the stopped cafe
```

In words: you use the terminal to start the server process. It announces that it is listening. Your browser requests the menu and receives an answer, while the program writes a log entry. You stop the process through the terminal. The source file remains, but a fresh browser request cannot receive an answer from that stopped process.

The diagram explains the relationship; it does not claim that these four participants are separate computers. In this exercise they operate on the same computer.

## 11. Try a short independent task

Use the earlier explanations and the supplied `Practice_Notes.md` if they help. Independence grows through practice; looking back is allowed.

### Task A: run the service and explain the destination

Start the café on port `4313`, or another available port if that one is occupied. Request its opening hours. Record:

- The command you ran.
- The full address you opened.
- The matching request log entry.
- What the host, port, and path each contributed.

Then stop the café and record what happens when you make a fresh request to that address.

### Task B: repair a mistaken explanation

A learner says:

> “I opened `server.mjs` in VS Code, so the server is running. The `/menu` part picks port 4312. If my browser still shows the old menu, that proves the server is alive.”

Identify three mistakes and explain each correction.

### Task C: use the idea in a different setting

Nora and Sam each run the supplied café on their own laptops at port `4312`. Both enter this same URL in their own browser:

```text
http://127.0.0.1:4312/menu
```

Are they asking the same running café process for a menu? Explain why. You can answer this as a thought experiment; you do not need a second laptop.

### Full explanations

**A.** With the standard alternative port, the command is `node server.mjs 4313`, and the URL is `http://127.0.0.1:4313/opening-hours`. The server should log `GET /opening-hours -> 200`. The host points back to this computer, the port selects the listening service, and the path selects the opening-hours content. After you stop that process, a fresh attempt should not receive a new response from it. Record your actual result and any setup difference, including a different chosen port.

**B.** Opening a source file lets you read or edit its instructions; you must run them to start the service. `:4312` is the port component in the URL; `/menu` is the path within the service. Previously displayed content can remain on the screen after the server stops, so an old menu does not establish that the program is still answering new requests.

**C.** Each browser's loopback address refers back to its own computer. Nora contacts the process on Nora's laptop; Sam contacts the process on Sam's laptop. Identical text in these two local addresses does not make them a shared public address or the same process.

## 12. What to take forward

You should now be able to explain how these four facts fit together:

1. A source file can exist while no server process is running.
2. A running service listens at a particular address and port.
3. The browser's URL must direct it to that service and identify what it wants there.
4. A response reporting an unavailable path differs from receiving no response from a stopped service.

You do not have to infer all of a computer's network configuration from a screenshot. The useful starting habit is to connect a claim to an observation: the startup message, the address you used, a matching log entry, or the result of a fresh request.

After a break, explain why changing only the path differs from changing only the port. Then explain how you would start the café again without rereading the full walkthrough.

The next lesson examines what HTTP messages can carry: plain text, HTML, and structured data. You will connect the content the server sends with the way a browser or another program uses it.

## Setup help: use the part that matches your obstacle

### Node.js or VS Code is not installed

The course's preparation stage covers installation. For a standalone attempt, obtain the desktop editor from the [official VS Code download page](https://code.visualstudio.com/Download) and Node.js from the [official Node.js download page](https://nodejs.org/en/download).

For Node.js, select the supported `24.x` LTS line and your actual operating system. Windows and macOS offer installers; Linux installation steps depend on the distribution and chosen supported method. Use the instructions for your platform instead of copying a command intended for a different one. On a managed computer, use the available software-installation or course-support process.

After installation, close and reopen VS Code, reopen the exercise folder, create a new terminal, and run `node --version` again. An existing terminal may not know about a newly installed command. If your course setup uses a version manager, follow its already-taught method to select Node 24 rather than introducing a second installation method.

If installation is still blocked, continue reading and work through the conceptual questions. Resume the practical steps when setup support has repaired the environment; reading the supplied examples is different from having run them yourself.

### The terminal says it cannot find `server.mjs`

Check that the archive has been extracted and that you opened the folder containing the actual `server.mjs` file. Opening the containing download folder or a ZIP preview is different.

In VS Code, reopen the correct folder and choose **Terminal → New Terminal**. Run the command there. If your settings preserve an old terminal location, use the folder's **Open in Integrated Terminal** action to start in the intended folder. Keep the filename exactly as supplied.

### VS Code will not open a terminal

If it reports **Restricted Mode**, its workspace-trust setting may be preventing code execution. Review the supplied exercise folder and use VS Code's workspace-trust controls for that folder, or your course's setup-support route if you cannot enable local execution. Do not change unrelated folders or organization-managed settings to complete this lesson.

### The program reports that the address is already in use

Another listener is already using that address and port in this setup. It might be an earlier instance of this exercise. If you can identify your earlier café terminal, stop that instance with Ctrl+C.

If you do not recognize the other program, leave it alone and choose another port for this café, such as:

```sh
node server.mjs 4314
```

Use `:4314` in the browser URL after the successful start. If it too is occupied, choose another available whole-number port from `1024` through `65535`, which is the range this exercise accepts. The error is a useful statement about the environment; restarting the same command without changing anything need not solve it.

### The browser cannot reach the café while you think it is running

Compare the browser's full address with the latest successful startup message. Check the scheme, host, and port, then the path. Use `http://127.0.0.1`, not the fictional `cafe.example` address from Lesson 1.

Check that the relevant terminal still shows the café running. If the shell prompt has returned, read the message before it and start again only after addressing the stated issue.

If the browser changes the URL to `https://`, the supplied HTTP service cannot answer that HTTPS attempt. Use the browser's supported local HTTP option if available; if managed browser policy prevents it, seek setup support. This lesson does not require changing global browser protections.

If the editor is connected to a remote computer, WSL, or a container while the browser is running elsewhere, return to the direct local setup described earlier or request the appropriate environment bridge. The same loopback text can refer to different environments.

### Ctrl+C did not stop the café

Click the correct terminal, clear any selected text, and try Ctrl+C again. Some terminal configurations copy selected text instead of interrupting the running program. On macOS, confirm that you used Control rather than Command.

If the terminal or computer uses a different configured interrupt action, use its documented equivalent or ask for setup help. Stop the specific café process you started; there is no need to terminate every Node.js program on the computer.

### The displayed page seems to disagree with the experiment

Make a fresh navigation to the full address and inspect the matching terminal. Old output and an already-drawn page are historical observations. Check for **new** activity after the action you are investigating.

If you cannot reproduce the expected sequence, keep the actual URL, startup message, browser wording, and what you did. That gives a tutor a concrete starting point. The provided walkthrough can explain the intended relationship while the environmental difference is investigated.

### I have seen longer URLs with `?` or `#`

Those introduce additional parts of a URL, called a query and a fragment. They are not needed for the host/port/path experiments here. A later lesson will explain their roles with examples before asking you to interpret them. For now, keep the supplied addresses unchanged except for the one part the experiment asks you to vary.

