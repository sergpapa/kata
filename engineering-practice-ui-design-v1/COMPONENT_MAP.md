# Where the implemented design lives

The original screen functions share `reference-source/components/workspace.tsx`. Many are written compactly; use the function names below to navigate them in the editor. Local primitive imports are included under `reference-source/components/ui/`.

| Surface | Function or source | Main styles / primitives | Integration note |
| --- | --- | --- | --- |
| Product sidebar and navigation | `Nav` | `.brand`, `.brand-mark`, `.nav-button`, `.sidebar-course`; Sidebar, Progress | Bind to real routes and current release counts; omit demo-perspective controls |
| Outer shell and header | `Workspace` | `.workspace`, `.topbar`, `.breadcrumbs`, `.page-content`, `.skip-link`; SidebarProvider, SidebarInset | Reuse the presentation; preserve the target router, persistence, and authentication |
| Page headings | `PageTitle` | `.page-title`, `.eyebrow`, `.lede` | Match hierarchy and action placement |
| Dashboard and course list | `Learn` | `.overview-grid`, `.continue-card`, `.lime-button`, `.unit-card`, `.lesson-list`, `.lesson-row` | Replace the old eight-lesson and bulletin examples with current content |
| Preparation view | `Start` | `.two-columns`, `.card`, `.checklist` | Present only setup and readiness behavior the target actually supports |
| Lesson workspace | `Lesson` | `.reader-grid`, `.lesson-reader`, `.reader-aside`, `.prediction-card`, `.reading-footer` | Keep the new ordered Markdown reader and activity-scoped records |
| Help panel | `HintPanel` | `.wide-sheet`, `.sheet-body`, `.hint-list`, `.hint-step`; Sheet | Use only appropriate current explanations and actual help behavior |
| Exercise and local work brief | `Practice` | `.terminal-panel`, `.heroic-card`, `.numbered-list`, `.button-row` | Current labs come from the first-five release |
| Source selection preview | `Prepare` | `.preview-grid`, `.file-picker`, `.file-row`, `.source-preview`, `.submit-bar` | A visual reference for a real submission implementation |
| Empty and waiting states | `EmptyAttempts`, `AttemptStatus` | `.empty-state`, `.status-card`, `.status-symbol` | Show real state and useful next actions |
| Review findings | `Review` | `.review-summary`, `.evidence-stamp`, `.finding-list`, `.finding`, `.review-history` | Keep this layout only with actual feedback or explicit empty states |
| Responding to feedback | `Response` | `.two-columns`, `.card`, `.button-row`, textarea rules | Preserve real revision history and saving |
| Study and evidence view | `Evidence` | `.metric-grid`, `.metric`, `.metric-text`, `.compact-dl` | Study counts and demonstrated competence remain distinct |
| Notices and badges | `Note`, `Pill` | `.note`, `.pill` and their warning/success variants | Use concise learner-facing text |
| Confirmation | `Confirm` | AlertDialog, Button | Reuse for relevant real operations; do not add demo actions |
| Account/data view | `Account` | `.card`, `.button-row`, `.compact-dl` | Bind to the target's real export and account behavior |
| Staff surfaces | `Author`, `Release`, `Reviewer`, `Assessor`, `Operations` | Shared cards, tables, notes, status treatments | Included as original design references; not evidence these capabilities exist in the target |

## Included primitive dependency chain

The export includes Button, Tabs, Sheet, Checkbox, Select, Progress, Table, AlertDialog, Sidebar, Input, Separator, Skeleton, and Tooltip. It also includes `hooks/use-mobile.ts` and `lib/utils.ts`, which these components use.

`source-provenance.json` lists every local import relationship and copied source hash. `design/dependency-inventory.json` lists the external imports and their original declared/locked versions.

## Source that should not become the new teaching engine

- `Inline` and `Markdown` are the old limited renderer. They do not satisfy the current table/diagram and ordered-content requirements.
- `lib/workflow.ts` contains demonstration state transitions and scripted review logic.
- `lib/lessons.json` contains the old eight-lesson content.
- `Workspace` includes demo scenarios, role switching, local storage, and optional prototype tool registration.

These files are preserved to make the existing source understandable. Extract or refactor the presentation around the current application's data and content interfaces.
