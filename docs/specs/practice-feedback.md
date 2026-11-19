# Practice feedback from Claude

**Status:** criteria approved 2026-11-19. Sources: the owner's request of 2026-11-03 ("type answers
to questions and exercises and get immediate feedback from you, displayed in the app … handle a
conversation as well as clear and restart … not required fields to progress"); the six decisions
below; ADR 0019, which amends ADR 0017; `docs/brief.md`, whose non-goal "model-generated review or
tutoring" this slice lifts for practice activities only.

## Facts established before the criteria were written

Measured against `content/releases/http-first-fifteen-v1_0_1/`, `content/releases/qaae-lesson-01-v1/`
and Claude Code 2.1.293 on the owner's machine, commit `3b51ab9`:

- **48 activities** across the two courses. 43 name a `feedback_source_heading`, and every one of
  those resolves to **exactly one** heading in its own lesson, outside code fences. The longest
  section is 3,451 characters. 5 activities name none (`ACT-M020-03-01`, `-04-01`, `-04-02`,
  `-05-01`, `-05-02`).
- `feedback_source_heading` is in the release's `trial-activities.json`, but `parseActivitySet`
  does not read it yet.
- A worked-answer section can cover several practices (Lesson 5's "Practice explanations" answers
  A, B and C together).
- Box text lives in each `ResponseField`'s own state. `ActivityPanel` cannot read it today.
- The real executable is `node_modules/@anthropic-ai/claude-code/bin/claude.exe`, behind
  `claude.cmd` shims in `%APPDATA%\npm` and `anaconda3`. A `.exe` can be started without a shell.
- Stream format, from four recorded runs (trimmed copies become the test fixtures):
  - `system/init` is not always the first line (safe mode puts `system/ui_invalidate` before it).
    It carries `session_id`, `model`, `tools`, `mcp_servers` and `apiKeySource`.
  - Text arrives as `stream_event` lines whose `event.delta.type` is `text_delta`.
  - `rate_limit_event.rate_limit_info` has `status`, `isUsingOverage`, `overageStatus` and
    `unifiedWindows.{five_hour,seven_day}.{utilization,resetsAt,status}`, with `resetsAt` in Unix
    seconds. It arrives after the reply has started.
  - The last line is `result` with `subtype`, `is_error` and `result` (the whole reply text).
  - A missing `--resume` session gives one `result` line with `subtype:"error_during_execution"`,
    `is_error:true`, exit code 1, and stderr `No conversation found with session ID: <id>`.
- `--safe-mode` keeps `apiKeySource:"none"` and drops `memory_paths`. Without it, the run loads the
  owner's global CLAUDE.md, plugins and auto-memory.

## Decisions (asked 2026-11-03 and 2026-11-19)

1. **Claude gets the boxes as typed**, saved or not. The conversation stores exactly what was sent.
2. **Conversations are kept.** Start over hides the current one; it stays in the store, unedited.
3. **Replies stream** as Claude writes them.
4. **Claude coaches first.** It says what is right and what is missing and nudges toward the gap.
   It reveals the author's worked answer only when the learner asks.
5. **Stop before extra usage.** Refuse new turns while the last reply showed any window at 90% or
   more, a status other than `allowed`, or extra usage in use, until that window resets.
6. **The learner picks the model**, remembered per browser: Sonnet (default), Opus or Haiku.

## Acceptance criteria

### Asking

- **PF1.** Each activity panel has a "Feedback from Claude" area below its boxes. With text in at
  least one box, **Get feedback** sends every declared box's current text, saved or not. With
  every box empty or whitespace, the button is disabled, and the server refuses such a request
  with 400 `feedback_empty`.
- **PF2.** The first message to Claude carries the activity's title, its `prompt_markdown`, the
  author's worked-answer section, and each declared field in declared order: label, then text, or
  `(left empty)`. The worked-answer section runs from the heading named by
  `feedback_source_heading` in the activity's own lesson to the next heading of the same or a
  higher level, ignoring headings inside code fences.
- **PF3.** When an activity names no worked-answer heading, or it matches no heading or more than
  one, the message tells Claude there is no authored answer. The panel then says: "This activity has
  no worked answer from the author, so Claude's feedback is its own reading."
- **PF4.** The system prompt tells Claude to: coach first; not reveal or paraphrase the worked answer
  unless asked; give no grade, score or pass/fail; stay inside the lesson's material; use plain
  language; keep replies short.

### The conversation

- **PF5.** Claude's reply appears on the page as it is written. The stored reply is the `result`
  text of the finished run.
- **PF6.** After a reply, a message box and **Send** continue the same conversation (`--resume`
  with the conversation's session id). An empty message cannot be sent; the server answers 400
  `feedback_empty`.
- **PF7.** **Start over** hides the current conversation, and the next **Get feedback** begins a new
  one with a new session id. Nothing is deleted or edited. The store refuses (by trigger) any update
  or delete of a turn, and any update to a conversation other than setting its cleared time once.
- **PF8.** The current conversation of each activity rides on the lesson answer and survives a
  refresh and an app restart. It shows the learner's turns, Claude's turns, and, collapsed under
  the first turn, the exact box texts that were sent.
- **PF9.** Every turn is stored append-only with the activity id, the lesson id, content version
  and release id it answered (read server-side, as for saves, ADR 0011), and when it was written.
  Each Claude turn also stores the model id that answered (from the stream, e.g.
  `claude-sonnet-5-5`), and its outcome (`complete` or `failed` with the reason).

### Labels and limits

- **PF10.** Each Claude turn is labelled "AI feedback · <model id>". The area says once: "Claude can
  be wrong. This is feedback on your reasoning, not a grade." No surface of this feature uses the
  words grade, score, mark, passed or failed about the learner's work.
- **PF11.** Feedback is optional. No navigation, progress, resume point or dashboard state reads it.
- **PF12.** Claude's reply renders through the lesson Markdown renderer (sanitised, code inert,
  no raw HTML).
- **PF13.** A model picker offers Sonnet (default), Opus and Haiku, stored in the browser. Storage
  that fails falls back to Sonnet. The server accepts only `sonnet`, `opus` and `haiku` and answers
  anything else with 400 `feedback_model_invalid`. Text over 100,000 characters in one field or one
  message is refused with 400 `feedback_too_long`.

### Concurrency and failure

- **PF14.** One run per activity at a time. A second request while one runs gets 409
  `feedback_in_progress`. A follow-up or Start over that names a conversation id or turn count
  that is no longer current gets 409 `feedback_conversation_changed` with the current conversation,
  and the page redraws from it. **Get feedback** while a current conversation exists gets the same 409.
- **PF15.** Leaving the page does not stop a run. The reply is stored when it finishes. A page
  opened while a run is going shows "Claude is still replying…" and asks again every 3 seconds until
  the run ends.
- **PF16.** A failed run keeps the learner's turn, stores a failed Claude turn, and shows its reason
  in plain words. The box texts are never touched. Reasons, each tested:
  - Claude Code not found: "Claude Code was not found on this computer. Install it, or set
    EDUCODE_CLAUDE_PATH to its claude.exe." (The area shows this instead of the button at load.)
  - Session missing on a follow-up: "Claude Code no longer has this conversation. Start over to
    begin a new one."
  - No reply within 180 seconds: the process is killed; "Claude did not finish within 3 minutes."
  - Any other non-zero exit or `is_error` result: "Claude Code stopped with an error:" followed by
    the first line of stderr, or of the `result` text, verbatim.
  - A request the server refuses shows the refusal's own `message`. A request the app does not
    answer at all shows "The local app did not answer:" and the reason. Either way the button can
    be pressed again.
- **PF17.** When the first reply of a conversation failed, the area offers **Try again**, which
  starts the conversation over with the same box texts that were sent the first time.

### Billing guards (ADR 0019)

- **PF18.** The child's arguments never contain `--bare`, and always contain `--safe-mode`,
  `--tools ""` and `--strict-mcp-config`. Its environment lacks `ANTHROPIC_API_KEY`,
  `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_USE_BEDROCK` and
  `CLAUDE_CODE_USE_VERTEX`, even when the server's own environment has them. It starts without a
  shell, in an empty directory under the data directory, with the prompt on stdin.
- **PF19.** If the init event reports an `apiKeySource` other than `none`, or any tool or MCP
  server, the process is killed before any reply text is used. The turn fails with: "Claude Code
  here is set up to bill an API key or to use tools, so the app stopped it before it replied."
- **PF20.** Each run's `rate_limit_event` is stored, and survives a restart. While the newest one
  shows a window at 0.9 utilisation or more, a window or overall status other than `allowed`, or
  `isUsingOverage: true`, new turns are refused with 409 `feedback_usage_paused` naming the reset
  time. The area says so in place of the button. The refusal lifts on its own once that reset time
  has passed. A run whose `rate_limit_event` shows `isUsingOverage: true` is killed at once.
- **PF21.** The feedback routes answer 403 `feedback_origin_refused` to a request whose `Host` is
  not `127.0.0.1`, `localhost` or `[::1]` (any port), or whose `Origin`, when present, is not
  `http://` on one of those names. A POST whose body is not JSON gets 415 `feedback_not_json`.

## Assumptions (defaults, not asked)

- Conversations are keyed by activity alone, like answers (ADR 0018). A lesson shared between
  courses shares one conversation.
- An unsent follow-up message is not covered by the leave-the-page guard. It is a chat line, not
  work.
- There is no cancel button for a running reply. The 3-minute limit bounds it.
- The reply streams to the page as server-sent events over a `fetch` POST. `EventSource` cannot
  send a body.

## Out of scope

Export of conversations (the Export slice decides). ADR 0017's MCP review of the automation course's
reasoning work. Any tool for Claude. Showing or restoring a hidden conversation. A usage meter
beyond the guard's message. Editing or deleting any turn.

## Done means

On Lesson 5, Practice C, the owner types into two boxes without saving and presses **Get
feedback**. Text starts appearing under the activity within seconds, labelled AI feedback with
the Sonnet model id. They ask a follow-up and get an answer that knows the first exchange. A
refresh shows both exchanges. **Start over** clears the area, and **Get feedback** starts afresh.
