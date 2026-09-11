# 0007. Markdown renders to React elements, and inert content is converted rather than deleted

Date: 2026-09-11
Status: Accepted

Refines ADR 0005, which said imported content is sanitized on render, without saying by what
mechanism or with what result for content that fails the check.

## Context

The five authored lessons are 300 to 550 lines each of CommonMark with GFM tables, 63 fenced code
blocks across seven languages, and 25 external links. Lesson 3 teaches HTML, so it carries HTML
documents inside fences and HTML tags inside inline code spans — including two table cells holding
`<head> ... </head>` and `<body> ... </body>`. None of that may become a page element. The handoff
requires sanitized output, no raw HTML execution and no remote embeds (§4 Rendering; REQ-18), and
the brief forbids executing any lesson content at all.

The release we have contains no raw HTML outside a fence, no images and no relative links. The next
release may contain all three.

## Decision

**Markdown parses to React elements. No HTML string is produced anywhere in the application.**
`react-markdown` with `remark-gfm`, a component map, and `rehype-sanitize`. There is no
`dangerouslySetInnerHTML` in the codebase, so there is no injection sink whose safety depends on a
sanitizer allow-list being complete.

**Content that must not render is converted to visible text, never deleted.** A sanitizer's instinct
is to strip: a raw tag, an unsafe `href`, a remote image source all vanish. That is safe and silent,
and a lesson that quietly loses the author's words is the same failure the release importer exists
to refuse. Raw HTML renders as the characters the author typed; an unsafe link renders as its label
followed by its target; an image renders as its alt text and its source. The reader can always see
what was written and why it did not render.

**Links and images are guarded on the element tree, raw HTML on the Markdown tree.** This is not
stylistic. Markdown has two spellings for a link and for an image — `[text](url)` and `[text][ref]`
with a definition elsewhere — and only the first is a `link` node. The reference spellings stay
unresolved until mdast becomes hast, after every remark plugin has run. A guard on the Markdown
tree alone covers half the syntax, and `![menu][c]` with `[c]: https://tracker.example/pixel.png`
loads a tracking pixel. Raw HTML has no such second spelling and exists only in the Markdown tree.

**Only absolute `http:` and `https:` targets become anchors**, judged by parsing with no base URL.
Resolving against the page's own address is precisely what turns a scheme-less `//host/path` into a
live off-site link and `/notes.md` into a same-origin one. A same-document `#fragment` survives only
when something in that lesson actually carries the id, which keeps a generated footnote marker
working while refusing to ship a dead anchor.

**The stored Markdown stays canonical.** The endpoint serves a derived view — front matter and
title heading removed — and never rewrites `content_lesson.source_text`.

## Alternatives considered

- **Render to an HTML string on the server and inject it with `dangerouslySetInnerHTML`.** Fewer
  dependencies, and the parse happens once per lesson rather than once per view. Rejected: it
  creates an injection sink where there need not be one, and correctness then rests entirely on one
  allow-list staying right through every future change.
- **Let the sanitizer delete unsafe content, as sanitizers normally do.** Rejected: silent loss.
  The owner reviewing these lessons has no way to distinguish a rendering bug from an author's
  omission, and the report they send back would be wrong through no fault of theirs.
- **Allow any scheme a browser considers safe (`mailto:`, `tel:`).** Rejected for now. No lesson in
  the release has one, and an allow-list widened on speculation stops being an allow-list.
- **Store rendered HTML at import.** Rejected in ADR 0005 and still rejected: it makes the Markdown
  non-canonical and forces a re-import whenever the renderer changes.

## Consequences

Easier: nothing in a lesson can execute, whatever the next release contains, and the guarantee is
structural rather than a filter that has to enumerate threats. A renderer change needs no re-import.

Harder: three dependencies and their transitive unified/micromark trees, roughly 100 packages.
Syntax highlighting is not available without another large one, so fence languages are shown as a
label instead. The two guards must stay in the right order relative to the sanitizer — the comments
in `apps/web/src/markdown/LessonMarkdown.tsx` say why, and the tests fail loudly if they move.

Revisit if a lesson genuinely needs an interactive element. That is a versioned trusted component
with its own content schema, as ADR 0005 says — never an HTML escape hatch.
