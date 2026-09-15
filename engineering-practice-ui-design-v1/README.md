---
document_id: FSSE-UI-DESIGN-001
version: "1.0.0"
date: "2026-09-11"
purpose: "Export the implemented Engineering Practice visual UI for integration into the owner's VS Code application"
source_revision: "5f9d8eb737281be0b84610b44e4b0a73374c9a65"
status: "Original source and visual design reference; integration into the separate application is pending"
---

# Engineering Practice: original UI design export

This archive contains the actual visual implementation behind the owner's **image 1**: the navy sidebar, light workspace, indigo cards, lime primary action, course navigation, and learning dashboard. It is a companion to `VS_Code_App_and_First_Five_Lessons_v1.zip`.

Give both packages to the VS Code coder. This package establishes the visual reference; the first-five package remains the source of current lessons, content import, and application behavior. The active learning release remains `FSSE-HTTP-FIRST-FIVE` with lessons `LS-M020-01` through `LS-M020-05`.

## Start here

1. Read this file, then [DESIGN_SPECIFICATION.md](DESIGN_SPECIFICATION.md).
2. Read [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md) before copying any original component into the application.
3. Use [COMPONENT_MAP.md](COMPONENT_MAP.md) to locate the implemented shell, dashboard, reading area, controls, and responsive styles.
4. Inspect [the original screenshot](assets/original-ui-reference.png) alongside the exact source in `reference-source/`.

The screenshot is supplied by the owner and copied unchanged. It includes surrounding ChatGPT/window chrome and a cropped viewport. Reproduce the learning application's design; the surrounding black frame, Visit/Share controls, and cropped conversation at the left are not part of the product.

## What is included

| Location | Contents and use |
| --- | --- |
| `reference-source/components/workspace.tsx` | Original implemented screens and layout, copied without edits |
| `reference-source/components/ui/` | The 13 primitive components used directly or transitively by that UI |
| `reference-source/app/globals.css` | Complete original theme, component styles, and responsive rules |
| `reference-source/hooks/` and `reference-source/lib/utils.ts` | Local helpers used by the components |
| `reference-source/public/favicon.svg` | Original favicon |
| `reference-source/vendor/` | Original vendored component CSS and its license |
| `design/theme-tokens.css` | Plain CSS copy of the original custom properties and font stacks |
| `design/design-tokens.json` | Machine-readable colors, typography, component declarations, and breakpoints |
| `design/dependency-inventory.json` | Imported packages and versions observed in the original manifests |
| `assets/original-ui-reference.png` | The owner's visual reference |
| `source-provenance.json` | Exact source revision, copy hashes, and local import relationships |
| `third-party-licenses/` | License files copied from the installed dependencies used by this source |
| `export-manifest.json` | Final archive contents and integrity checks |

## Read the source as a reference

The original `workspace.tsx` mixes presentation with prototype state. Its historical `lib/workflow.ts` and `lib/lessons.json` are included so its imports and screen states remain understandable. They are **reference-only**. They do not replace the current five lessons, saved work, review pipeline, or content renderer.

The original package manifests document the source environment. This is a design-source export, not an independently bootable application distribution. Hosting scripts, deployment configuration, environment files, database code, installed packages, and compiled output are outside its scope. Integrate the UI into the existing working application and use that application's commands.

## Instruction for the VS Code coder

> Apply the visual design in this package to the existing five-lesson application. Read DESIGN_SPECIFICATION.md, INTEGRATION_GUIDE.md, and COMPONENT_MAP.md, and use the original components and stylesheet as the implementation reference. Restore the recognizable sidebar, light workspace, dashboard, lesson cards, typography, and primary action. Bind the UI to the current release and actual learner records. Preserve the complete ordered Markdown lessons and lesson-specific activity fields. Keep technical IDs and release diagnostics in details or administrative views. Reuse the target application's working persistence and navigation. Do not replace them with the original prototype's eight lessons, synthetic reviews, persona switching, local demo state, or three teaching tabs. Verify the integration checklist and report what you actually checked.

## Export verification

The original source files and reference screenshot are copied byte-for-byte. Local imports are included, the dependency inventory is grounded in the original lockfile, and the archive has been checked for integrity. [VERIFICATION.md](VERIFICATION.md) records the exact scope.

No website was modified or redeployed to create this export. Its integration into the VS Code application still needs the coder's implementation and browser review.
