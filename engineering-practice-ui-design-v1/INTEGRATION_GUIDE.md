# Integrate the original visual UI into the current application

## 1. Use the two packages together

This archive supplies the visual source missing from the earlier handoff. The earlier `VS_Code_App_and_First_Five_Lessons_v1.zip` supplies the functional specifications and current content release.

Apply this order when an old prototype detail conflicts with the new implementation:

1. The owner's current instructions.
2. The current application, evidence, and authored-content requirements in the first-five handoff.
3. This package's visual integration instructions and design specification.
4. The original component source as a reference for implementing those requirements.

The requested change is to restore the original visual design around the working five-lesson application. Keep existing learner records and completed application functionality intact.

## 2. Locate the reusable implementation

Begin with `reference-source/app/globals.css` and the `Nav`, `Workspace`, and `Learn` functions in `reference-source/components/workspace.tsx`. Together they provide the sidebar, top bar, page container, dashboard cards, progress treatment, and lesson list.

`COMPONENT_MAP.md` identifies the remaining surfaces. `design/design-tokens.json` makes the original values easy for an AI coder to consume. `design/theme-tokens.css` is a plain CSS extraction of the root tokens and font stacks; it does not contain all the layout rules by itself.

Keep `reference-source/` as a reference folder while porting. The source is intentionally preserved without edits so its appearance and behavior can be traced to the implemented prototype.

## 3. Integrate with the target stack

The reference uses React/TypeScript, Tailwind CSS 4, Lucide icons, and the supplied UI primitives. Their local imports are included. The `@/` alias in the reference points to the root of `reference-source/`.

Use the target app's package manager and supported build setup. Inspect its installed primitives before adding dependencies. The exact imported packages and original locked versions are recorded in `design/dependency-inventory.json`; those values describe the reference environment, not a requirement to downgrade or replace the target app's stack.

The full original stylesheet imports Tailwind, animation styles, and a local vendored stylesheet. Keep the relative vendor import working if copying that stylesheet. If the target has a different styling setup, port the token values, selectors, and responsive rules deliberately. The plain token file is available for that purpose.

Several styles target `data-slot` and `data-active` attributes emitted by the supplied primitives. Copying colors alone will not reproduce the component states. Preserve those attributes or adapt the selectors to the target's equivalent component structure.

The original `package.json`, lockfile, TypeScript configuration, page, and layout are included to explain the source environment. They are not replacements for the target's working package scripts, routing, root layout, or deployment configuration. This export omits the hosting runtime and is not a standalone app starter.

## 4. Connect current data to the restored presentation

| Original source detail | Required integration |
| --- | --- |
| Hard-coded eight-lesson totals, `/ 08`, and final-lesson fallback | Derive order and total from `content/learning-release.json`; currently five lessons |
| Old `lib/lessons.json` and `LS-HTTP-*` identifiers | Use the current `LS-M020-01` through `LS-M020-05` lessons and their full authored Markdown |
| Bulletin/cache investigation copy on the dashboard | Use the actual current lesson title and appropriate authored context |
| Original `go()` hash routes | Connect the restored controls to the target's working router |
| Demo local-storage state and `transition()` calls | Use the target's actual durable progress, note, and attempt records |
| Scripted review generation | Use actual feedback or the clearly identified manual-review export workflow |
| Demo role selector and scenario controls | Keep them out of the ordinary student UI |
| Shared advanced prediction | Bind each recording field to the selected lesson, activity, and version |
| Three teaching tabs | Preserve the new authored section order, navigation, and explanations |
| Technical IDs and release strings on learner cards | Put them in Details, support/export metadata, or administrative views |
| Demo evidence counters | Display only supported real counts and meaningful empty states |

Do not reset saved progress to obtain a screenshot with attractive numbers. Test both an empty learner record and a returning learner record using an appropriate development fixture, then keep the real records intact.

## 5. Suggested implementation sequence

1. Compare the current app's shell and data interfaces with `Nav`, `Workspace`, and `Learn`.
2. Integrate the theme and shell: light workspace, navy sidebar, top bar, layout width, navigation, and focus states.
3. Restore the current-lesson and progress cards and the ordered lesson rows using the current release and actual progress.
4. Apply the reading, notes, help, and local-lab download styling to the existing full Markdown reader and activity controls.
5. Exercise navigation, save/resume, downloads, and error states after the visual change. Fix any affected behavior before declaring the visual integration complete.

A navigation destination must have a working route or a clear, useful empty/unavailable state. Recreating a label while leaving a dead control is not enough. A real review can be absent without showing a fabricated review.

## 6. Acceptance checklist

- The desktop silhouette matches the reference: navy sidebar, light main workspace, white top bar, clear heading, current-lesson card, and neighboring progress card.
- The restored palette, spacing, typography, icons, borders, and control states follow the supplied implementation.
- The main action is Start for a new learner or Continue for a returning learner, and it opens the correct current lesson or saved position.
- All five current lesson titles appear in order, with totals derived from the release rather than copied from the old prototype.
- Release identifiers, lab IDs, import checks, and metadata explanations do not dominate the student dashboard.
- Full lesson prose, actual tables, diagrams, code blocks, walkthroughs, and activity fields remain present and in the authored order.
- Notes and acknowledged predictions survive a refresh and application restart in the supported persistence mode.
- Current and older submitted work retain their lesson/version context. The visual port does not replace or silently migrate them to old prototype records.
- Help, Practice, Reviews, and Progress have real routes or honest, useful empty/unavailable states.
- Narrow screens use the responsive layout and mobile navigation; lesson prose and primary actions remain usable at 200% zoom.
- Keyboard users can navigate, open and dismiss the sidebar/help panel, read the lesson, enter notes, and activate downloads with visible focus.
- The target app's normal checks pass after integration. The coder supplies desktop and narrow-screen screenshots and identifies what was actually exercised.

Matching appearance does not establish accessibility conformance or learning effectiveness. Report those as separate checks with their actual scope.
