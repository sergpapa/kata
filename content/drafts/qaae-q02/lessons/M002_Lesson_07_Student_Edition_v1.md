---
document_id: M002-STUDENT-07
version: "1.0.0-draft"
date: "2026-11-19"
audience: "A learner who has completed the first six lessons of the terminal module; no programming experience needed"
module: M002
candidate_lesson_id: LS-M002-07
status: "Student-facing draft with a runnable kit; owner review pending; not yet learner-tested"
prerequisites:
  - "Say where a relative path leads from a given folder, from the lesson Where the terminal is standing"
  - "Say what a command hands to a program, and repair a name with a space, from the lesson What a program receives"
  - "Read a program's output, messages and exit code, from the lesson Output, messages and the exit code"
  - "Set and remove a variable for one terminal, and find which file a command name starts, from the lesson The settings a program is handed"
  - "Change one thing at a time and keep observations apart from inferences, from the lesson When something goes wrong"
introduced_concepts:
  - "Instructions carry assumptions their writer cannot see: starting folder, shell, installed commands, settings, and what counts as success"
  - "A command log: one row per command, with folder, exact text, expectation, result and conclusion"
  - "Reproducing a failure before repairing it"
  - "A result that differs without any error, and an experiment that separates two explanations"
  - "Stating what remains uncertain, and what would settle it"
  - "Instructions another person can follow on a different computer"
learning_outcomes:
  - "Follow instructions that fail, and record each failure in a command log with who spoke, the exact message and the exit code"
  - "Name, for each failure, the assumption that was broken, and repair it with one change"
  - "Design a check that separates two explanations for a result that differs without an error"
  - "Say what you concluded without being able to verify it, and what would settle it"
  - "Rewrite a set of instructions so that a person on another system can follow them and can tell whether they succeeded"
exercise_kit: Terminal_Practice_Kit_v1.zip
exercise_kit_id: M002-LAB-01
exercise_kit_state: "As extracted, with ORDERS_LIMIT and ORDERS_DIR not set; this lesson creates report.txt in the kit folder and a command log outside it"
runtime_target: "Node.js 24.x; author verification used v24.12.0 with Windows PowerShell 5.1 on Windows 11, and v24.22.3 with bash 5.2 and zsh 5.9 on Ubuntu 24.04; nothing was run on macOS"
assessment_scope: "A guided investigation followed by a second one with less help; practice, not a demonstration of independent skill, because full explanations are open throughout"
deferred:
  - "Keeping instructions next to the code they belong to, and reviewing changes to them: the Git module"
  - "Scripts, which let a computer follow the instructions: the programming stage"
  - "Describing a whole environment so that it can be rebuilt exactly: the lessons on containers"
examples: "Dana, Tomás, their notes and the order files are fictional; output marked as the author's was captured on the systems named in runtime_target, with the home folder renamed to maria's"
references_reviewed: "2026-11-19"
---

# It worked on their computer

This lesson has almost nothing new to teach. It asks you to use what the last six lessons taught, together, on a problem of the kind you will meet for the rest of your working life.

Somebody gives you instructions. They are not careless, and they tested the instructions: every step worked when they did it. You follow the steps, and the first one fails.

The lesson answers one question:

> "Instructions that worked for someone else fail for me. How do I find out why, repair them, and leave them better for the next person?"

You need the kit from the lesson *Where the terminal is standing*, a terminal standing in the `terminal-practice-kit` folder, and a clean start: no `ORDERS_LIMIT` or `ORDERS_DIR` set, and no `tick.running` left over. The simplest way to be sure is to open a new terminal.

## 1. Start with a familiar situation: the note about the heating

You are staying in a friend's flat for a week while they are abroad. It is cold, and on the kitchen table is a note:

> "Heating: turn the dial to the usual setting and press the button by the door twice. If it doesn't come on, use the key from the hook."

Your friend is not a careless person. They have done exactly this every winter morning for years, and it works every time. Now try to follow it.

*The usual setting.* The dial goes from 1 to 6. Usual for whom? Your friend carries that number in their head and has never needed to write it down.

*The button by the door.* The flat has three doors. Your friend always stands in the hall when they do this, so for them there is only one door.

*The key from the hook.* There is a hook. There is no key on it. Your friend keeps that key on their own key ring, which is in their pocket, abroad.

*If it doesn't come on.* How would you know that it had? Your friend would hear the boiler in the cupboard start to hum. You do not know there is a boiler in the cupboard.

Every sentence in the note is true. Not one of them can be followed by anybody but its writer. And here is the point of the scene: **your friend could not have found these gaps by rereading the note.** To them it is complete. The missing parts are the things they never have to think about. Only a different person, standing in a different place, can find them, and they find them one at a time, by failing.

That makes you, the confused guest, the person best placed to fix the note. By the end of the evening you will know the dial setting, which door, where a spare key is, and what a working boiler sounds like. If you write those four things down, the next guest will be warm in two minutes.

### Pause and explain

You phone your friend and say, "Your note is wrong." They are a little hurt: "It's not wrong, I do exactly that every day." Who is right?

Both. Nothing in the note is false, and the note does not work. A set of instructions can be true and still be unusable, because what makes it work is partly on the page and partly in the writer's surroundings. "Wrong" is the wrong word for it. "Incomplete in ways you cannot see" is fairer and more useful. Bring that attitude to this lesson, including when the writer of the instructions is you.

## 2. What instructions leave out

Instructions for a terminal leave out the same kinds of thing as the heating note, and you have spent six lessons on each of them.

| What the writer did not have to think about | In the heating note | In a terminal | Where you learned it |
| --- | --- | --- | --- |
| Where they were standing | "The door" | The current folder, and paths that exist only on their computer | *Where the terminal is standing* |
| How their words get cut up and passed on | | Their shell: quotation marks, slashes, wildcards, the way a variable is set | *What a program receives* |
| What they had to hand | The key in their pocket | Commands that exist only on their computer | *The settings a program is handed* |
| What was already set | "The usual setting" | Environment variables they set long ago | *The settings a program is handed* |
| What had been left behind earlier | | Files, markers and processes from previous work | *Change files without regret*, *Programs that keep running* |
| How they knew it had worked | The hum of the boiler | What they looked at: the screen, a file, the exit code | *Output, messages and the exit code* |

When a step fails, the cause is almost always in one of these six rows. That gives you a short list of questions to put to any failure, in place of a general feeling that "something is different on my machine".

## 3. The command log

When one thing fails and you fix it, memory is enough. When five things fail one after another, and fixing each one reveals the next, memory lets you down. After twenty minutes you no longer know which command produced which message, what you changed, or what it was like before.

The tool for this is a **command log**: a plain record, one row per command, written as you go. The kit has a template, `Command_Log_Template.md`. Open it in VS Code, choose **File → Save As**, and save a copy named `command-log.md` in your `course-work` folder, outside the kit, for the reason your recovery note lives there.

Each row answers six questions.

1. **Current folder.** Half of every relative path.
2. **The command, exactly as typed.** Copied, not retyped from memory.
3. **What I expected.** Written before you look. A wrong expectation is useful. A missing one teaches nothing.
4. **What happened.** Who spoke, the exact message, and the exit code.
5. **What I conclude.** Marked as a conclusion. This is the inference column.
6. **What I change next.** One thing.

Four rules keep it honest.

- **Log the failures.** They are the valuable rows. A log that shows only the commands that worked is a set of instructions with the same blind spots as the one you were given.
- **One change per row.** You know this from *When something goes wrong*: change two things and you cannot say which mattered.
- **Ask for the exit code at once**, before any other command replaces it.
- **Do not tidy it afterwards.** The wrong turnings show which assumptions were tested.

First **reproduce**, then repair. To reproduce a failure is to make it happen on purpose, exactly as reported, and record it. It can feel like wasted time when you already suspect the cause. It is what lets you say afterwards that the repair fixed **this** failure, because you have the same command failing before and passing after.

## 4. A worked investigation: Dana's note

Dana runs the monthly order check. On her last day before leave she wrote the steps down for whoever covers for her, and that is you. Her note is in the kit. Print it:

```sh
cat handover/monthly-check.md
```

It has four steps. Read all four before you run anything, as you would with any instructions from another person. Nothing in it deletes or installs. Step 4 writes a file named `report.txt`. Check with `ls` that you have no file of that name you want to keep.

### Run the first two steps, and log them

Do steps 1 and 2 of Dana's note exactly as she wrote them, in your own terminal. For each command: fill in the first three columns of a row, run it, ask for the exit code where a program ran, and fill in the fourth column. Leave the last two columns empty for now.

Do not repair anything yet. You are reproducing.

When you have two rows, read on and compare them with the author's.

### The first three rows

**Row 1.** Current folder: the kit folder. Command: `cd C:\Users\dana\work\terminal-practice-kit`. Expected: to be in the kit folder.

```text
Windows PowerShell (the author's run):
cd : Cannot find path 'C:\Users\dana\work\terminal-practice-kit' because it does not exist.

bash, on Linux:
bash: cd: C:Usersdanaworkterminal-practice-kit: No such file or directory

zsh, on Linux:
cd: no such file or directory: C:Usersdanaworkterminal-practice-kit
```

Who spoke? The shell: `cd` is built into it. What went wrong? No such folder. Where? The path it printed.

On Windows the path is printed just as Dana wrote it. In bash and zsh it reads `C:Usersdanawork...`, with every backslash gone. You know why from *What a program receives*: those shells treat a backslash as protecting the next character, and remove it. So one line of the note carries two assumptions: Dana's folder, and Dana's shell.

Conclusion: this is the first row of the table in Section 2. It is a full path on Dana's computer. The step's purpose is "be in the kit folder", and you can achieve that in your own way. Change: use your own kit folder. You are already in it, so confirm with `pwd` and go on.

**Row 2.** Current folder: the kit folder. Command: `ordercheck orders-2026-11.csv`. Expected: a report on November's orders.

```text
Windows PowerShell (the author's run):
ordercheck : The term 'ordercheck' is not recognized as the name of a cmdlet, function, script file, or operable program. ...

bash, on Linux:
bash: ordercheck: command not found

zsh, on Linux:
zsh: command not found: ordercheck
```

Who spoke? The shell again. No program ran, so there is no exit code from a program. In bash and zsh the shell's own number is 127. In PowerShell, `$LASTEXITCODE` shows whatever was there before, which is why the log records "the shell spoke" and does not trust the number.

From *The settings a program is handed* you know what this message means and what it does not. No folder on your PATH list holds a program called `ordercheck`. That is the observation. Two explanations fit it:

- **(a)** `ordercheck` is a real program that you were supposed to install.
- **(b)** `ordercheck` is a short name Dana made for herself on her own computer.

Do not choose by feel. Look for a check whose result would differ. The kit's `README.md` lists every program in the kit, and there is no `ordercheck` in it. Dana's own step 3 runs `node check-orders.mjs`, with an order file as its argument, the same shape as step 2. And the lessons never installed anything of that name. All three point to (b). It remains an inference, because you cannot see Dana's computer, and the log should say so.

Conclusion: `ordercheck` is probably Dana's own short name for `node check-orders.mjs`. This is the third row of the table: a command that exists only on her computer. Change one thing: replace `ordercheck` with `node check-orders.mjs` and leave the rest of the command alone.

**Row 3.** Current folder: the kit folder. Command: `node check-orders.mjs orders-2026-11.csv`. Expected: the report.

```text
check-orders: cannot read the file C:\Users\maria\course-work\Terminal_Practice_Kit_v1\terminal-practice-kit\orders-2026-11.csv
```

The exit code is 2.

Something has changed, and it is progress. A different voice is speaking: the program, not the shell. So the repair in row 2 worked, the program started, and it has met the **next** problem. That is typical. Repairing one assumption does not make instructions work. It lets them run as far as the next one. A log is what stops this from feeling like going round in circles: each row fails further along than the row before.

The investigation continues from here, and it is yours.

## 5. Try it with less help

Graduated hints and complete explanations follow these four practices. Use as little help as you need, and note in your log what help you used. The scale from *When something goes wrong* applies: a hint that names the area is H2, and one that tells you a check to run is H3.

### Practice A: finish Dana's note

Carry on from row 3, one row per command, until all four of Dana's steps have run and you can explain every difference between what her note says and what you saw. There are four things to find:

1. Why the program cannot read the file in row 3, and what Dana must have had that you do not. Find two different repairs and choose one.
2. Once the check runs: your `Result` line does not match the one in Dana's note. No error is shown anywhere. Find an explanation, and design a check that supports it. Then write down what you still cannot know.
3. Why step 3 fails, and why it may have worked for Dana all the same.
4. What is wrong with the last sentence of step 4. Run the step, look at the screen, ask for the exit code, and print the file.

Finish by filling in the two sections at the end of the log: "What was wrong" and "What I am still not sure about".

### Practice B: rewrite the note

Write a new version of Dana's note in a file of your own, `monthly-check-revised.md`, in your `course-work` folder. A person who has the kit, on Windows, macOS or Linux, and who has never met Dana, should be able to follow it and should be able to tell whether it worked.

Before you write, list what every step of a good set of instructions needs. Then check your list against the one in the explanations.

### Practice C: a second note, with less help

A different colleague, Tomás, left a different note: `handover/year-end-check.md`. Print it, read it through, and then do what you did for Dana's: follow it as written, log every command, repair one thing at a time, and get its step 4 to produce the result Tomás expects.

Then answer:

1. For each of his five steps, which row of the table in Section 2 does it break for you? The answer depends on your shell: some of his steps work as written in bash and zsh and fail in PowerShell.
2. His step 5 says the year is closed if the `Result` line is printed. In which situations is that line printed, and in which is it not? What should the step say?
3. After you have followed his note to the end, something is different about your terminal that was not different before. What is it, how could it affect the next thing you do in that terminal, and how do you put it back?

### Practice D: your own blind spots

You have now seen two people's notes fail. Without looking anything up:

1. Of the six rows in Section 2, which would **you** be most likely to leave out of a note, and why that one?
2. Look at your recovery note from *When something goes wrong*. Find one line in it that a stranger could not follow, and rewrite it.
3. What is the cheapest reliable way to find the gaps in instructions you have written yourself?

### Hints for Practice A

Open only the ones you need.

**Part 1.**

- *A direction (H1):* read the path in the message, as you have done since *When something goes wrong*.
- *The area (H2):* the path is your kit folder with the file name joined on, and the file is not directly in the kit folder. Dana typed a bare file name and it worked for her. The program's own help mentions a setting that would make that possible.
- *A check (H3):* run `node check-orders.mjs --help` and read the section on environment variables. Then run `node check-orders.mjs --settings`.

**Part 2.**

- *A direction (H1):* the first line of the report shows something besides the file name.
- *The area (H2):* you have already found one setting that Dana had and you do not. A report can change without the command changing.
- *A check (H3):* print the order file with `cat` and look at the totals. Which limit would make exactly one more order count as a problem? Try it with `--limit`.

**Part 3.**

- *A direction (H1):* the program prints what it received, in square brackets.
- *The area (H2):* the file's name has a space in it. If you use bash or zsh, the backslashes matter as well.
- *A check (H3):* put `show-args.mjs` in place of `check-orders.mjs` in Dana's command.

**Part 4.**

- *A direction (H1):* "no error on the screen" is an observation about one of three things a program leaves.
- *The area (H2):* where did the report go, and what does the program use to say that it found a problem?
- *A check (H3):* `$LASTEXITCODE` or `echo $?` straight after the command, then `cat report.txt`.

### Practice explanations

**A.** The author's log continued like this. Your rows may come in a different order.

*Part 1: the file.* The message's path is the kit folder with `orders-2026-11.csv` joined on. The file is in `data`. Dana typed the bare name and it worked for her, and her step 1 puts her in the kit folder, not in `data`. So her program was looking somewhere other than the current folder. The help text explains how: `ORDERS_DIR` is "a folder to look in when the order file is not a full path". `node check-orders.mjs --settings` on your computer says `orders dir   not set`. The inference: Dana set `ORDERS_DIR` on her computer long ago, to her `data` folder, and forgot that it was there. That is the fourth row of the table.

Two repairs. Either set `ORDERS_DIR` to the full path of your `data` folder for this terminal, which copies Dana's hidden setting. Or name the file with its folder: `node check-orders.mjs data/orders-2026-11.csv`. The second is the better choice for instructions, because everything the command depends on is then visible in the command.

```text
Checking data/orders-2026-11.csv (limit 500.00)
PROBLEM  line 5: order 1104 total 187.00 is not 2 x 89.00
Result: 7 orders checked, 6 in order, 1 with a problem.
```

The exit code is 1.

*Part 2: the result that differs.* Dana's note says `5 in order, 2 with a problem`. You have 6 and 1. No message complains about anything, and this is the hardest kind of difference to notice, because nothing draws your eye to it. If you had not compared your `Result` line with hers character by character, you would have gone on.

Explanations that fit: Dana's order file was different from yours. Or Dana's limit was different. Or Dana misremembered. The second is worth testing first, because you have just learned that she had one forgotten setting, and the report's first line shows the limit in use, `500.00`.

Print the file with `cat data/orders-2026-11.csv` and read the totals: 33.60, 42.00, 42.00, 187.00, 8.25, 65.00 and 72.00. Order 1104 is already reported. One more order becomes a problem if the limit is below 72.00, and a third would appear if the limit dropped below 65.00. So try a limit between the two:

```sh
node check-orders.mjs data/orders-2026-11.csv --limit 70
```

```text
Checking data/orders-2026-11.csv (limit 70.00)
PROBLEM  line 5: order 1104 total 187.00 is not 2 x 89.00
PROBLEM  line 8: order 1107 total 72.00 is above the limit
Result: 7 orders checked, 5 in order, 2 with a problem.
```

That is Dana's `Result` line. In the author's runs a limit of 65 gave the same line, 64 gave three problems, and 72 gave one.

What the log may say: the difference is **consistent with** Dana having `ORDERS_LIMIT` set to some amount from 65.00 up to just under 72.00. What it may not say: that her limit was 70, or even that a limit is the cause. The experiment shows that a limit in that range would produce her line. It does not show what is on her computer. Under "What I am still not sure about" belongs: which limit Dana uses, and whether her order file is the same as mine. What would settle it: the output of `node check-orders.mjs --settings` on her computer. That is one question to ask her, and it is much better than the question you could have asked an hour ago, "your note doesn't work".

*Part 3: the archive.* Dana's command, as written:

```text
Windows PowerShell (the author's run):
check-orders: one order file is expected and 2 arguments arrived: [data\archive\orders] [2025.csv]

bash or zsh (the author's run):
check-orders: one order file is expected and 2 arguments arrived: [dataarchiveorders] [2025.csv]
```

The exit code is 2. The program is speaking, and it shows the slip: the shell cut the name at its space. In bash and zsh the backslashes were removed as well. This is the second row of the table. The repair that works in every shell uses quotation marks and forward slashes:

```sh
node check-orders.mjs "data/archive/orders 2025.csv"
```

It reports three orders, all in order, with exit code 0. Why might the unquoted command have worked for Dana? A likely story is that she never typed it in full: she typed `data\archive\or`, pressed Tab, and her shell completed and protected the name for her. Then she wrote the note from memory, without the protection. That is an inference too. It is worth recording because it suggests how such errors get into notes: people write down what they believe they type.

*Part 4: the report, and "everything is fine".* With a forward slash, the command runs and the screen stays **completely empty**. By the note's own test, "if no error shows up on the screen, everything is fine". Ask for the exit code: it is 1. Print the file: it holds the report, with the problem in order 1104.

Nothing appeared on the screen because the report went into the file, and November's file produces no warnings for standard error. The screen was the wrong place to look. This is the last row of the table: Dana knew it had worked because she opened the file afterwards, or because she knew what November looked like, and wrote down neither. The step should say what to check: the exit code, and the `Result` line in the file.

In bash and zsh, Dana's command as written, with its backslash, fails differently: `check-orders: cannot read the file ...terminal-practice-kit/dataorders-2026-11.csv`, exit code 2, and `report.txt` exists and is **empty**. An empty report file with an error on the screen is at least noticeable. The same failure inside a script that hid standard error would leave nothing but an empty file.

One more defect in step 4: `>` replaces `report.txt` every month. Last month's report is destroyed by this month's run.

**B.** What every step of usable instructions needs:

- **The starting folder**, stated in a way that is true on any computer: "in the kit folder, the one that contains `check-orders.mjs`", and a command that confirms it.
- **Commands that depend on nothing hidden**: no personal short names, no settings assumed to exist. If a setting is needed, a step sets it, in both spellings.
- **Commands that survive a change of shell**: forward slashes, quotation marks around any name with a space, no wildcards unless they are the point.
- **What you should see**, including what may differ.
- **How to tell that it worked**: the exit code and what it means, and where the output went.
- **What is left behind**, and how to remove it.
- **What it was checked on**, and when.

One version that meets the list:

```markdown
# Monthly order check

Checked on Windows 11 (PowerShell) and Linux (bash, zsh) with Node.js 24, November 2026.

Start in the kit folder: the one that contains check-orders.mjs. Confirm with: pwd
No environment variables are needed. If ORDERS_LIMIT or ORDERS_DIR is set in your
terminal, remove it first, or open a new terminal.

1. Check the month's orders. Put the month in the file name.

       node check-orders.mjs data/orders-2026-11.csv

   Read the Result line, then ask for the exit code at once:
   $LASTEXITCODE in PowerShell, echo $? in bash or zsh.
   - 0: every order is in order.
   - 1: at least one order has a problem. Each is listed on a line starting PROBLEM.
   - 2: the check could not be done. Read the message. Do not send a report.
   For November 2026, expect: 7 orders checked, 6 in order, 1 with a problem. Exit code 1.

2. Check the archive file. The quotation marks are needed: the name has a space.

       node check-orders.mjs "data/archive/orders 2025.csv"

   Expect: 3 orders checked, 3 in order, 0 with a problem. Exit code 0.

3. Save the month's report in a file named for the month, so that earlier reports are kept.

       node check-orders.mjs data/orders-2026-11.csv > report-2026-11.txt

   The screen stays empty unless a line of the file could not be read: such warnings
   appear on the screen and are not in the file. An empty screen does not mean
   "no problems". Check the exit code as in step 1, and read the file.

Open question for Dana: her note expected 2 problems for November. A limit between
65.00 and 71.99 would give that. Which limit does she use, and should this note set it?
```

Yours will differ, and should. Test it against the list. The open question at the end belongs there: instructions that state their own uncertainty are more trustworthy than instructions that hide it.

**C.**

1. Step by step:
   - **Step 1**, `cd ~/jobs/terminal-practice-kit/data`: fails in every shell, because it is a path on his computer. First row. Its purpose is "stand in the kit's `data` folder", so from the kit folder: `cd data`. Notice that this note starts in a different folder from Dana's, and its later steps depend on that.
   - **Step 2**, `export ORDERS_LIMIT=300`: works silently in bash and zsh. In PowerShell the shell says `export` is not recognised. Second row: his shell. The PowerShell spelling is `$env:ORDERS_LIMIT = "300"`.
   - **Step 3**, `oc --settings`: the shell cannot find `oc`, in every shell. Third row: a short name of his own. Step 4 shows what he runs, so from `data` it is `node ../check-orders.mjs --settings`, which reports `limit        300.00  (from the environment variable ORDERS_LIMIT)`.
   - **Step 4**, `node ../check-orders.mjs archive/orders\ 2025.csv`: works as written in bash and zsh, where the backslash protects the space. In PowerShell the program reports `one order file is expected and 2 arguments arrived: [archive/orders\] [2025.csv]`. Second row again. With quotation marks, `"archive/orders 2025.csv"`, it works everywhere. Both relative paths are written from `data`, so the step fails with `Cannot find module` if you skipped the `cd` in step 1. The result, in the author's runs: `PROBLEM  line 3: order 2502 total 340.00 is above the limit`, then `Result: 3 orders checked, 2 in order, 1 with a problem.`, exit code 1.
   - **Step 5** breaks the last row for everyone.
2. The `Result` line is printed whenever the check could be done: with exit code 0 and with exit code 1. It is missing only when the check could not be done, exit code 2. So "the Result line was printed" separates "checked" from "not checked", and says nothing about whether the orders are in order. By his own expected result there is an order with a problem, and his step declares the year closed regardless. The step should say what to do for each exit code: for 0, close the year. For 1, look at the listed orders first. For 2, repair the command.
3. `ORDERS_LIMIT` is still set to 300 in that terminal, and the terminal is standing in `data`. Both are the fifth row of the table: things left behind. If you ran Dana's monthly check next in the same terminal, it would use a limit of 300 without saying why, and its relative paths would lead to the wrong places. Put it back with `Remove-Item Env:ORDERS_LIMIT` or `unset ORDERS_LIMIT`, and `cd ..`. Or close the terminal. A good note ends with that step, or avoids the need for it by passing `--limit 300` in the command, where it is visible and lasts for one run.

If you use bash or zsh, Tomás's note needed three repairs and Dana's needed more. If you use PowerShell, it was the other way round. Neither of them wrote a worse note. Each wrote for their own shell without knowing it.

**D.** There are no single right answers here. Some things to compare yours with.

1. Many people name the starting folder, because it is so constant in their own work that it stops feeling like a fact. Settings made long ago are another common answer: you cannot leave out what you remember, and you leave out what you have forgotten you did.
2. Typical lines a stranger cannot follow: "in my course folder", "the usual check", a path beginning with `~` and no explanation, or a command with no statement of what a good result looks like.
3. Have somebody else follow them, on a different computer, while you stay silent and watch where they stop. If nobody is available, follow them yourself in a new terminal, in a different folder, a few days later. Rereading your own instructions at your own desk finds almost nothing, for the reason your friend could not see the gaps in the heating note.

## 6. What you should be able to explain now

Close the lesson for a moment and explain to an imaginary colleague who has just said "it works on my machine":

- What six kinds of thing do instructions leave out without their writer noticing?
- What goes into one row of a command log, and why do the failed commands stay in it?
- Why reproduce a failure before repairing it?
- After a repair, the same step fails with a different message from a different speaker. Why is that progress?
- A result differs and no error is shown. How do you go about explaining it?
- What is the difference between "this explains it" and "this is consistent with it", and where in the log does that difference go?
- What does a step need so that another person can tell whether it worked?
- What can following a set of instructions leave behind in your terminal?

## 7. What this module established

You began this module able to run a command that somebody else had chosen, in a folder somebody else had opened. Look at what stands behind a single line now.

When you read `node check-orders.mjs "data/archive/orders 2025.csv" --limit 300 > report.txt`, you can say where the terminal must be standing for both relative paths to lead somewhere. You can say what the shell does to the line and how many arguments the program is handed. You can say which file is about to be replaced. You can say where the report goes, where a warning would go, and what number will be left behind for other programs to read. You can say which settings could change the result without appearing in the line, and which file is started when you type `node`. And you know what kind of thing exists between pressing Enter and the prompt coming back.

Later modules build directly on each of these.

- The **Git** module comes next. It records every version of your files, which gives you what *Change files without regret* could not: a way back. Its commands are programs with arguments, options and exit codes like any other.
- The **programming** lessons have you write programs that read arguments and the environment, print to the two streams, and choose an exit code. You will be on the other side of the hatch.
- The lessons on **dependencies and tooling** return to PATH, to permanent settings, and to tools that manage several versions of a program.
- The lessons on **containers** and **continuous integration** run your commands on other computers, with no person watching, where the environment is described in a file and the exit code decides whether a change is accepted.

Add to your recovery note, under "Problems I met and what fixed them", the one failure from this module that took you longest to understand, with the command that revealed its cause. And keep your command log. It is the first record you have made of an investigation, and you will be asked to make better ones.

## If something does not match

**Your first row succeeds: `cd` to Dana's path works.** That can only happen if a folder of that exact name exists on your computer. Check with `pwd` where you are, and return to your own kit folder.

**Dana's step 2, repaired, prints the report at once, with no "cannot read" message.** `ORDERS_DIR` is set in your terminal, probably from a practice in an earlier lesson. That is the lesson's point, arriving early. Check with `node check-orders.mjs --settings`, then open a new terminal and start again from a clean state.

**Your `Result` lines differ from the author's in a way the explanations do not cover.** Check `node check-orders.mjs --settings` first: a limit left over from an earlier lesson changes every result. Then check that the kit's `data` files are unchanged, by extracting the ZIP into a fresh folder and comparing.

**A step of Tomás's note fails with `Cannot find module`.** The terminal is not in the `data` folder. His note starts there, and both paths in step 4 are written from there.
