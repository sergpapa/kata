# 0013. Lessons are authored in this repo, and still ship as release packages

Date: 2026-11-03
Status: Accepted

## Context

`docs/brief.md` names the content author as an external actor. That author was a ChatGPT project
which produced every package under `content/releases/`. It stopped working in November 2026, with
Lessons 16–20 planned but not written. All of its standards survive as files: the lesson authoring
standard, the depth map, the curriculum architecture, and fifteen finished lessons with five lab
kits. The owner's feedback to it survives in a salvaged transcript. The owner wants lessons to keep
coming at the same standard. Moving authoring into this repo removes the one separation the old
loop had: the author was not the party that imported, rendered and checked the content.

## Decision

Lessons are now written in this repository, by Claude sessions, under the rules in
`docs/authoring/README.md`.

- **The package boundary stays.** New and corrected lessons ship as cumulative release packages
  under `content/releases/`, in the format the external author used and the importer already
  verifies. App code never edits lesson content (ADRs 0005, 0006 and 0009 are unchanged).
- **Writing and reviewing happen in separate sessions.** The reviewer sees only the standard, the
  depth-map row, the previous lesson and the draft. This partly restores the lost separation.
- **The owner's review decides acceptance.** No technical check stands in for it.
- **Model.** Claude Opus 5.5 at high effort writes and reviews. Claude Fable 5.1 replaces it if the
  owner judges an Opus-written lesson below the standard of Lessons 1–4. Opus was chosen first
  because it is capable enough to try and costs less than half as much per token. The owner's
  verdict, not a prediction, decides whether to escalate.
- **Every release lists which lesson and kit hashes changed.**

## Alternatives considered

- **Find or rebuild another external author.** Lost because the standards that made the old
  author's output good are files we already hold. Another external tool would add a relay step
  (owner carries zips between two AIs) without adding a check this repo cannot run.
- **Edit lessons directly in the app's content tree, without packages.** Lost because hashed,
  append-only release imports are what keep the owner's saved answers tied to the exact lesson
  version they answered (ADRs 0006 and 0011). Dropping packages would break that.
- **Start on Fable 5.1.** Not chosen because there is no evidence yet that Opus 5.5 falls short,
  and Fable costs 2.5 times as much per token. This decision is reversible per lesson.

## Consequences

Easier: Mermaid parse and render checks, browser rehearsals and native Windows runs, which the old
author recorded as unavailable, can now run before a release ships. Corrections no longer wait on
a relay. Harder: author and checker share an organisation, so the separate-session review and the
owner's review carry more weight than before, and a reissue's bookkeeping (hashes, nested lesson
copies, kit archives) is ours to get right. A packaging tool is planned for that. Revisit if the
owner rejects lessons from both models, or if another author is brought in.
