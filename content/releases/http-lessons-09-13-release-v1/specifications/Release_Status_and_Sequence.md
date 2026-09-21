# Current authored sequence and specification authority

Version: 1.0.0-draft. Date: 2026-09-18.

The existing curriculum depth map and lesson authoring standard remain in force. This update advances five planned M021 lessons into authored candidates; it does not redesign the course or lower its target competence.

| Course order | Module lessons | Current status |
| --- | --- | --- |
| 1–8 | M020-01 through M020-08 | Authored sources and original lab archives retained unchanged |
| 9–13 | M021-01 through M021-05 | Newly authored student drafts, exercises, worked explanations, and local kit supplied |
| 14–15, planned | M021-06 and M021-07 | Deep validator investigation and transfer exercise designed, not authored or shipped here |
| Later progression | Subsequent HTTP, backend, security, infrastructure, and reliability modules | Follow the existing curriculum map; inclusion in a map does not mean content exists |

The first five M021 lessons now teach the prerequisites for investigating a faulty validator: identity, selected representations, fresh reuse, conditional validation, normal failure precedence, comparison cases, and origin/browser/page observations. The following investigation should reduce scaffolding and require reproduction, hypothesis testing, a justified fix, regression evidence, and an explanation of why bypassing the cache is insufficient.

Rate limiting and attacks/defences remain part of the planned course, taught after the required request, trust, identity, resource-budget, and state mechanisms. This release does not claim to teach them merely because they are related to HTTP. Preserve the map's earlier introductions and later deeper implementations and incidents.

## Reading authority

1. `content/learning-release.json` determines the lessons actually shipped and their order, versions, IDs, hashes, and lab associations.
2. The matching Markdown is the canonical student content; `trial-activities.json` supplies recording metadata without duplicating the prose.
3. This document updates authored status where older specification snapshots still say “planned.”
4. `Lesson_Authoring_Standard_v1.md` governs teaching quality. The depth map and curriculum architecture govern coverage and prerequisites. The graduate competency standard governs the outcome boundary.

The six inherited specification files are retained unchanged to make provenance explicit. Their historical status statements are not evidence that additional content has been delivered. The broader course aims at strong independent mid-level performance with advanced challenges; neither these guided lessons nor a lesson-completion percentage establishes a senior-level qualification.
