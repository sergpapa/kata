# Spec — Markdown rendering contract (Milestone 1, slice 2)

**Status:** agreed 2026-09-11. Source: `docs/roadmap.md` Milestone 1 bullet 2, `docs/brief.md` §v1
scope 2, `VS_Code_Coder_Handoff_v1.md` §4 "Rendering" (lines 102–108) and §6,
`Application_Requirements_and_UX_Specification_v1.md` REQ-18 and REQ-40, ADR 0005.

The owner can read one authored lesson in the app, in the author's wording, with its tables, code
blocks and HTTP messages intact — and nothing in a lesson file can become a running page element.

## What the release actually contains

Measured across the five lesson files, because the contract has to cover what is there rather than
what a renderer usually meets:

| Construct               | Count       | Note                                                                           |
| ----------------------- | ----------- | ------------------------------------------------------------------------------ |
| Table rows              | 79          | GFM pipe tables; two cells in Lesson 3 hold HTML in backticks                  |
| Fenced blocks           | 63          | `text` 22, `sh` 19, `http` 11, `json` 4, `mermaid` 3, `powershell` 2, `html` 2 |
| Blockquotes             | 14          | Lesson 1 quotes café dialogue                                                  |
| H1 / H2 / H3            | 5 / 53 / 57 | One H1 per file — the display title                                            |
| Links                   | 25          | Every one an absolute `https:` URL (MDN, RFC Editor, curl, Node)               |
| Images                  | 0           |                                                                                |
| Relative links          | 0           |                                                                                |
| Raw HTML outside fences | 0           | Every `<tag>` outside a fence sits inside an inline code span                  |

Nothing in the release exercises the raw-HTML, image, or unsafe-URL branches. They are specified
and tested anyway: they are the branches that protect the owner from the _next_ release, and a
branch with no test is a branch that does not exist.

## Decisions taken at Stage 0

1. **Markdown parses to React elements, never to an HTML string.** `react-markdown` with
   `remark-gfm` on the client. There is no `dangerouslySetInnerHTML` anywhere in the app, so there
   is no injection sink for a sanitizer allowlist to get wrong. `rehype-sanitize` runs as a second
   layer, because ADR 0005 promises sanitized output and a promise with no mechanism behind it is
   not a promise. Rejected: `markdown-it` on the server plus `DOMPurify` and an injected HTML
   string — fewer dependencies, but correctness would then rest entirely on one allowlist.
2. **Raw HTML outside a fence renders as visible escaped text, never as an element and never
   dropped.** Dropping it lets a lesson lose authored words with no sign to the owner — the same
   shape of failure the release importer refuses. `react-markdown` 10 already escapes raw HTML on
   its own, but adding `rehype-sanitize` (decision 1) strips those raw nodes instead. A small
   remark plugin rewrites them into text nodes first, so the two decisions do not cancel each
   other out. _(Corrected 2026-09-11: the Stage 0 wording said the library drops raw HTML by
   default. It does not — it escapes it. The plugin is needed because of the sanitizer, not
   because of the parser.)_
3. **A lesson has a real URL: `/lessons/<candidate_lesson_id>`.** Driven by a small history hook,
   not a router dependency. Slice 4's resume point needs a URL to return to, the home list needs
   real anchors to be keyboard-operable, and the screenshot tool can only measure overflow on a
   page it can navigate to.
4. **Selected front-matter facts ship in this slice.** The handoff files them under Rendering, and
   a lesson view without them either dumps YAML above the prose — which §4 forbids by name — or
   hides the author's own `status` caveat, "not yet learner-tested", from the only person reviewing
   it.

## Assumptions (not asked, recorded instead)

- **No syntax highlighting.** The fence's info string becomes a visible label and a `language-*`
  class. Colouring `GET /menu HTTP/1.1` teaches nothing and costs a large dependency.
- **No typographic substitution.** No smart quotes, no dash replacement. The lessons already carry
  the author's own curly quotes; transforming punctuation would alter authored wording, which the
  brief forbids.
- **GFM is admitted whole**, not table-by-table. Strikethrough, task lists, autolinks and footnotes
  are unused by this release but stay enabled — disabling part of the stated target format would
  have a future lesson render its own source. Autolinked URLs pass the same link guard as authored
  ones.
- **The stored Markdown stays canonical.** `content_lesson.source_text` is never rewritten. The
  endpoint serves a derived view of it (ADR 0005, REQ-40).
- **The body is derived server-side.** The importer already located the front matter and the first
  H1; having the client find them again would be a second parser that can disagree with the first.
- **A `mermaid` fence renders as a labelled code block showing the diagram source.** That is
  precisely the labelled text fallback slice 3 owes, arriving early. It is not a placeholder and
  nothing about it is fabricated.

## Acceptance criteria

### R — Block constructs render as themselves

- [x] R1. Paragraphs, ATX headings, `**strong**`, `*emphasis*`, ordered lists, unordered lists,
      nested lists, blockquotes, thematic breaks and inline code each render as their semantic
      element.
- [x] R2. A GFM pipe table renders as a `table` with its header row in `th` cells, not as a
      paragraph of pipe characters.
- [x] R3. A fenced block renders as `pre > code`, carrying its info string as a `language-*` class
      and as a visible label. A fence with no info string renders without a label rather than with
      an invented one.
- [x] R4. The lesson title is the page's only `h1`. A body `##` becomes `h2` and a `###` becomes
      `h3`, so the heading outline never skips a level. A heading the body still carries at level 1
      — a second `#`, which the importer keeps because only the _first_ H1 is the title — renders
      as `h2` rather than putting a second `h1` on the page.

### S — Lesson content is inert

- [x] S1. HTML inside a code fence stays characters. Lesson 3's `html` fences produce zero `h1`,
      `ul`, `li`, `head`, `body` or `title` elements, and their text is visible on the page.
- [x] S2. Inline code containing tags renders as text inside `code` — including the two Lesson 3
      table cells that hold `` `<head> ... </head>` `` and `` `<body> ... </body>` ``.
- [x] S3. Raw HTML outside a fence never becomes an element and is never discarded. A lesson body
      containing `<script>alert(1)</script>` yields zero `script` elements and renders those
      characters visibly.
- [x] S4. No `on*` event handler attribute and no `style` attribute reaches a rendered element from
      lesson content.
- [x] S5. A link target that is not `http:` or `https:` does not become an anchor. `javascript:`,
      `data:`, `vbscript:`, `file:`, `sandbox:`, an author-workspace absolute path and a relative
      path each render as text showing both the label and the target, so nothing is lost and no
      dead or dangerous link ships into navigation (handoff §4, line 108).
- [x] S6. An `http:` or `https:` link becomes an anchor with `rel="noopener noreferrer"` and
      `target="_blank"` — whatever the case of its scheme. A protocol-relative `//host/path` is not
      one of those two schemes and stays text: resolving it against the page's own address would
      turn a scheme-less target into a live off-site link, which is the exact hole S5 exists to
      close.
- [x] S7. An image never becomes an `img`. It renders as a labelled line naming its alt text and
      its source, so no remote embed loads (REQ-18) and no release-relative asset link ships
      broken.

### W — Whitespace and scrolling

- [x] W1. The rendered text of a fence equals, character for character, what the author put between
      the fences — trailing newline included, nothing trimmed and no blank line collapsed.
      Specifically, Lesson 1's `http` request block keeps the blank line after
      `Host: cafe.example`: the line that separates headers from body in HTTP/1.1, and the one a
      trimming renderer silently eats. The fence's language label therefore sits outside the `pre`,
      where it cannot contaminate the block's text.
- [x] W2. Text inside a fence neither wraps nor collapses runs of spaces. jsdom applies no
      stylesheet, so the browser half of this is checked by `tools/screenshots.mjs` reading
      `getComputedStyle(pre).whiteSpace` on a real lesson page.
- [x] W3. A fence wider than the reading column scrolls inside its own box. On every one of the
      five lessons at 375px, `document.documentElement.scrollWidth` does not exceed its
      `clientWidth`. Checked by `tools/screenshots.mjs`, which visits all five lesson pages and
      exits non-zero on overflow rather than printing a warning nobody reads.

### T — Title and front matter

- [x] T1. The lesson's `h1` is the display title stored at import — the first authored H1, never
      the filename — and the body does not repeat it.
- [x] T2. No `---` rule and no YAML text from the front matter block appears anywhere on the page.
- [x] T3. The facts panel shows only these keys, and only when the lesson has them: `audience`,
      `status`, `prerequisites`, `learning_outcomes`, `introduced_concepts`, `runtime_target`,
      `assessment_scope`, `deferred`, `examples`. A key the lesson omits produces no empty section.
      Lesson 1 has `learning_outcomes` and `examples`; Lessons 2–5 have `introduced_concepts`,
      `runtime_target` and `deferred` instead.
- [x] T4. `document_id`, `candidate_lesson_id`, `version`, `module`, `date`, `adapted_from` and
      `exercise_kit` do not appear in the facts panel. Lesson identity and content version appear
      once, in a provenance line of their own.
- [x] T5. A front-matter value that is a list renders as a list; a scalar renders as a line. A value
      of an unexpected shape is shown as its plain text rather than as `[object Object]`.

### A — The endpoint

- [x] A1. `GET /api/lessons/:candidateLessonId` returns the lesson's identity, its selected facts,
      and its body Markdown with the front-matter block and the first H1 line removed. Every other
      line is kept in its authored order.
- [x] A2. An ID that is not in the imported release returns 404 naming the ID.
- [x] A3. When the release was refused, the endpoint answers 200 with `state: "failed"` and the same
      failure body `/api/release` gives, so the page states the named refusal rather than a bare
      "not found" (slice 1, decision 1).
- [x] A4. Serving a lesson changes no stored row. `content_lesson.source_text` still holds the
      authored file's body byte-for-byte.

### C — The reader

- [x] C1. `/lessons/LS-M020-03` shows Lesson 3. The address bar carries it, and the browser's back
      and forward buttons move between the list and the lesson.
- [x] C2. Each title in the home list is a real anchor to its lesson URL — focusable, activatable by
      keyboard, and openable in a new tab.
- [x] C3. A lesson ID that is not in the release says so and offers the way back to the list. It
      does not render an empty lesson.
- [x] C4. Loading `/lessons/LS-M020-03` directly, with no prior navigation, renders Lesson 3.

### D — The real release

- [x] D1. All five real lesson files render without an error, from the bytes on disk.
- [x] D2. Lesson 3 shows its HTML teaching examples as code. The rendered document contains no
      heading element reading "Cafe menu".
- [x] D3. Lesson 2's tables, terminal command blocks and multiline sample output are all present and
      readable (handoff §6, "Inspect Lesson 2").
- [x] D4. Each of the three `mermaid` fences renders as a labelled block showing its diagram source.

## Out of scope for this slice

Mermaid diagram rendering and its safe configuration (slice 3 — this slice ships the labelled text
fallback it will need). Contents list, previous/next, and the resume point (slice 4). Activity
placement (Milestone 2). Notes, saves, export. Lab downloads and copy-exact command buttons
(Milestone 3). Syntax highlighting. A release-relative asset route: no lesson has an asset, and an
unused route would be designed blind.

## Done means

`npm run dev`, open the page, click Lesson 3's title. The address bar reads `/lessons/LS-M020-03`.
The HTML examples are visible as code and no heading reading "Cafe menu" appears on the page. Open
Lesson 1 and find the request block with its header/body blank line intact. Narrow the window to
375px: the code blocks scroll inside themselves and the page does not scroll sideways.

## Slice log

- 2026-09-11. Spec agreed. Stage 0 forks answered by the owner: React elements with no HTML string;
  raw HTML shown as escaped text rather than dropped; a real URL per lesson without a router
  dependency; front-matter facts in this slice rather than deferred.

- 2026-09-11. Built and reviewed. 219 tests across 11 files, plus 14 browser checks against the
  built app and layout checks on 6 routes at 3 widths. test-guardian PRE and POST, `/code-review`,
  design review.

  **PRE failed the first test draft on four findings**, all fixed before any implementation existed:
  the five real lesson files never passed through the server's own body extraction, so a trim or a
  collapsed blank line would have gone unseen; the obfuscated-URL test could not fail, because a
  newline inside a pointy-bracket destination is not a link in CommonMark at all; `exercise_kit` was
  excluded only vacuously, though four of the five lessons carry it; and W2 and W3 were enforced by
  nothing, since `tools/screenshots.mjs` visited only the home page and downgraded overflow to a
  warning.

  **POST found the defect that mattered most.** Reference-style links and images bypassed the guard
  entirely. `[text][ref]` and `![alt][ref]` are `linkReference` and `imageReference` nodes, resolved
  into anchors and images only when mdast becomes hast — after every remark plugin has run. A lesson
  containing `![menu][c]` with `[c]: https://tracker.example/pixel.png` rendered a live `img` and
  loaded it, which is the remote embed REQ-18 forbids; `[x]: javascript:alert(1)` produced an anchor
  whose href the sanitizer then stripped, losing the target text S5 requires to stay visible. Every
  hostile target in the suite had been driven through the inline spelling only, so a guard covering
  half the syntax passed all nine. Links and images are now guarded on the _element_ tree, where
  both spellings have converged; raw HTML stays on the Markdown tree, the only place it exists.

  Two consequences of moving that guard, both improvements: a generated footnote marker keeps
  working rather than being sent to a new tab, and a `#fragment` link survives only when something
  in the lesson actually carries that id — so an authored link to a heading that does not exist
  becomes text naming the target rather than a dead anchor.

  Also fixed from review: `/lessons/%` crashed the whole app, because `decodeURIComponent` throws on
  a malformed escape during render with no error boundary; following a lesson from halfway down the
  list opened it already scrolled past its title and left focus on `body`; the uppercase-scheme test
  did not pin the `rel` and `target` S6 names; the block-level branch of the raw-HTML replacement
  had no test at all.

  **One test assertion changed after PRE approval, deliberately.** It required an uppercase
  `HTTPS://` scheme to survive verbatim in the `href`, which this spec never asked for — S6 asks
  that the link _work_ whatever the case. It was also masking a real defect: `hast-util-sanitize`
  compares the scheme literally and was dropping the `href`, leaving a dead anchor. The scheme is
  now lowered before sanitizing, and the assertion checks the link resolves to the right URL and
  carries its `rel` and `target`. A second change corrected a W1 expectation that was simply wrong
  about CommonMark — verified against the authored bytes, which are
  `GET /menu HTTP/1.1\nHost: cafe.example\n\n`; the trailing newline is the author's, not the
  renderer's.

  **Declined, with reasons:**
  - **`mailto:` stays text.** `/code-review` called its exclusion surprising. The allow-list is
    deliberately two schemes wide, no lesson in the release has a mail link, and widening an
    allow-list on speculation is how an allow-list rots. Revisit when a lesson needs one.
  - **`lessonBodyBelowTitle` still treats unparseable front matter as body**, which would show raw
    YAML. The importer refuses such a lesson by name (release-import criterion B5) before anything
    can store it, and adding a second refusal path inside a pure function that has no way to report
    a named failure would duplicate that guarantee badly.
  - **No heading `id`s, so no contents anchors.** Slice 4 needs them for the contents list and will
    add `rehype-slug` there, where the ids have a consumer.
