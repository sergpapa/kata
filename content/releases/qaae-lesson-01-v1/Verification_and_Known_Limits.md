# Verification and known limits

What was checked for `QAAE-LESSON-01@1.0.0-draft`, on 2026-11-03, and what was not. Author
rehearsal and automated checks only. No learner has used this lesson, and the owner has not yet
read it.

## Checked

- **Import.** The app's importer accepts the package beside the full-stack release, with neither
  refused (`apps/server/src/realQaaeRelease.test.ts`). Every file hash in `learning-release.json`
  and `package-manifest.json` was computed by script from the bytes on disk.
- **Activities.** Each of the three `source_heading` values names a heading that appears exactly
  once in the lesson, outside code blocks. Each `prompt_markdown` is the lesson's own section text.
  Each `lesson_version` matches the lesson.
- **Independent review** (ADR 0013), in a separate session that saw only the authoring standard,
  the owner's recorded feedback, this course's teaching contract and Q01 module record, the
  full-stack Lesson 1 as the quality bar, and the draft. Its findings were taken before release:
  3 high, 7 medium and 7 low. The highest were an analogy that contradicted itself about which
  knowledge the new colleague had, a "fresh page" claim that implied the site's data is reset, and
  a claim about missing `await` that current Playwright does not bear out.
- **Playwright facts**, against playwright.dev on 2026-11-03, and by the reviewer running the
  lesson's own examples on Playwright 1.63.0 in Chromium:
  - role, label and text matching is case-insensitive substring by default;
  - a locator matching two elements makes an action fail (strictness);
  - actions wait for actionability, with no time limit of their own, inside the 30-second test
    timeout; assertions retry for 5 seconds;
  - Practice C's renamed-button test fails after 30 seconds waiting for the button, and the
    assertion is never reached;
  - the €0.00 page passes the lesson's test, and fails it once the total is checked.
- **Diagram.** The one Mermaid block contains no raw semicolons. It parses and draws with the
  app's pinned Mermaid 11.17.2 in Chromium, inside the app's lesson page, at 375, 768 and 1440
  pixels in light and dark schemes (`npm run screenshots`, all layout checks passed). At 375
  pixels it sits in the same horizontally scrolling frame as the full-stack lessons' diagrams.

## Not checked

- Firefox and WebKit. Every browser check here ran in Chromium.
- Any learner. Reading time, difficulty and whether the analogy works are unmeasured.
- Two departures from the course's teaching contract, left for the owner to decide:
  - The contract says each lesson has a lab. This lesson has none, by the owner's choice of an
    install-free first lesson.
  - The contract asks for the naive attempt to be observed. Here the colleague's two runs are
    described, because the learner has no tools yet.
