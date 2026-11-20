# 0022. axe-core checks every route in the screenshot gate

Date: 2026-11-19
Status: Accepted

## Context

The brief asks for keyboard operation, readable layouts at three widths, and diagram meaning as
text. The layout gate (`npm run screenshots`) already measures overflow in real Chromium, but
nothing checked the accessibility tree. A one-off axe-core run found 260 duplicate landmark names
and a contrast failure that no test or review had noticed, because nothing was looking. Spec:
`docs/specs/accessibility-pass.md`.

## Decision

Add `axe-core` as a root dev dependency. The screenshot tool injects it into every captured route,
in light and dark, at 375 and 1440, with the WCAG 2.0/2.1/2.2 A and AA tags plus best practice, and
fails the run on any violation. No rule is disabled.

## Alternatives considered

- **Hand-written checks for the two rules found.** Lost because it is blind to every rule nobody
  wrote down, which is how these two survived ten slices.
- **`@axe-core/playwright`.** Lost because the tool already drives Playwright and needs only the
  script; the wrapper adds a package for one `addScriptTag` call.
- **Run axe in the vitest suite under jsdom.** Lost because jsdom has no layout or colour, so
  contrast and target size cannot be judged there.

## Consequences

Easier: a slice that introduces an unnamed control, a duplicate landmark or a low-contrast colour
fails the gate it already runs. Harder: the gate is slower (about 90 extra page checks) and an
axe-core upgrade can add rules that fail it; pin the version and upgrade on purpose. axe-core is
MPL-2.0, dev-only, and never shipped to the browser bundle. Revisit if a rule proves wrong for this
app; disable it by name with a reason here, never wholesale.
