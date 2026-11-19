# Accessibility and responsiveness pass

Milestone 3. Keyboard operation of navigation, notes, downloads, help and export; 375 / 768 / 1440
with no horizontal page scroll; diagram meaning available as text. Plus one layout request from the
owner: on the dashboard, the continue card and the Export card line up at the bottom.

## Measured before scoping (2026-11-19, built app, scratch store)

- **axe-core 4.10** (WCAG 2.0/2.1/2.2 A and AA plus best practice) on 22 routes × light/dark ×
  375/1440 found two rules. `landmark-unique` (moderate, 260 nodes): every table scroller is a
  region named "Table", code regions repeat names like "ts sample", and every feedback section is
  named by the same title. `color-contrast` (serious, 8 nodes): the decorative ghost number behind
  the continue card, light mode only.
- **Keyboard:** 28 Tab stops on the dashboard and 73 on Lesson 1, each with a visible focus ring;
  none hidden or zero-size.
- **Targets at 375px:** WCAG 2.2's 24px rule passes everywhere. Under the app's own 44px floor:
  the breadcrumb link (20px), the sidebar trigger (22–34px on one side), `<summary>` toggles
  (23–31px), code Copy buttons (39px) and the lab-kit download (43px).
- **Diagrams:** each drawn diagram's frame has a title, and every lesson diagram is followed by an
  authored paragraph beginning "In words:".
- **Overflow:** already gated at 375, 768, 1440 and 720 (1440 at 200%) on every route.

## Decisions taken with the owner (2026-11-19)

1. **44px floor** for standalone controls at 375px, gated so it cannot regress.
2. **axe-core** as a dev dependency, run by `npm run screenshots` on every route (ADR 0022).

## Acceptance criteria

### Gates in `npm run screenshots` (real Chromium, built app)

- **AX1.** axe-core runs on every route the tool captures, in light and dark, at 375 and 1440, with
  the WCAG 2.0/2.1/2.2 A and AA tags and best practice. Any violation fails the run, naming the
  rule, the route, the scheme, the width and the first offending selector. Nothing is excluded.
- **AX2.** At 375px on every route, and on Lesson 1 with the navigation drawer open, every visible
  link, button, select, input, textarea, summary and focusable element is at least 44px tall and
  44px wide. Exempt: a link that sits inline in a sentence (`display: inline` inside `p`, `li` or
  `td`), and a checkbox or radio whose own `<label>` is at least 44px tall and 44px wide. A failure
  names the route, the element and its size.
- **AX3.** On the course list, the FSSE dashboard and Lesson 6 (which has a lab kit, a diagram,
  code blocks and activities), at 1440, the visible focusable elements are listed first (links,
  enabled buttons, inputs, selects, textareas, summaries, and anything with a tabindex other than
  -1); a radio group counts once, as its checked radio or, with none checked, its first. Pressing
  Tab from the top must then focus every one of them, exactly in document order, and
  at least one. At each stop the element has a box, and its focused outline or box shadow differs
  from its unfocused one and is not nothing (`outline: none` over a permanent shadow fails). The
  page must also contain, among those elements: on the dashboard, both range selects, the
  conversations control and Export; on Lesson 6, the lab-kit download, at least one Copy button,
  response box, response Save, Get feedback (after one box is typed into, since an empty one
  disables it) and Show diagram source.
- **AX4.** On the FSSE dashboard at 1440 and at 901 (the two-column layout), the continue card and
  the Export card have the same height within 1px, and the continue button's bottom edge sits on
  the continue card's bottom padding edge (inside its border) within 1px, level with the Export
  button's bottom edge within 1px (with no export failure showing). At 900, 768 and 375 the cards
  stack: the Export card starts below the continue card's bottom.
- **AX4a.** On the same dashboard, the ghost number still renders (the continue card has generated
  content that is not empty), and the card's accessibility tree, as Chromium reports it, says the
  lesson number once, not twice.
- **AX5.** The existing overflow gate (375, 768, 1440, and 720 for 1440 at 200%) still passes on
  every route.

### Naming and description (vitest)

A lesson page renders Markdown in more than one place: the lesson body, an activity's prompt (when
its authored section is missing), and each of Claude's replies. Each place numbers its own tables,
code blocks and diagrams from 1, in document order. The body's names are as below; every other
place adds ` in <place>`: `in the prompt for <activity title>`, or `in Claude’s reply <turn> on
<activity title>` (a typographic apostrophe, as the app's copy uses). So no two regions on one lesson page share a name, as long as activity titles
differ. Names are the same on every render, including a re-render and React's StrictMode.

- **AX6.** Each table's scroll region is named `Table <n>`, followed by `: ` and its header cells'
  text joined by `, ` when the header row has any text (markup such as `**Path**` or `` `code` ``
  contributes its text only).
- **AX7.** Each code block's scroll region is named `Code sample <n>`, followed by `, <language>`
  when the fence names one (the first word of the info string, as written). Mermaid fences are
  diagrams and are not counted; a diagram's own source block is named `Source of diagram <n>`.
- **AX8.** Each feedback area is named `Feedback from Claude on <activity title>`; its visible title
  stays "Feedback from Claude".
- **AX9.** A drawn diagram is described (`aria-describedby`) by the paragraph that immediately
  follows it when that paragraph begins exactly with "In words:". Nothing else describes it: not a
  paragraph after an intervening element, not one before the diagram, not "in words:" or "In
  words" without the colon, and never another diagram's paragraph. The app never writes one.
- **AX10.** The ghost number behind the continue card is not text in the document: it is not in the
  card's text content. (That it still shows, and is not in the accessibility tree, is AX4a.)

## Assumptions (defaults, not asked)

- Table names use header cells, not captions: the authored tables have no captions.
- The 44px floor applies at 375 only, as the owner's earlier slices did; desktop pointer targets
  are left as they are.
- No screen reader is run here (NVDA or Narrator need a person listening). axe-core and the Tab
  walk are the automated stand-ins; a listening pass by the owner is recommended but not part of
  done.

## Out of scope

Screen-reader listening tests. Reduced-motion and high-contrast-mode work. Any change to lesson
content (a missing "In words:" would go to `docs/content-feedback.md`, not into the app). The
acceptance run (the next Milestone 3 item).

## Done means

`npm run screenshots` runs axe-core, the 44px check, the Tab walks and the dashboard alignment check
on every route and passes, and on the owner's 1440 dashboard "Continue lesson" and "Export" sit on
the same bottom line.
