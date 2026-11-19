# 0017. AI review runs in the learner's own Claude Code over MCP

Date: 2026-11-03
Status: Accepted. Amended by ADR 0019 for practice-activity feedback, which now runs in the app.

## Context

The owner chose AI review for the automation course's reasoning work: strategy documents, decision
notes and test-code readability. If the app called the Claude API itself, every review would be a
metered charge on whoever's key was configured. The brief forbids fabricated feedback, and lists
MCP integrations as out of scope for the current checkpoint.

## Decision

- The app exposes a local **MCP server** (Model Context Protocol, the standard way Claude Code
  connects to outside tools). The course ships a **Claude Code plugin** containing the versioned
  review rubric.
- The learner connects them once (`claude mcp add`). After that, a request such as "review my
  Lesson 20 work" makes Claude Code fetch the review packet from the app, review it against the
  rubric, and post the review back.
- The same session can run the grading kit (ADR 0016), so everything that executes code runs on
  the learner's machine under their own tools.
- The app stores each review **labelled as an AI review**, with the rubric version and model
  identity. It never presents one as an assessment, a grade or a competency claim.
- **Fallback without Claude Code:** the app exports the review packet, the learner pastes it into
  claude.ai, and pastes the answer back. The app stores it with the same label.

## Alternatives considered

- **The app calls the Claude API.** Lost because it bills the owner per review, on every review.
- **Human rubric review now.** Deferred, not rejected. The review packet format follows the
  full-stack course's review contract, so a human reviewer can use the same packets later.

## Consequences

Easier: the review costs the owner nothing, and the rubric ships and versions with the course.
Harder: the learner needs a Claude plan that includes Claude Code, or must use the manual fallback.
The learner controls the reviewer and could ask it to be lenient, so reviews are feedback, never
evidence. Building this is a later app milestone. Revisit if human review is introduced, or if the
course is ever used for certification.
