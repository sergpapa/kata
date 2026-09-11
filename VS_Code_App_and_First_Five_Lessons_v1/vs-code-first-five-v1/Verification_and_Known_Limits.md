# Verification and known limits of the first-five handoff

Prepared 2026-09-11. This package is an owner-review candidate.

## What changed

The packet brings together the existing specifications, the rewritten first two HTTP lessons, three newly authored lessons, the preserved Lesson 2 local kit, and a new shared kit for Lessons 3–5. A current handoff identifies the selected content release and the first application checkpoint. The review template closes the trial after Lesson 5.

The external VS Code coder owns application implementation. No application source was changed or deployed in preparing this package.

## What was checked

- The new local fixture passed 11 author-run check groups on Linux with Node.js v24.19.0 and curl 8.5.0. These cover JavaScript parsing, three menu representations, identical HTML bytes with different declared types, document resource references, missing paths, GET/HEAD/unsupported methods, the student curl commands, occupied-port behavior, stopping, restart, alternate ports, and invalid startup arguments.
- The new kit's `author-verification.json` records the detailed results and hashes of the source actually checked. The Lesson 2 kit retains its own earlier verification record.
- The portable release was checked for five distinct lesson IDs in order, front-matter/version agreement, exact source hashes, referenced lab identities and versions, intact nested kit manifests, matching embedded lesson copies, and 15 activity excerpts that match their named source sections.
- Markdown fences and JSON examples were checked. Relative document links in the specifications resolve within this handoff. Lesson navigation contains no author-workspace or `sandbox:` links.

These checks establish specific artifact and fixture properties. They are not an application acceptance report or evidence that a student completed the exercises.

## What still needs the trial

- Actual browser rendering, both button paths, the DevTools walkthrough, and the Markdown/Mermaid presentation in the external application.
- Native Windows and macOS setup and execution.
- Application import, saving, recovery, resume, export, accessibility, and any real review workflow. The coder should run the handoff's acceptance checks and report their actual scope before handing over the app.
- Learner comprehension, familiarity of the analogies, appropriate pace, missing prerequisites, and whether feedback resolves confusion.
- Independent technical/editorial review before a public lesson release. These drafts have not passed that gate.

Official documentation supports the technical explanations and browser-tool instructions, with links beside the relevant claims in the lessons. The browser walkthrough was not executed in a GUI browser during authoring.

## Source precedence and historical material

Start with `VS_Code_Coder_Handoff_v1.md`. Its current instructions resolve the older prototype's lesson format and the active first-five sequence. `content/learning-release.json` selects the active release.

The original specification files and existing Lesson 1 and Lesson 2 Markdown are preserved byte-for-byte. The older representative package is included under `specifications/` to resolve a historical architecture reference. Its lessons and exercises are not selected by the current manifest.

The root `package-manifest.json` records file hashes. Those hashes detect content mismatch; they are not a signature or independent approval. The final owner review should identify the application build and learning release actually used.
