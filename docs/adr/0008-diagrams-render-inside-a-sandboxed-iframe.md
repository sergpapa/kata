# 0008. Diagrams render inside a fully sandboxed iframe, so no HTML string is ever injected

Date: 2026-09-11
Status: Accepted

Refines ADR 0007, which promised that no HTML string is produced anywhere in the application,
without having met a library whose only output is one.

## Context

ADR 0005 requires Mermaid diagrams to render "in its safe configuration". ADR 0007 states the
mechanism that makes lesson content structurally inert: "There is no `dangerouslySetInnerHTML` in
the codebase, so there is no injection sink whose safety depends on a sanitizer allow-list being
complete."

Mermaid has no element-returning API. `mermaid.render(id, source)` resolves to an object whose
`svg` property is a **string** of SVG markup. Getting a diagram onto the page therefore means
turning a string into DOM, which is the one thing ADR 0007 says this application never does.

The three diagrams in the release are authored content, and authored content is untrusted input
(ADR 0005). Mermaid's `securityLevel: 'strict'` encodes HTML in labels and disables `click`
handlers, and Mermaid bundles DOMPurify over its own output — but that is a filter, and ADR 0007
chose structure over filters deliberately.

## Decision

**The SVG string is passed to an `<iframe srcDoc sandbox="">` and never to the host document.**

`srcDoc` is an ordinary React attribute holding an ordinary string; no DOM is constructed from
markup in this document. `sandbox` with the empty value grants nothing: no scripts, no forms, no
popups, no top-level navigation, no plugins, and an opaque origin that is not same-origin with the
application. Whatever Mermaid emits is a separate, fully restricted document that cannot reach
this one.

**`mermaid.parse()` is asked before `mermaid.render()` is called, and without `suppressErrors`.**
`render()` on source Mermaid cannot read throws _and_ leaves a `div#d<id>` in `document.body`
holding Mermaid's error-bomb graphic. `parse()` adds nothing to the document either way, so asking
it first keeps the failure path off the page entirely.

`suppressErrors: true` is deliberately not passed. With it, `parse()` answers a bare `false` and
the parser's message is lost — and that message is the only thing that tells a reviewer which line
of a lesson was refused, which is the whole point of showing a reason rather than a shrug. Without
it, `parse()` rejects with an `Error` carrying the message in full.

The `render()` call is still wrapped and still removes that div if it ever appears, because a
guarantee with one mechanism behind it is one bug from being no guarantee.

**Mermaid is loaded by dynamic `import()`, only on a page that has a diagram.** Lessons 3 and 4
have no `mermaid` fence and pay nothing for the dependency.

**Mermaid 11, not 12.** Mermaid 12 depends on `chevrotain@11.1.2`, which pins `lodash-es` to
`4.17.23` exactly — a version carrying GHSA-r5fr-rjxr-66jc (code injection via `_.template`) and
GHSA-f23m-r3pf-42rh (prototype pollution in `_.unset` and `_.omit`). Mermaid 11 has no chevrotain,
`dagre-d3-es` then resolves `lodash-es` to the patched 4.18.1, and `npm audit` reports zero
vulnerabilities. Lesson content is untrusted input to this parser, so avoiding the advisories beats
reasoning about whether Mermaid reaches the vulnerable functions.

**A diagram that cannot be drawn falls back to the labelled source block, not to nothing.** Same as
every other inert-content path in ADR 0007: the reader sees what was written and why it did not
render, including the parser's own message in full.

## Alternatives considered

- **`dangerouslySetInnerHTML` with Mermaid's strict-mode output.** Ten lines, the diagram inherits
  the page's CSS, and its text is selectable with the rest of the page. Rejected: it creates the
  exact sink ADR 0007 says the codebase does not have, and every future reader would have to
  re-derive that it is safe from Mermaid's internal DOMPurify rather than from the structure.
- **Parse the SVG string to hast, sanitize it, convert to React elements.** No sink, and page CSS
  still applies. Rejected: `hast-util-sanitize` ships no SVG schema, so this needs a hand-written
  allow-list of every tag and attribute Mermaid emits. A gap in that list blanks a diagram silently
  — the failure mode this project rejects everywhere — and the list has to be maintained against a
  library we do not control.
- **Mermaid's own `securityLevel: 'sandbox'`.** Mermaid builds the iframe itself. Rejected: the
  sandbox attribute it writes is its choice, not ours, and the point of this decision is that the
  restriction is stated in our code where a test can assert it.
- **Render diagrams to SVG at import time and store them.** Rejected for the same reason ADR 0005
  rejected storing rendered HTML: it makes the Markdown non-canonical and forces a re-import
  whenever the renderer changes.

## Consequences

Easier: ADR 0007's guarantee stands unamended and unqualified — still no injection sink anywhere in
the application. A Mermaid vulnerability, present or future, cannot escape into the page. The
restriction is one attribute a test can read.

Harder: the iframe's height cannot be measured from inside a document with no scripts, so it is
computed from the SVG's `viewBox` before the iframe is written. CSS custom properties do not cross
the iframe boundary, so the page's colours are resolved and baked into the `srcDoc`, and the
diagram re-renders when `prefers-color-scheme` changes. Diagram text is not selectable together
with page text, and assistive technology treats the diagram as a separate document — the author's
"In words:" paragraph beside each diagram is the text equivalent, which the handoff requires be
kept adjacent regardless.

Revisit if a lesson needs an interactive diagram. That is a versioned trusted component with its
own content schema, as ADR 0005 already says — never a relaxed sandbox.
