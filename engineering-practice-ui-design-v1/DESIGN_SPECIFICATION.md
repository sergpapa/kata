# Visual design specification

This specification describes the existing implementation in `reference-source/`. Values below come from that source rather than from estimating screenshot pixels. Match the visual relationships while adapting to the current application's real content.

## 1. Overall appearance

Use a persistent dark navy course sidebar beside a pale, cool workspace. Place the main work in white cards, with an indigo current-lesson card and a lime Start/Continue button. Maintain the strong heading hierarchy and generous spacing visible in the reference.

The original UI defaults to a **light main workspace** even though the sidebar and selected cards are dark. A dark full-page lesson index does not reproduce this design. The original working product name is Engineering Practice; product naming is a separate owner decision. Do not invent a new brand as part of the visual integration.

## 2. Palette

| Role | Implemented value | Original selector or token |
| --- | --- | --- |
| Workspace canvas | `#f5f7fc` | `--background` |
| Primary text | `#19233e` | `--foreground` |
| Card surface | `#ffffff` | `--card` |
| Secondary text | `#57627c` | `--muted-foreground` |
| Standard action | `#3349b3` | `--primary` |
| Standard action text | `#ffffff` | `--primary-foreground` |
| Sidebar | `#17233f` | `--sidebar` |
| Sidebar main text | `#f2f5ff` | `--sidebar-foreground` |
| Sidebar active surface | `#2a3a60` | `--sidebar-accent` |
| Sidebar active marker | `#d7ef81` | `.nav-button[data-active=true]` |
| Current-lesson card | `#23335a` | `.continue-card` |
| Lime primary action | `#d7ef81` | `.lime-button` |
| Lime action text | `#25370f` | `.lime-button` |
| Lime action hover | `#e3f8a1` | `.lime-button:hover` |
| Card border | `#dde3ef` | `--border` |
| Input border | `#c8d1e4` | `--input` |
| Focus outline | `#546acc` | `--ring` |
| Code-panel background | `#17233c` | `pre`, `.terminal-panel` |
| Code-panel text | `#d7e4f7` | `pre` |

Use the full token export for the additional success, warning, popover, and control colors. Avoid substituting a generic dark theme or a new palette during this integration.

## 3. Typography

The original UI uses system font stacks. No custom font download is needed to reproduce its specified font choice. Different operating systems may select different members of the same stack.

| Element | Implemented treatment |
| --- | --- |
| Sans-serif stack | `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` |
| Monospace stack | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |
| Main body | `1rem`, line height `1.65` |
| Lesson prose | `1rem`, line height `1.85`, color `#35415b` |
| Main heading | `clamp(1.8rem, 2.5vw, 2.65rem)`, weight `650` |
| Section heading | `1.35rem`, weight `650` |
| Smaller heading | `1.05rem`, weight `650` |
| Heading rhythm | Line height `1.25`, letter spacing `-.025em` |
| Sidebar navigation | `.9375rem` |
| Eyebrow label | `.75rem`, weight `700`, letter spacing `.115em` |
| Secondary fine text | `.8125rem` |
| Code panel | `.875rem`, line height `1.8` |

Preserve the hierarchy, not incidental line wraps in a cropped screenshot. Keep main lesson text readable at browser zoom and avoid shrinking it to fit the reference viewport. Small metadata styles are not appropriate for essential instructions.

## 4. Application shell

The shell has a sidebar, a white top bar, and a main workspace.

- **Sidebar width:** the workspace overrides the primitive default with `15.5rem`. The mobile drawer uses `18rem`.
- **Brand area:** icon tile and two-line wordmark treatment. The tile is `2.7rem` square with a 7px radius, lime icon, and blue-navy background.
- **Primary destinations:** Learn, Practice, Reviews, Progress. Use the existing real route names behind these labels.
- **Navigation rows:** minimum height `3rem`, generous icon/text spacing, a muted blue active surface, and a 3px inset lime marker.
- **Current unit:** a concise unit label and actual studied/total progress. The denominator comes from the active release.
- **Top bar:** white surface, lower border, breadcrumb context, and a consistent Get help action. Its original minimum height is `4.45rem`.
- **Main container:** width `100%`, maximum width `1500px`, centered, with desktop padding `2.45rem 2.5rem 3rem`.

The prototype banner, scenario menu, and demo-perspective selector belong to the old demonstration. They are not visual requirements for the student application. If the current trial needs a preview label, use one short, truthful label and keep technical release details elsewhere.

## 5. Learning dashboard

The dashboard first answers where to begin or resume. Its hierarchy is:

1. Page heading and short useful context.
2. A prominent current-lesson card with a Start or Continue action.
3. A neighboring white card with actual study progress and a route to useful supporting records.
4. An ordered list of available lessons.

Use the original `.overview-grid`: `minmax(0,1.7fr) minmax(17rem,1fr)` with a `1.25rem` gap on large screens. The current-lesson card uses a 10px radius and `1.75rem 2rem 0` padding. Ordinary cards use a 9px radius, a thin border, and `1.65rem` padding.

Bind the current-lesson title and action to real progress. A new learner should receive a Start action for the first lesson; a returning learner should resume the saved location. A learner who has studied all five needs a truthful completed-trial/review path. Do not show an old caching title or an arbitrary lesson just because it appeared in the screenshot.

The original card's Observe / Explain / Investigate strip supplies a visual pattern. If retained, its wording must fit the current learning activity. It does not control how lesson sections are ordered.

Lesson rows use an index or studied-state mark, the authored title, brief useful state, and a navigation affordance. The original row padding is `1rem 1.5rem`, with thin separators inside one white rounded container. Keep release IDs and lab IDs out of these ordinary rows; provide details where needed.

Progress records study activity. A ratio such as 2/5 does not establish HTTP mastery. Counts, empty states, and review links must reflect the current application data.

## 6. Lesson workspace

Reuse the visual reading card, surrounding navigation, help surface, and notes styling. On wide screens the original `.reader-grid` uses `minmax(0,1.8fr) minmax(18rem,1fr)` with a `1.5rem` gap. The lesson card has `2rem` padding.

The **teaching sequence comes from the new Markdown**. Render the complete ordered lesson with a contents list and resume behavior. The old First model / Technical reality / Where it breaks tabs are not part of the new content contract.

Use the original input, note, code-panel, and reading-footer treatments with the new activity records. Place a prediction or observation field beside its own section or immediately after it on smaller screens. Full explanations remain accessible as authored.

The old `Markdown` function is a limited prototype renderer: it prints tables as preformatted text and does not render the new diagrams. Keep the target application's compliant Markdown renderer. Borrow the `.prose`, `pre`, note, and card styling while retaining semantic headings, real tables, safe code blocks, and Mermaid diagrams with their text equivalents.

## 7. Controls and feedback

The source uses Lucide outline icons and reusable UI primitives. Keep icon weight, placement, and control proportions consistent. The supplied favicon is the original asset.

- Standard buttons have a `2.65rem` minimum height and a 6px corner radius; labels can wrap.
- Focus uses a visible 3px outline with 3px offset.
- Text areas have a light surface, 6px radius, generous padding, and vertical resizing.
- Notes use a lightly tinted surface, thin border, and stronger left border. Warning and success states include text, not color alone.
- Help sheets use the existing right-side panel treatment, up to `32rem` wide, with their own vertical scrolling.
- The original source contains save, empty, warning, and error presentations. Connect them to actual application states.

## 8. Responsive behavior

Use the full stylesheet and the sidebar's mobile hook as the source for these transitions:

| Width or preference | Implemented layout change |
| --- | --- |
| At or below 1150px | Reduced outer padding; lesson reader becomes one column; notes can sit side by side below it |
| At or below 900px | Dashboard and general two-column grids stack; metric cards reflow |
| Below 768px | Sidebar becomes a drawer; the top-bar navigation trigger is available |
| At or below 767px | Smaller outer/card padding, stacked page title, compact lesson rows, and vertically arranged reader context |
| Reduced-motion preference | Animations and transitions are minimized |

Code panels may scroll horizontally within their own boundaries. The whole page and its navigation should not require horizontal scrolling to read lesson prose or use a control.

These values describe the original implementation. Integration still needs actual browser checks, including keyboard navigation, narrow screens, longer new titles, and zoomed text.
