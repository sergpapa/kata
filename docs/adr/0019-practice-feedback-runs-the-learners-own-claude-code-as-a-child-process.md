# 0019. Practice feedback runs the learner's own Claude Code as a child process

Date: 2026-11-19
Status: Accepted. Amends ADR 0017 for practice-activity feedback; 0017's MCP route for the
automation course's reasoning reviews is unchanged and still unbuilt.

## Context

The owner wants to type answers into an activity's boxes and get feedback from Claude at once,
shown in the app, as a conversation they can continue and start over. ADR 0017 put AI review in
the learner's terminal over MCP, which keeps the reply out of the page. The brief listed
"model-generated review or tutoring" as out of scope for the checkpoint.

Measured on the owner's machine on 2026-11-19 with Claude Code 2.1.293:

- Claude Code is signed in through claude.ai on a **Team** plan, and no `ANTHROPIC_API_KEY` is set.
  A headless run reports `"apiKeySource":"none"` in its `system/init` event, before any request.
- The org has **paid extra usage switched on** (`"overageStatus":"allowed"`). Past the plan's
  limits, further runs would be billed to the org.
- `--bare` would make Claude Code accept only an API key. `--safe-mode` keeps the claude.ai
  sign-in and drops CLAUDE.md, auto-memory, hooks and output styles.
- `--tools ""` and `--strict-mcp-config` give a run no tools and no MCP servers (`"tools":[]`,
  `"mcp_servers":[]` in the init event).
- `--resume <session id>` continues a conversation; a missing session fails with
  `"No conversation found with session ID: <id>"` on stderr and exit code 1.
- The `rate_limit_event` arrives after the reply has started, never before the request.

## Decision

- The app's local server starts the learner's own `claude` executable, one process per turn, with
  `-p --safe-mode --output-format stream-json --verbose --include-partial-messages --tools ""
--strict-mcp-config --system-prompt-file <file> --model <alias>`, plus `--resume <id>` for a
  follow-up. The prompt goes in on stdin. The working directory is an empty folder under the data
  directory. The executable is started directly, never through a shell.
- **It never passes `--bare`**, and it removes `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`,
  `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_USE_BEDROCK` and `CLAUDE_CODE_USE_VERTEX` from the child's
  environment. If the init event reports any `apiKeySource` other than `none`, or any tool or MCP
  server, the process is killed before a reply is read.
- **Usage guard.** The last `rate_limit_event` is stored. While any window reported 90% or more,
  a status other than `allowed`, or extra usage in use, new turns are refused until that window's
  reset time. A run that reports extra usage in use is killed at once.
- Replies stream to the page as server-sent events and are stored append-only, labelled AI
  feedback with the model that answered. They are never a grade.
- The learner picks the model per browser from the aliases `sonnet` (default), `opus` and `haiku`.
  The server accepts only those three.
- The feedback routes refuse any request whose `Host` is not a loopback name or whose `Origin`,
  when present, is not a loopback origin. A web page the learner visits must not be able to spend
  their plan.

## Alternatives considered

- **ADR 0017's MCP route.** The reply would land in the terminal, not under the activity, and the
  owner asked for it in the app.
- **The app calls the Claude API.** Lost for the same reason as in 0017: a metered charge on every
  reply.
- **Claude Agent SDK in the server.** It authenticates with an API key, which is the billing this
  decision exists to avoid.

## Consequences

Easier: feedback appears where the work is, costs nothing beyond the learner's plan, and needs no
setup when Claude Code is already installed and signed in.

Harder: the app now depends on a CLI's undocumented stream format, pinned by recorded fixtures and
checked again in each slice's real-app verification. The usage guard works from the last reply's
numbers, so at most one reply can start inside extra usage before the guard stops the next. The
learner controls the reviewer, so feedback is never evidence. Revisit if the stream format changes,
if the app ever serves more than one person, or if feedback should count toward assessment.
