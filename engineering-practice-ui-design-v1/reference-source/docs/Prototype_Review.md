---
document_id: FSSE-P0-REVIEW-001
version: "1.0"
date: "2026-09-10"
phase: P0
data: synthetic
source_specification: FSSE-APP-001@1.0
---

# Interactive workflow prototype: scope and review

This is a product workflow demonstration, not the P1 learning service. All personas share the same synthetic records in one browser. Scripted reviews are authored illustrations, not AI judgments or qualified human reviews. Typed notes stay in browser storage and should remain synthetic. There are no real uploads, learner accounts, payments, model calls, or external notifications.

## Walk through the learning loop

1. Start in **Learn**. The synthetic profile already marks lessons 1 and 2 studied. Open lesson 3, save a prediction, add an observation and reflection, and mark the lesson studied. The prediction stays separate.
2. Open **Practice**. Read the local exercise brief and download the setup guide. The runnable lab is the separately supplied Representative Learning Package; the prototype is not a replacement lab distribution.
3. Open **Get help**, and request H5. The actual diagnosis is classified H5. A genuinely partial H4 clue is separate. Help changes the same episode to learning mode and remains in later evidence views.
4. Prepare a submission. Select a synthetic implementation, inspect each file, remove a required context file to see the block, restore it, and submit. The synthetic `.env` entry cannot be included.
5. Advance the simulated review twice, or switch to the Reviewer perspective to claim and publish it. Both full representation hashes and controlled revisions are accepted within the fixture's assumptions. A title-only hash is rejected. An unfinished investigation can retain process evidence.
6. Respond, prepare a revision, add a body-only regression summary, and submit again. The earlier source snapshot remains fixed. Both revisions remain one investigation episode.
7. Inspect **Progress** and the fresh-task route. Content completion never awards broad HTTP mastery. Prior transfer exposure remains unresolved or explicitly reported; no fresh assignment is fabricated.
8. Open an appeal and switch to Assessor. A conflict blocks a disposition. A local disposition does not award a target or graduate anyone.

## Staff and recovery routes

The author workspace edits a Markdown candidate independently of the imported lesson content. Its bounded compatibility checks identify the historic H4/H5 issue, one known indicator, a self-dependency, and a required solution reference. Correcting those checks does not establish full graph validation or independent sign-off. Release publication remains gated, and a simulated withdrawal pauses new submissions while preserving old versions.

Use **Explore scenarios** to interrupt a review, revoke its assignment, retry a submission key, or deliver a stale result. A withdrawn record never returns to feedback-ready through these actions. Operations shows identifiers and states rather than submitted source.

Draft-save interruption is a browser-local simulation. Work stays visible until saved or exported. Cross-tab changes cause a conflict banner instead of silently overwriting the other tab. This interaction has not been browser-tested. The export is device-local JSON or Markdown. Clearing the demo resets its stored records; it does not claim server-side deletion or removal of previously downloaded exports.

## Screen coverage

The prototype uses one application route with hash navigation. The P1 paths in the specification will be authenticated server routes; these hashes do not enforce authorization.

| Specification | Prototype view | Depth |
| --- | --- | --- |
| UX-01 | `#/start` | Preparation states; synthetic placement only |
| UX-02 | `#/learn` | Eight imported lessons, resume, studied state, planned curriculum |
| UX-03 | `#/lesson/1` through `#/lesson/8` | Authored explanations grouped by model, technical reality, and limits; one shared HTTP prediction exercise |
| UX-04 | `#/practice` | Brief, tools, setup-guide download, difficulty and mode illustration |
| UX-05 | Get help sheet | H1–H5 disclosure and per-main-episode help |
| UX-06 | `#/prepare` | Synthetic source preview, selection, missing context, variants, explicit demo submit |
| UX-07 | `#/attempt` | Pinned snapshot, queue/review/delay/context/withdrawal |
| UX-08 | `#/reviews` | Scripted findings, source references, alternative implementations, provenance |
| UX-09 | `#/respond` | Response, immutable submission revision, shared episode |
| UX-10 | `#/progress` | Separate content, evidence and target views; no mastery/graduate award |
| UX-11 | `#/fresh` | Exposure and request illustration; no actual assignment/observation |
| UX-12 | `#/appeal` | Separate appeal reason, pinned review identity, simulated disposition |
| UX-13 | `#/account` | Device-local export/reset; real lifecycle requirements described |
| UX-14 | `#/author` | Markdown candidate, inert preview, bounded compatibility examples |
| UX-15 | `#/releases` | Gate ledger, candidate help correction, simulated withdrawal |
| UX-16 | `#/reviewer` | Local queue claim, context inspection/request, scripted publish, revocation |
| UX-17 | `#/assessor` | Evidence eligibility, conflict and appeal outcomes; target award disabled |
| UX-18 | `#/operations` | Redacted queue/events, same-request retry and stale-result simulation |

## Verification performed

`node --test tests/workflow.test.mjs` passes **16 workflow invariant checks**. They cover disclosure classification, prediction preservation, duplicate/conflicting submission keys, immutable snapshots, episode/help continuity, withdrawal and revocation races in the local state model, recovery identity, allowed source context, valid alternatives and near misses, unresolved process evidence, exposure, bounded author validation, conflicted appeals, preparation/release blocks, and context-revision behavior.

TypeScript compilation (`tsc --noEmit`) passes. The standard production build completes. These are source/state checks, not a live multi-user authorization or browser acceptance result. The simulator keeps an exact serialized payload comparison for idempotency; this is not a server-verified cryptographic digest.

Browser interaction, screenshots, mobile reflow, keyboard/zoom/screen-reader journeys, cross-tab conflict UX, real upload inspection, observed WebMCP registration/execution, Docker operation, concurrency across servers, backups/deletion, load measurements, qualified review, and learner trials remain **unverified**. No complete AC-01–AC-24 scenario is marked passed solely from these local checks.

## Deliberate P0 boundaries

- State is browser-local; role switching is not authentication or a security boundary. Source is not protected from another persona in the same demo.
- The full sample lesson and help data are delivered to the browser. This prototype cannot protect assessment secrecy or establish fresh independent performance. It records visible help selections; it cannot observe source inspection or external exposure.
- All attempts belong to one synthetic main episode. The same help maximum is shown for that scope. Production requires separate episodes, indicator-level disclosure scope, event timing, and review/decision recomputation policies.
- There is one shared prediction exercise, not a distinct interaction for every lesson. The imported Markdown is displayed inertly using a small renderer; complex source tables remain textual and relative source links are not clickable.
- Review findings are selected from authored fixture branches. Edited investigation notes require real review rather than a length-based competency heuristic. Test-summary checkboxes illustrate evidence selection, not runtime verification.
- Appeals and responses are separate fields. Production requires append-only review, response and adjudication revisions; a demo disposition does not rewrite an original finding or authorize a competency decision.
- Native file/JSON ingestion, authenticated downloads, logical job leases, actual provider retry budgets, program-wide graph validation, supported-device evidence, and approved data policies belong to P1 implementation and its gates.
- Optional browser tools `read_learning_workflow` and `open_http_lesson` are feature-detected. No permitted supported WebMCP test context was used, so runtime validation remains pending. These tools do not expose solutions, submit work, or award decisions.

## First product review questions

Can a learner explain what is still missing after a helped correct repair? Can they distinguish a response from a new submission? Does a missing-context request feel actionable? Can staff see why a valid alternative satisfies the contract? Do participants understand that getting an explanation is learning, while independence needs separate evidence?

Use those questions during the next keyboard/accessibility and learner/staff workflow rehearsals. Record observed failures before changing the specification or treating a screen as validated.
