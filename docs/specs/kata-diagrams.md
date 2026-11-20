# Spec — Kata diagrams, slice 1: sequence diagrams, QA Lesson 1

Status: in progress, started 2026-11-20.

## Why

Mermaid decides every coordinate of a lesson diagram. A sequence diagram puts its participants in
one row and widens each gap to fit the longest label in it, so sentence-long labels push the last
participant out of the frame. The frame shows the drawing at its natural size and scrolls
(ADR 0008), the colours are Mermaid's stock theme, and the screenshot gate only fails a drawing
smaller than 100×100px. "What a program receives" overflows even at 1440px.

A Kata diagram is data, not a drawing. The author writes what the diagram says in a
`kata-diagram` fence, and a trusted component draws it from the page's own elements and tokens.
ADR 0005 and ADR 0008 both name this as the way to get a richer diagram: "a versioned trusted
component with its own content schema". ADR 0025 records the decision.

## The owner's decisions (2026-11-20)

- Replace all 15 diagrams, starting with QA Lesson 1 as this slice.
- **The Mermaid version stays in the lesson as the fallback only.** The Kata diagram is shown at
  every width. Mermaid is drawn only when the Kata diagram cannot be drawn. Mermaid on phones was
  offered and declined: Mermaid draws this sequence about 1,100px wide.

## Format

A fence whose language is `kata-diagram` holds one JSON object. Version 1 knows one kind:

```json
{
  "kind": "sequence",
  "participants": [
    { "id": "runner", "label": "Test runner", "note": "your test code" },
    { "id": "browser", "label": "Browser tab" }
  ],
  "steps": [
    { "phase": "Open the page" },
    { "from": "runner", "to": "browser", "say": "Open the rooms page" },
    { "from": "browser", "to": "runner", "say": "Yes", "reply": true },
    { "from": "runner", "to": "runner", "say": "Record a pass", "highlight": true, "note": "…" }
  ],
  "caption": { "lead": "One run.", "text": "…" }
}
```

A step is either a phase marker (`phase`) or a message (`from`, `to`, `say`, and optionally
`reply`, `highlight` and `note`). A message whose `from` equals its `to` is a step a participant
takes on its own.

## Acceptance criteria

### Reading the fence

- **KD1** A `kata-diagram` fence must hold one JSON object. Text that is not JSON is refused with
  the JSON parser's own message.
- **KD2** `kind` must be `"sequence"`. Any other kind is refused, and the reason names the kind it
  found.
- **KD3** A sequence has 2 to 5 participants, each with a unique non-empty `id` and a non-empty
  `label`, and an optional non-empty `note`. It has at least one message step. `from` and `to` must
  name participants. `say`, `phase`, `note`, `caption.lead` and `caption.text` must be non-empty
  strings; `reply` and `highlight` must be booleans. A key the format does not know is refused, so
  a typo such as `"labl"` is not silently ignored.
- **KD4** Every refusal names where the problem is as a JSON path and what is wrong, for example
  `steps[3].to: "sitee" is not a participant (runner, browser, site)`.

### Drawing it

- **KD5** A valid fence is drawn from real elements in the lesson's own document: no iframe and
  no HTML string. Every participant label and note, every step's text and note, every phase label
  and the caption are text in the page, so they can be selected and found with Ctrl+F.
- **KD6** Steps are an ordered list in the authored order, numbered from 1 across phases. Each
  phase is a labelled group. Each message step says in text who sends it to whom ("Test runner →
  Browser tab"), and a step a participant takes on its own says so ("Test runner, on its own").
- **KD7** A reply says "(reply)" after its sender and receiver and is drawn with a dashed line. A
  highlighted step says "Key step" in its text and is marked by a heavier line and a marker beside
  its number, never by colour alone. A step's `note` is shown under its text.
- **KD8** The caption, when present, is shown under the diagram with its lead in bold.
- **KD9** Colours come only from the theme's custom properties. The diagram stylesheet contains no
  colour literal (no `#hex`, `rgb(`, `hsl(` or named colour).

### Fitting the column (checked in real Chromium by `npm run screenshots`)

- **KD10** At 1440, 768 and 375px, in both colour schemes, the Kata diagram is no wider than the
  lesson column and nothing inside it scrolls sideways. The gate fails otherwise.
- **KD11** Where the diagram's box is wide enough, participants are columns with lifelines and each
  message is an arrow between them with its label above. Where it is not, each step is one row: its
  number, "sender → receiver", and its text. The switch is a container query on the diagram's own
  width, so it follows the column rather than the window.
- **KD12** Step text meets 4.5:1 contrast against the diagram's background in both schemes.

### Its place in the lesson

- **KD13** A `mermaid` fence that directly follows a `kata-diagram` fence, with only blank lines
  between them, is that diagram's **fallback**. The pair counts as one diagram when diagrams are
  numbered.
- **KD14** When the Kata fence is valid, its fallback draws nothing and adds nothing to the page,
  so a lesson whose only Mermaid fence is a fallback never loads Mermaid.
- **KD15** When the Kata fence is refused and has a fallback, the fallback is drawn exactly as a
  Mermaid diagram is drawn today. A closed disclosure, "Why this diagram is shown in its fallback
  form", holds the refusal reason.
- **KD16** When the Kata fence is refused and has no fallback, the page behaves as it does for a
  Mermaid diagram it cannot draw: a status notice saying the diagram could not be drawn, the fence
  as a labelled source block, and the reason in a closed disclosure.
- **KD17** A drawn Kata diagram is a region named "Diagram <n>: Sequence diagram" plus the place
  suffix rendering already uses, and it is described by the "In words:" paragraph that follows the
  pair (or follows the Kata fence, when there is no fallback). Its source is kept behind a closed
  "Show diagram source" disclosure, as for Mermaid.

### QA Lesson 1

- **KD18** QA Lesson 1 §6 carries a `kata-diagram` fence directly before its existing Mermaid
  fence. Its messages are the Mermaid fence's messages: same senders, receivers, text and order,
  with replies where Mermaid uses `-->>`. The Mermaid fence and the "In words:" paragraph are byte
  for byte unchanged.
- **KD19** The change ships as the cumulative package `content/releases/qaae-q02-v1_0_1`
  (`QAAE-Q02@1.2.1-draft`), built by `npm run release:build`. Only Lesson 1 (`LS-Q01-01`) and its
  activities change. The QA course is served from the new package.
  As the handbook's reissue step 2 says, `previous_release` in `content/source/qaae/release.json`
  moves to `qaae-q02-v1` first, so the build reports 1.2.0-draft → 1.2.1-draft.
- **KD20** The screenshot gate declares QA Lesson 1's diagram as `kata`: one Kata diagram, no
  diagram frame, no refusal notice, KD7, KD10, KD11 and KD12 checked, and a capture of the diagram
  saved at every width and scheme.

### What the gate reads

`tools/kata-diagram-checks.mjs` measures the page, so it needs names. These are the contract
between the component and the gate: `.kata-diagram` is the drawn diagram, inside `.lesson-body`.
Each step is an `li` that carries `data-reply` or `data-highlight` when it is one, and holds
`.kd-who` (sender → receiver), `.kd-say`, `.kd-note`, `.kd-key` (the key-step marker) and
`.kd-arrow` (visible only in the column layout). Phases label themselves with `.kd-phase-label`,
participants with `.kd-participant-label` and `.kd-participant-note`, and the caption is the
`figcaption`.

The reader (`readKataDiagram`) returns phases as `{ kind: 'phase', label }` and messages as
`{ kind: 'message', … }` with `reply` and `highlight` defaulted to `false`.

## Assumptions (defaults taken, not asked)

- **JSON, not YAML.** The `yaml` package costs 30.5 KB gzipped (measured with esbuild), a 22%
  increase on a 138 KB entry chunk, or an asynchronous load and a pending state for every diagram.
  JSON parses synchronously with nothing added.
- **Existing tokens only.** A highlight uses `--primary`; lines use `--muted-foreground` and
  `--border`. No new theme token, so no new contrast pair for `theme.test.ts`.
- **The architect agent is skipped.** The change is local to the web renderer and its decision is
  recorded in ADR 0025.

## Not in this slice

- The other 14 diagrams, and the flowchart kind (`"kind": "flow"`) eight of them need.
- Refusing a bad `kata-diagram` fence at `release:build` time. That needs the reader shared
  between the server and the web app, which have no shared package yet. Until then the screenshot
  gate is where a refused Kata diagram fails.
- A fit check for the Mermaid diagrams that remain. They still scroll inside their frames.
- Export: it carries learner responses, not lesson bodies, and is unchanged.
