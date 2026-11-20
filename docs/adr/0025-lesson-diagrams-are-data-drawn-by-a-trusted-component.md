# 0025. Lesson diagrams are data drawn by a trusted component, with Mermaid as their fallback

Date: 2026-11-20
Status: Accepted

Refines ADR 0008, which drew every diagram with Mermaid inside a sandboxed iframe and named this
decision as the way to go further: "a versioned trusted component with its own content schema".

## Context

Mermaid lays a diagram out itself, and the app cannot change its choices. In a sequence diagram the
participants sit in one row and each gap grows to fit the longest label in it. Seven of the 15
lesson diagrams are sequences, written with sentence-long labels, and several are wider than the
lesson column. "What a program receives" is wider than its frame even at 1440px. ADR 0008 shows
the drawing at its natural size in a scrolling frame, because scaling it down makes the labels
unreadable. The drawing uses Mermaid's stock theme, because the page's CSS custom properties cannot
reach into the iframe.

The owner compared this with a hand-built diagram: grouped boxes, colour for state, a note under
each node, a caption with a bold lead. They asked for every lesson diagram to look like that.

Lesson content is untrusted input (ADR 0005), and nothing in the app turns a string into DOM
(ADR 0007). So an author cannot ship hand-written SVG or HTML.

## Decision

**A lesson diagram is a `kata-diagram` fence holding JSON that describes what the diagram says.
A trusted React component draws it.** The author names the participants, the steps in order, the
phases, which step is highlighted, the notes and the caption. The component decides the geometry.
It is built from ordinary React elements, so ADR 0007's guarantee is unchanged: no markup string
is ever parsed, and there is no iframe to escape.

**The JSON is checked strictly, and every refusal names a path.** An unknown key, a reference to a
participant that does not exist, or a wrong type is refused with a message such as
`steps[3].to: "sitee" is not a participant (runner, browser, site)`. A typo never draws a diagram
that quietly leaves something out.

**Layout follows the diagram's own width.** A container query switches between participant columns
with arrows and a one-row-per-step list. Labels wrap in both. Nothing scrolls sideways, and the
screenshot gate fails a Kata diagram that is wider than its column.

**The Mermaid fence stays as the fallback.** A `mermaid` fence directly after a `kata-diagram`
fence belongs to it. When the Kata fence is valid, the fallback draws nothing and Mermaid is never
loaded for it. When the Kata fence is refused, the fallback is drawn through ADR 0008 unchanged, and
a disclosure says why.

**Version 1 has one kind, `sequence`.** The flowchart kind comes with the slice that migrates the
first flowchart, so each kind is designed against a real diagram.

## Alternatives considered

- **Restyle Mermaid and shorten the labels.** Mermaid's `themeVariables` and `wrap` settings would
  bring in the palette and stop most overflow. Rejected as the end state: the layout stays
  Mermaid's, so there are still no groups, no notes and no phone layout. It remains open as a
  stopgap for diagrams not yet migrated.
- **Hand-drawn SVG files per diagram, shown as images.** They would look right at one width. They
  cannot reflow: SVG text never wraps, so a phone either shrinks the labels to about 5px or scrolls.
  Each file would also carry its own copy of the palette, and every one would go stale when the
  design changes.
- **YAML in the fence.** Easier to read than JSON. Rejected: the `yaml` parser is 30.5 KB gzipped,
  22% of the entry chunk, or it is loaded later and every diagram gains a pending state. JSON
  parses synchronously with nothing added.
- **Mermaid only on phones.** Offered to the owner and declined: on a phone Mermaid's sequence
  diagrams are the ones that scroll sideways.

## Consequences

Easier: diagrams use the page's tokens, so they follow the colour scheme and every future design
change. Their text is part of the page, selectable and searchable, and a screen reader reaches it
as an ordered list. A diagram can carry what the lesson is about, through highlights, notes and
phases, rather than only who sends what.

Harder: every new diagram shape is app code, versioned and tested, not something an author can
reach for. A lesson diagram the schema cannot express has to wait for a kind, or ship as Mermaid.
Until the server and web app share a module, a bad fence is caught by the screenshot gate rather
than by `release:build`. Each migrated lesson carries two fences for one diagram, and the two can
disagree; a test compares the Kata messages of each migrated lesson with its Mermaid fallback.
