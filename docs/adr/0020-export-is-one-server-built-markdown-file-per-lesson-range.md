# 0020. Export is one server-built Markdown file per course and lesson range

Date: 2026-11-19
Status: Accepted

## Context

The owner sends their work to the content author beside a Markdown review form that covers a lesson
range (after Lesson 5, 8, 13, 15). The author reads it in a chat, so it must be plain text that
survives pasting. Answers carry an append-only history (ADR 0012) stamped with the version they
answered (ADR 0011), and since ADR 0019 the store also holds Claude's feedback conversations, which
are generated assistance rather than the owner's work. Spec: `docs/specs/export.md`.

## Decision

The server builds one Markdown file per course and chosen lesson range, read from the store inside
one transaction. Each field shows its current text and then its earlier revisions with their
versions. Everything the owner or Claude wrote sits in a fenced block longer than any backtick run
inside it. Current feedback conversations go only when the owner ticks a box for that export, under
a label saying they are AI feedback; conversations hidden by Start over never go.

## Alternatives considered

- **Build the file in the browser from the page's state.** Lost because the dashboard does not hold
  the answers, and the store is the only place the history and the acknowledged text both live.
- **JSON beside the Markdown (REQ-49).** Lost because the only reader is a person in a chat; JSON is
  the hosted product's data-rights format and has no reader here yet.
- **Always include conversations, or never.** Lost because the owner wants to choose per review:
  some reviews are about the lesson wording, where Claude's replies are noise.
- **Render answers as Markdown rather than fencing them.** Lost because an answer containing a
  heading or a list would restructure the file and misattribute text to the wrong field.

## Consequences

Easier: one file per review form, readable as sent, that cannot be corrupted by what the owner
typed. Harder: fenced answers lose Markdown formatting in a viewer, and a lesson shared between
courses appears in both courses' exports. Revisit when a second reader (an import, a grader, a
hosted data-rights request) needs a machine format.
