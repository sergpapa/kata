# Accepted content corrections: release 1.0.1-draft

This reissues **FSSE-HTTP-FIRST-FIFTEEN** with two accepted review entries. Use the whole current release directory. Superseded first-five, first-eight, first-thirteen, and first-fifteen 1.0.0-draft packages remain historical snapshots; their hashes have not been rewritten.

## Corrections

| Entry | Lesson | Change | Version |
| --- | --- | --- | --- |
| CF-001 | LS-M020-02 | `Stopped; the file remains` → `Stopped, the file remains` in the Mermaid message | 1.0.1-draft |
| CF-002 | LS-M020-07 | `return in LS-M020-06` → `return in Lesson 6` in the prerequisite prose | 1.0.1-draft |

Both lesson versions advance from 1.0.0-draft to 1.0.1-draft, with dates updated to 2026-09-21. The Markdown filenames remain stable; use metadata for the exact version. Stable IDs, course order, titles, activity prompts, and assessment meaning are unchanged.

The containing Lesson 2 and Lessons 6–8 lab kit manifests also advance to 1.0.1-draft. Their nested lesson copies match the canonical Markdown exactly. Internal file hashes, any recorded byte counts, ZIP hashes, the release manifest, activity-version references, and the package manifest are synchronized. Lab code and data remain unchanged.

## Import and learner state

1. Read `content-corrections.json` for the approved previous/current versions and hashes.
2. Validate all new files against `content/learning-release.json`. Do not place a corrected Markdown file beside a superseded manifest.
3. Recognize matching previous hashes as the authorized update. Preserve a local edit that matches neither previous nor current hashes and report it for reconciliation.
4. Keep all existing lesson/activity identities and learner work. Six current activity definitions advance their referenced lesson version, but historical attempts retain the version and source provenance they originally recorded.
5. Do not require learners to repeat these lessons merely because of these corrections. They change diagram syntax and prerequisite wording, not the assessed concepts.
6. Parse the exact five current lesson Mermaid blocks with the application's pinned version and render Lesson 2. Record the renderer version and actual result.

## Future authoring

The authoring standard now requires parser and visual checks separately. Raw semicolons in sequence-message prose should be replaced with suitable punctuation, or escaped as `#59;` when the literal semicolon matters. This is specific syntax guidance, not a ban on semicolons in code examples. [Official Mermaid guidance](https://mermaid.js.org/syntax/sequenceDiagram.html#entity-codes-to-escape-characters)

Render fallbacks remain useful for unexpected errors. They do not make a known broken diagram acceptable as a successful authoring check. The app must not silently modify authored text to work around such problems.

## Evidence limits

The supplied implementation review reports that the comma version renders successfully. That is attributed reviewer evidence. This authoring environment has no Mermaid installation; a bounded attempt to reach the package registry timed out, so a new local parser/render run is not claimed. Source changes, absence of the reported raw-semicolon pattern in all current lesson diagrams, synchronized copies, versions, and hashes are verified here. Actual app import and rendering remain the coder's acceptance step.
