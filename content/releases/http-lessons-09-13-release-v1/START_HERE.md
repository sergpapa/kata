# HTTP caching: Lessons 9–13

This package continues the authored course with five complete Markdown lessons and a local lab. It includes the preceding eight lessons and their original lab archives so your coder can import one consistent release.

## What is new

| Course order | Stable lesson ID | Student lesson |
| --- | --- | --- |
| 9 | LS-M021-01 | The same address can give you a different answer |
| 10 | LS-M021-02 | Keeping a copy is not permission to reuse it forever |
| 11 | LS-M021-03 | Ask whether your copy still applies |
| 12 | LS-M021-04 | Make the conditional decision precise |
| 13 | LS-M021-05 | What the server sent is not always what the page received |

The sequence develops identity, representations, freshness, validators, conditional retrieval, and browser observation layers before asking the learner to investigate a broken validator. Explanations, familiar examples, local experiments, predictions, and complete worked feedback remain part of every lesson. Lesson 12 includes a focused coding exercise.

## For your VS Code coder

Give the coder this ZIP and ask them to read `VS_Code_Coder_Handoff_Lessons_09_13_v1.md`. The canonical lesson sources are in `content/lessons/`; the import manifest is `content/learning-release.json`. Keep the existing Engineering Practice visual design and learner progress. This is a content update to your existing app, not a replacement app specification or a request to recreate the UI.

The release has 13 lessons, 39 practice recording entries, and four lab downloads. Previous lesson bytes, stable IDs, activity records, and lab archives are retained. The supplied local browser observation page belongs to the downloadable exercise, not to the course homepage.

## For studying directly

Read the Markdown lessons in order. If you have completed only Lessons 1–4, continue with 5–8 before these caching lessons. Practical familiarity may make those quicker, but the prerequisites are not silently assumed away.

Extract `content/labs/HTTP_Lessons_09_13_Local_Kit_v1.zip` into a separate folder and follow its README. Work runs on your own machine. No cloud account or package installation is needed for this lab; it uses Node.js, curl, and a browser. All hints and worked explanations are available when needed.

## Verification and next work

The new kit passed 34 protocol checks and a 17-exchange curl rehearsal. The practice starter fails the intended ten cases, while its worked solution passes all fourteen. Actual browser-cache rehearsal, native Windows/macOS setup, and integration into your separate app remain unverified. Their acceptance steps are included; see `Verification_and_Known_Limits.md`.

The next authoring step is Lessons 14–15: the planned M021-06/07 investigation and transfer problem. Rate limiting and attacks/defences remain in the later progression described by the existing depth map. They are not claimed as taught by this caching batch.

This is an owner-review candidate. Your reported review covers Lessons 1–4; the package does not assume you have completed later lessons or award competency from reading them.
