---
document_id: M002-STUDENT-03
version: "1.0.0-draft"
date: "2026-11-20"
audience: "A learner who can move around folders in a terminal and knows how a shell cuts a command into arguments; no programming experience needed"
module: M002
candidate_lesson_id: LS-M002-03
status: "Student-facing draft with a runnable kit; owner review pending; not yet learner-tested"
prerequisites:
  - "Say where the terminal is standing and where a relative path leads, from the lesson Where the terminal is standing"
  - "Say what a wildcard and quotation marks do to a command, from the lesson What a program receives"
  - "Judge an instruction by source, action and permission, from the lesson Set up a safe workspace"
introduced_concepts:
  - "Creating a folder, and copying, moving, renaming and deleting from the terminal: mkdir, cp, mv, rm, and cat to read a file"
  - "A command that succeeds often prints nothing"
  - "Copying or moving onto an existing name can destroy the old content without a warning"
  - "A terminal delete does not use the Recycle Bin or Trash"
  - "Three checks before a command that destroys: where am I, list with the same words, stop on a surprise"
  - "Deleting a folder with everything in it, and how to read rm -rf"
  - "Resetting a practice folder and verifying the reset"
learning_outcomes:
  - "Create a folder and copy, move, rename and delete files with commands, and confirm each result by listing"
  - "List exactly what a delete command will remove before running it, and stop when the listing shows a surprise"
  - "Explain why the same delete command is safe in one folder and harmful in another"
  - "Read a delete instruction from another person and say what is missing before it can be run safely"
  - "Reset the practice folder and show that it is back in its starting state"
exercise_kit: Terminal_Practice_Kit_v1.zip
exercise_kit_id: M002-LAB-01
exercise_kit_state: "As extracted; this lesson creates and changes only the folder named sandbox, which reset-sandbox.mjs rebuilds"
runtime_target: "Node.js 24.x; author verification used v24.12.0 with Windows PowerShell 5.1 on Windows 11, and v24.22.3 with bash 5.2 and zsh 5.9 on Ubuntu 24.04; nothing was run on macOS or in PowerShell 7; the question PowerShell asks before deleting a folder with contents needs a keypress and is described from Microsoft's documentation"
assessment_scope: "Guided file operations inside a disposable folder, prediction and judgment; it does not establish safe practice on real data"
deferred:
  - "Getting an earlier version of a file back: the Git module"
  - "Why a file may refuse to be changed or deleted (permissions in depth): the lessons on containers and running services"
  - "Sending a program's output into a file: the lesson Output, messages and the exit code"
examples: "The clearance crew, the colleague's messages and the order files are fictional; output marked as the author's was captured on the systems named in runtime_target, with the home folder renamed to maria's"
references_reviewed: "2026-11-20"
---

# Change files without regret

The two lessons before this one only looked. `pwd`, `ls`, `where.mjs` and `show-args.mjs` change nothing, and you could run them a thousand times anywhere.

This lesson changes things. You will create a folder, copy and move files, rename one, and delete several. These are the commands with which people lose work, and the loss nearly always happens the same way: a correct command, run from the wrong place, or covering more than its author pictured.

The lesson answers one question:

> "How do I change and delete files from the terminal, and how do I make sure a delete removes what I meant and nothing else?"

Everything happens inside one disposable folder that a kit program builds and rebuilds for you. You need the kit from the lesson *Where the terminal is standing*, and a terminal standing in the `terminal-practice-kit` folder. Confirm with `pwd`.

If you already use `cp`, `mv` and `rm` every day, read "Three checks before anything that destroys" in Section 5, then go to Section 8 and try Practices A and B.

## 1. Start with a familiar situation: the clearance crew

A relative has moved out and you have a garage to empty. You hire a clearance crew, and because you cannot be there, you leave a note on the kitchen table:

> "Please take everything from the garage."

Think about how this crew works. They are fast and they are careful to follow instructions. And four things are true of them.

1. **They do exactly what the note says.** Not what you meant. "Everything" includes the bicycle your neighbour stored there last winter, because the note does not mention a bicycle.
2. **They work where they are standing.** Your house is number 41. If they are at number 14, the note is just as clear to them, and number 14 has a garage too.
3. **They do not ask.** A friend helping you would hold up the bicycle and say "this as well?". The crew was given a note, and the note answered the question.
4. **Their van goes straight to the incinerator.** There is no storage unit where things wait for a month. When the van leaves, it is done.

None of this makes them bad at their job. Most days it is exactly what you want: you write one line and a garage is empty by lunchtime, with no questions to answer. It goes wrong only when what the note says and what you pictured are different, and the crew has no way to notice the difference.

So the care has to come from you, **before** they start. Three things, which take a minute:

- Check the address. Are they at number 41?
- Walk through the garage with the note in your hand and look at what "everything" covers today.
- If you see something you did not expect, the bicycle, stop. Do not let them start until you have dealt with it.

### Pause and explain

A friend says: "The crew should simply ask before taking anything unusual." Why can they not, even if they wanted to?

Because "unusual" is in your head and not in the note. The crew sees a garage full of objects and a note that says everything. Nothing marks the bicycle as different from the boxes. Only the person who knows what should be there can spot what should not, and that person has to look.

## 2. A place where mistakes are free

The commands in this lesson are that crew. Before you meet them, build a place where nothing matters.

The kit has a program that creates a practice folder named `sandbox` and fills it with a few small files. Before you run it, treat it as you learned to in *Set up a safe workspace*. This program deletes a folder, so it deserves the three questions. Open `reset-sandbox.mjs` in the editor and read the comment at the top. It says which one folder it deletes and rebuilds: the folder named `sandbox` that sits beside the program itself, wherever the terminal happens to be standing.

Now run it:

```sh
node reset-sandbox.mjs
```

The author's run in PowerShell:

```text
Resetting the practice folder: C:\Users\maria\course-work\Terminal_Practice_Kit_v1\terminal-practice-kit\sandbox
Done: 3 folders (inbox, keep, archive) and 7 files.
```

Notice what a carefully written program does. It prints the **full path** of the folder it is about to destroy, so that the target is on the screen and not left to your memory. That is the clearance crew reading the address aloud before starting. Few programs are this polite.

Go in and look:

```sh
cd sandbox
ls
ls inbox
ls keep
```

You will see three folders, `archive`, `inbox` and `keep`. `inbox` holds five files: `draft.tmp`, `notes.txt`, `old.tmp`, `orders-week-1.csv` and `orders-week-2.csv`. `keep` holds two: `price-list.txt` and `scratch.tmp`. `archive` is empty.

You can run `node reset-sandbox.mjs` from the kit folder as often as you like. Every mistake in this lesson costs one command to undo. That will not be true outside the sandbox, which is why the habits are learned here.

**Stay in the `sandbox` folder for Sections 3 to 6.** Every path below is relative to it.

## 3. Make and copy

Five commands do nearly all the changing. Their names are the same in PowerShell, bash and zsh.

| Command | Short for | What it does |
| --- | --- | --- |
| `mkdir` | make directory | Creates a folder |
| `cp` | copy | Copies a file |
| `mv` | move | Moves a file, or renames it |
| `rm` | remove | Deletes |
| `cat` | concatenate | Prints the content of a file. The odd name comes from its other use, joining files |

Under the same names sit different programs. In bash and zsh most of these are small separate programs on the disk. In PowerShell on Windows they are short names for PowerShell's own built-in commands. For everyday use they behave alike, and this lesson marks each place where they do not. [PowerShell: aliases](https://learn.microsoft.com/powershell/module/microsoft.powershell.core/about/about_aliases)

Create a folder for December inside `archive`:

```sh
mkdir archive/2026-12
```

Here the shells differ in manners. PowerShell prints a small listing of the folder it created. bash and zsh print **nothing at all**.

That silence is worth a moment. In bash and zsh, and for most commands in PowerShell too, **a command that succeeds says nothing**. No "Done", no tick. The prompt simply returns. It unsettles people at first: they run the command again to be sure, and the second run fails because the folder now exists. A silent prompt usually means it worked. If you want to see the result, look: 

```sh
ls archive
```

It shows `2026-12`.

Now copy a file into the new folder. `cp` takes two arguments: what to copy, and where to:

```sh
cp inbox/orders-week-1.csv archive/2026-12
ls archive/2026-12
```

The listing shows `orders-week-1.csv`. The original is still in `inbox`: a copy leaves the source alone. Because the second argument was an existing **folder**, the copy went into it under the same name.

If the second argument is a name that does not exist yet, the copy gets that name:

```sh
cp inbox/notes.txt inbox/notes-copy.txt
cat inbox/notes-copy.txt
```

```text
Week 2 arrived a day late. Ask whether week 3 will too.
```

`cat` printed the copy's content, and it is the content of `notes.txt`.

### The first trap: copying onto a name that exists

What if the second argument is a **file that already exists**? Find out, in the sandbox, where it is free:

```sh
cp keep/price-list.txt inbox/notes-copy.txt
cat inbox/notes-copy.txt
```

```text
Desk lamp 42.00
Pen box 2.75
Notebook A5 3.50
```

The command printed nothing, in every shell. The note about week 2 is gone from `notes-copy.txt`, and the price list is there in its place. No question was asked and no warning was shown. The old content is not in the Recycle Bin. It no longer exists anywhere.

This is the crew doing exactly what the note says. "Copy this file to that name" has one meaning when the name is taken: the name now holds the new content.

So before a copy, know whether the destination exists. One `ls` answers it.

## 4. Move and rename

`mv` takes the same two arguments as `cp`: what, and where to. The difference is that the original does not stay behind.

Renaming is moving a file to a new name in the same folder:

```sh
mv inbox/notes-copy.txt inbox/price-list-copy.txt
```

Moving to an existing folder keeps the name and changes the place:

```sh
mv inbox/orders-week-2.csv archive/2026-12
```

Both commands print nothing. Look at the result:

```sh
ls inbox
ls archive/2026-12
```

`inbox` now holds `draft.tmp`, `notes.txt`, `old.tmp`, `orders-week-1.csv` and `price-list-copy.txt`. `archive/2026-12` holds both weeks' orders. Week 2 is no longer in `inbox`, and week 1 is in both places, because you copied one and moved the other.

There is no separate rename command. A rename and a move are the same act: changing the path at which a file is found.

### The same trap, and a difference between shells

What does `mv` do when the destination name already exists? The author tried it in a fresh sandbox, with `mv inbox/old.tmp inbox/draft.tmp`. You do not need to run this one.

```text
Windows PowerShell (the author's run):
mv : Cannot create a file when that file already exists.

bash and zsh (the author's run):
(nothing printed)
```

PowerShell refused, and both files were still there afterwards. bash and zsh obeyed without a word: afterwards there was one file, named `draft.tmp`, holding what `old.tmp` used to hold. The earlier `draft.tmp` was destroyed.

The lesson to draw is not "PowerShell is safer". Its `cp` overwrote silently a minute ago. The lesson is that **you cannot rely on being asked**. Sometimes a tool refuses, sometimes it warns, often it does neither, and which one you get depends on the shell and the command. The reliable protection is to look first.

### A good place to pause

You can now build and rearrange. Check your sandbox against the two listings above before going on. If it differs and you cannot see why, go to the kit folder, run `node reset-sandbox.mjs`, and repeat Sections 3 and 4. That is what the sandbox is for.

## 5. Delete

`rm` takes the path of what to delete:

```sh
rm inbox/price-list-copy.txt
ls inbox
```

Nothing is printed by `rm`. The listing shows four files: `draft.tmp`, `notes.txt`, `old.tmp` and `orders-week-1.csv`.

Now the fourth property of the crew. When you delete a file in File Explorer or Finder, it goes to the Recycle Bin or the Trash, and you can take it out again. **A file deleted with `rm` in a terminal does not go there.** It is not in the Recycle Bin. It is not in the Trash. On an ordinary computer there is no command that brings it back. This is true in PowerShell, in bash and in zsh.

Run the same delete a second time, to see what a failed delete looks like:

```sh
rm inbox/price-list-copy.txt
```

```text
bash or zsh (the author's run):
rm: cannot remove 'inbox/price-list-copy.txt': No such file or directory

Windows PowerShell (the author's run, with the path shortened):
rm : Cannot find path 'C:\Users\maria\...\sandbox\inbox\price-list-copy.txt' because it does not exist.
```

The program says it cannot remove something that is not there. That is harmless, and it shows that `rm`, like every program, works on the one place a path leads to.

### Three checks before anything that destroys

Here are the crew's three checks, as commands. Use them before every `rm`, before a `cp` or `mv` whose destination might exist, and before any command you have been told deletes or overwrites.

1. **Where am I?** Run `pwd`, or read the prompt. A relative path means something only together with the current folder.
2. **What exactly will this touch?** Run `ls` with **the same words** you are about to give to `rm`. The listing is the walk through the garage.
3. **Is there anything in that listing I did not expect?** If so, stop. Do not run the delete until you can explain the surprise.

The third check is a **stop condition**: a result, decided in advance, at which you stop instead of carrying on. It matters because the moment after typing a command is the moment you are least inclined to stop.

### Predict, then list before you delete

Files ending in `.tmp` are meant to be temporary, and you want to remove the ones in `inbox`. You are standing in `sandbox`. In *What a program receives* you learned that `*.tmp` means "every name ending in `.tmp`".

Here are two listings. Before you run them, predict what each will show.

```sh
ls *.tmp
ls inbox/*.tmp
```

Write down: how many files will the first show, and how many the second? Why?

Now run both.

### What the listing showed

The author's runs:

```text
ls *.tmp

Windows PowerShell:   (nothing printed)
bash:                 ls: cannot access '*.tmp': No such file or directory
zsh:                  zsh: no matches found: *.tmp
```

```text
ls inbox/*.tmp

bash or zsh:
inbox/draft.tmp
inbox/old.tmp

Windows PowerShell: the same two names, draft.tmp and old.tmp, in its table
```

The first pattern has no folder in front, so it describes names in the current folder, `sandbox`. No name there ends in `.tmp`: `sandbox` holds three folders and no files. Each shell reports "nothing matched" in its own way, as you saw in the last lesson. The pattern does not search inside `inbox` or `keep`. A wildcard describes names in one folder, the folder its path leads to.

The second pattern leads into `inbox` and matches two files. That listing is exactly what the delete will remove. It contains no surprise, so run the delete with the same words:

```sh
rm inbox/*.tmp
ls inbox
```

`inbox` now holds `notes.txt` and `orders-week-1.csv`.

### The wrong folder

Now the case this lesson exists for. Go into the `keep` folder:

```sh
cd keep
```

Suppose a colleague sends you a message: *"The inbox is full of junk again. Just run `rm *.tmp`."* Their instruction is correct, in the folder they were picturing. You happen to be standing in `keep`.

Do the three checks. `pwd` ends in `keep`, which is already a warning: the message was about `inbox`. Then list with the same words:

```sh
ls *.tmp
```

It shows one file: `scratch.tmp`. Is that expected? You were told about junk in `inbox`, and this is a file in `keep`. Read it:

```sh
cat scratch.tmp
```

```text
This file ends in .tmp too, and somebody still needs it.
```

That is the neighbour's bicycle. Stop: do not run `rm *.tmp` here. The command was right, the folder was wrong, and the listing took five seconds to show it. Had you run the delete, it would have printed nothing, exactly as it does when it is right.

Go back up:

```sh
cd ..
```

Look at what the colleague's message left out. It did not say which folder to stand in. A delete instruction without a folder is half an instruction, like a relative path without a current folder. When you write one for somebody else, give the folder. When you receive one, ask, or look.

## 6. Deleting a folder

Try to delete the December folder, which has two files in it:

```sh
rm archive/2026-12
```

Here the shells differ most, so read the part for yours.

**bash and zsh** refuse (the author's run):

```text
rm: cannot remove 'archive/2026-12': Is a directory
```

`rm` alone deletes files, not folders.

**PowerShell** stops and asks a question. It tells you that the item has children and that the Recurse parameter was not specified, asks whether you are sure you want to continue, and offers a row of choices that begins `[Y] Yes  [A] Yes to All  [N] No`. **Type `N` and press Enter.** Read the prompt carefully before you ever press Enter alone: it marks one choice as the default, and the default is Yes. [PowerShell: Remove-Item](https://learn.microsoft.com/powershell/module/microsoft.powershell.management/remove-item)

If you answered Yes by mistake, the folder and both files are gone, and the first listing below will say that the path does not exist. Nothing else is harmed. Read on, and rebuild the sandbox in Section 7.

To delete a folder **together with everything inside it**, at every depth, add the option `-r`. It stands for *recursive*: do the same to each folder inside, and each folder inside those. This spelling works in PowerShell, bash and zsh:

```sh
ls archive/2026-12
rm -r archive/2026-12
ls archive
```

The first listing shows the two order files: that is the second check. Then the delete, which prints nothing and asks nothing. Then the last listing, which also prints nothing, because `archive` is empty again.

`rm -r` is the strongest command in this lesson. One line removes a folder and everything under it, however much that is, immediately and for good. The three checks apply with full force, and the listing is of the folder you are about to remove.

### How to read `rm -rf`

Sooner or later you will see `rm -rf` in instructions, search results or an assistant's answer. Read it with *What a program receives*: `-rf` is two short options written together, `-r` and `-f`. You know `-r`. The `f` stands for *force*: do not ask about anything, and do not report files that are missing. It turns the crew's "they do not ask" into "they do not even mention problems".

Three things to know about it.

- It is a bash and zsh spelling. Windows PowerShell rejects it, in the author's run with `Remove-Item : A parameter cannot be found that matches parameter name 'rf'`. PowerShell's own spelling for the same thing is `rm -r -fo`, short for `-Recurse -Force`.
- `-f` is rarely needed for your own files. Its usual effect in practice is to remove the last moment at which something would have complained.
- What comes **after** it is what matters. `rm -rf` followed by a folder you have just listed is an ordinary clean-up. `rm -rf` followed by a wildcard, a variable, `~`, `/`, or a path you have not looked at is the note that empties the wrong garage. Before running one from another person, ask the three questions from *Set up a safe workspace*, source, action and permission, and then make the three checks.

## 7. Reset, and prove it

Go back to the kit folder and rebuild the sandbox:

```sh
cd ..
node reset-sandbox.mjs
ls sandbox/inbox
```

The listing shows the five files you started with: `draft.tmp`, `notes.txt`, `old.tmp`, `orders-week-1.csv` and `orders-week-2.csv`.

That last `ls` is not decoration. Running a reset and *believing* it worked is an inference. Listing the result and comparing it with the known starting state is an observation. "Reset, then verify" is a habit you will use with databases, test environments and servers, where a reset that quietly did nothing can waste a day.

One caution about where you stand when you reset. Run `reset-sandbox.mjs` from the kit folder, not from inside `sandbox`. A reset deletes the old `sandbox`, and a terminal standing inside a folder that is deleted is left in a place that no longer exists. The program checks for that before it touches anything. Try it: `cd sandbox`, then run the program from there by its relative path.

```sh
cd sandbox
node ../reset-sandbox.mjs
```

```text
reset-sandbox: this terminal is standing inside /home/maria/course-work/terminal-practice-kit/sandbox, the folder a reset deletes. Nothing was changed. Go to the kit folder first, then run: node reset-sandbox.mjs
```

That is the author's run on Linux, and the exit code was 2. The program applied the first of your three checks, "where am I?", to itself, and stopped. Go back with `cd ..`.

## 8. Try it with less help

Complete explanations follow these four practices. Say your answer in your own words before you read them. Start each practical one from a fresh sandbox: from the kit folder, `node reset-sandbox.mjs`, then `cd sandbox`.

### Practice A: predict the end state

Starting from a fresh sandbox, a learner runs these six commands in order, from the `sandbox` folder. Without running them, write down the contents of `inbox`, `keep` and `archive` afterwards. Then say which single command destroyed content that existed nowhere else.

```sh
mkdir archive/week-1
cp inbox/orders-week-1.csv archive/week-1
mv inbox/orders-week-1.csv archive/week-1
mv inbox/notes.txt keep
cp keep/price-list.txt keep/notes.txt
rm inbox/*.tmp
```

Then run them and check your prediction with `ls`.

### Practice B: judge three delete instructions

For each instruction, say what you would check or ask before running it, and whether you would run it.

1. A lesson says: "From the `sandbox` folder, run `rm inbox/draft.tmp`."
2. A colleague writes: "To free up space, run `rm -r old`." You do not know which folder they mean.
3. A forum answer to a question about a slow computer says: "Open a terminal and paste `rm -rf ~/*` to clear your temporary files."

### Practice C: tidy the inbox by a rule

Starting from a fresh sandbox, bring it into this state, using only the terminal:

- `archive` contains a folder `2026-12` holding both order files.
- `inbox` contains only `notes.txt`.
- `keep` is untouched.

Before each command that deletes, run the listing that shows what it will remove. Write down every command you used, in order. When you are done, verify the three points with `ls`, and then reset.

### Practice D: explain the near miss

Look back at the wrong-folder case in Section 5 and answer in your own words:

1. The command `rm *.tmp` was the same in the colleague's head and in your terminal. What was different?
2. Which of the three checks first showed that something was off, and which one showed exactly what would have been lost?
3. Had you run the delete, what would the terminal have shown?
4. Rewrite the colleague's message so that it could not be misapplied.

### Practice explanations

**A.**

- `archive` holds one folder, `week-1`, containing `orders-week-1.csv`.
- `inbox` holds `orders-week-2.csv` only.
- `keep` holds `notes.txt`, `price-list.txt` and `scratch.tmp`.

Step by step: the second command copies week 1 into `archive/week-1`. The third moves the original to the same place, where a file of that name now exists. In bash and zsh the move silently replaces the copy with the identical original. In Windows PowerShell the move is refused with `Cannot create a file when that file already exists`, and `orders-week-1.csv` stays in `inbox` as well, so on PowerShell your `inbox` holds both order files. The fourth command moves `notes.txt` into `keep`. The fifth copies the price list onto the name `notes.txt` in `keep`. The sixth deletes `draft.tmp` and `old.tmp`.

The command that destroyed unique content is the fifth, `cp keep/price-list.txt keep/notes.txt`. After the fourth command, the note about week 2 existed only as `keep/notes.txt`, and the copy replaced it without a word. If you named the `rm`, that is the natural guess, and here it removed two files that were meant to go. The quiet `cp` did the damage. A command does not need to be called "remove" to destroy something.

**B.**

1. Run it, after the three checks. The source is the lesson, the folder is stated, and the path names one file. `pwd` should end in `sandbox`, and `ls inbox/draft.tmp` should show that one file.
2. Do not run it yet. Two things are missing: the folder to stand in, and what is inside `old`. Ask which folder they mean. Then go there, run `ls old`, and read what it holds. `rm -r` removes everything under it, so the listing must be of the folder's contents and not only its name. If anything in there is unexpected, stop and ask again.
3. Refuse it. Read it with what you know: `-rf` means every folder at every depth, with no questions and no complaints. `~/*` means every name in your home folder, which the shell fills in before `rm` starts. The command deletes your documents, your pictures and your course work. It has nothing to do with temporary files. Apply the three questions: the source is a stranger, the action is not what the text claims, and the reach is everything you own on that computer. This one is a real and old trick played on beginners.

**C.** One set of commands that works, from the `sandbox` folder:

```sh
mkdir archive/2026-12
mv inbox/orders-week-1.csv archive/2026-12
mv inbox/orders-week-2.csv archive/2026-12
ls inbox/*.tmp
rm inbox/*.tmp
ls inbox
ls archive/2026-12
ls keep
```

The listing before the delete shows `draft.tmp` and `old.tmp`, both expected. The three listings at the end are the verification: `notes.txt` alone, both order files, and `keep` with its two files as before. Other orders of commands are fine, and so is copying and then deleting the originals, though moving does it in one step. If you used `mv inbox/*.csv archive/2026-12`, check it with `ls inbox/*.csv` first: a wildcard in a move deserves the same listing as a wildcard in a delete.

**D.**

1. The current folder. `*.tmp` is a relative pattern, and it describes names in whichever folder the terminal is standing in. The colleague pictured `inbox`. Your terminal was in `keep`.
2. The first check, `pwd`, showed the terminal was in `keep` when the message spoke of the inbox. The second check, `ls *.tmp`, showed the exact file that would have gone: `scratch.tmp`.
3. Nothing. The prompt would have returned in silence, exactly as it does after a correct delete. The terminal gives no sign that tells a right deletion from a wrong one, which is why the checks have to come before.
4. For example: "From the `sandbox` folder, run `ls inbox/*.tmp`. If it lists only temporary files you recognise, run `rm inbox/*.tmp`." It names the folder to stand in, puts the folder in the pattern, and puts the listing before the delete.

## 9. What you should be able to explain now

Close the lesson for a moment and explain to an imaginary friend who is about to paste a delete command from a web page:

- What do `mkdir`, `cp`, `mv`, `rm` and `cat` do?
- A command printed nothing. What does that usually mean, and how do you make sure?
- What happens when you copy a file onto a name that already exists?
- Where does a file go when you delete it with `rm`?
- What are the three checks, and why must the listing use the same words as the delete?
- What is a stop condition?
- What does `-r` add to `rm`, and what does the `f` in `-rf` add?
- Why is a delete instruction without a folder only half an instruction?
- How do you know a reset worked?

You are ready for the next lesson when you can answer these in your own words, when you have seen `scratch.tmp` appear in a listing and stopped, and when you can bring the sandbox back and show that it is back.

These habits protect you from one kind of loss. They do not bring back yesterday's version of a file you changed by mistake. That needs a record of every version, and it is the subject of the Git module.

So far you have read what programs print without asking where the printing goes. The next lesson looks at that: a program has more than one way of speaking, and one of them is not meant for you at all.

## If something does not match

**`node reset-sandbox.mjs` says it cannot find the module.** The terminal is not in the kit folder. Read the path in the message, as in the lesson *Where the terminal is standing*, and `cd` to the kit folder.

**PowerShell asks "Are you sure you want to continue?" and you did not expect it.** You ran `rm` on a folder that has something in it. Type `N` and press Enter, then list the folder to see what is there.

**A listing shows files this lesson does not mention, or misses some.** An earlier command did something different from what you intended. That is fine here. From the kit folder, run `node reset-sandbox.mjs` and start the section again.

**`ls` shows nothing, or says the folder does not exist, and you know the files are there.** The folder this terminal is standing in was deleted and built again, perhaps from a second terminal. A new folder with the same name is not the folder the terminal was in. `cd` to the kit folder by its full path and go in again.

**`reset-sandbox.mjs` says it could not delete the old sandbox.** Something is still using the folder: another terminal standing inside it, or one of its files open in another program. Close that, and run the reset again.

**You deleted something outside the sandbox.** Stop typing commands. Write down the exact command and the folder you were in. If the file came from a kit, extract the ZIP again. If it was your own work, check whether your editor still has the file open in a tab, because an open tab still holds the text and can be saved again.
