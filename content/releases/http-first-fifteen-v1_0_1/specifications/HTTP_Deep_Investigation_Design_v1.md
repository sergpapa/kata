---
document_id: FSSE-HTTP-DEEP-001
version: "1.0.0"
date: "2026-09-18"
status: "Planned reference investigation; student lessons and adapted runnable fixture pending"
module: M021
lesson_ids: [LS-M021-06, LS-M021-07]
---

# Deeper HTTP reference investigation: the notice that stays wrong

## Purpose

Validate that patient explanations can lead into a demanding investigation, not merely a longer introductory lesson. This is an authoring blueprint. Do not publish it as completed teaching or give it to a learner before its prerequisite sequence exists.

## Entry evidence

The learner can trace the simple M020 handler, test positive and negative cases, distinguish a successful response from correct content, and explain a diagnostic comparison. M021-01 through M021-05 must additionally teach selected representations, freshness versus validation, the role of validators, changed/unchanged examples, 304 behavior, conditional HEAD, and the difference between origin output, stored content, and display.

Every rule used by the fixture's condition parser must be taught or supplied as an explicit helper contract. No requirement may depend on memorizing an untaught header grammar. An experienced learner can demonstrate these capabilities using fresh examples and enter the investigation directly.

## Product report

A community notice contains a closing time. An editor changes a field that affects what visitors should see. Some returning visitors keep seeing the previous text. One colleague says the database did not save; another says refreshing fixes it. The supplied incident packet includes a small unfamiliar repository, controlled data, a stated response contract, a reproducible local client, request/response records, and one plausible irrelevant change.

The diagnosis must depend on evidence. Do not name the defective file in the product report. The instructor design seeds a validator derived from an incomplete description of the selected representation: the content changes while the comparison key does not. Keep unrelated caching policies correct so the first incident has one tractable primary cause.

## Teaching and investigation sequence

1. Revisit a correct conditional exchange with changed and unchanged content. Explain each actor's knowledge and choice.
2. Ask the learner to state the invariant in ordinary language: under the supplied contract, a validation decision must not declare a changed selected representation unchanged.
3. Let the learner reproduce the symptom and separate what each observation establishes. Supply reset steps that clear only the exercise state.
4. Build hypotheses before editing. Compare an unconditional response, a conditional response using the old validator, and the data that selects the returned content.
5. Trace the validator calculation and compare its inputs with the content calculation's inputs. Explain which omitted dependency matters and why.
6. Record a failing regression case. Then repair the relationship. Accept any strategy satisfying the declared validator/representation contract and comparison semantics.
7. Test a meaningful unchanged case, a changed case, HEAD behavior, an absent resource, and a relevant selection variant. Reject repairs that always return 200 if the assignment requires correct conditional behavior; explain that disabling validation can be a temporary mitigation under different requirements.
8. Defend the repair, its cost, its assumptions, and the limits of the evidence. Ask the learner to review a tempting incomplete alternative.

## Difficulty and help

The normal investigation combines taught mechanisms and unfamiliar code. It is not Heroic just because the bug is difficult. Hints move from useful comparison to subsystem to a specific diagnostic and finally a full source trace and repair. All are available on request. Preserve useful investigation evidence even if the learner does not finish.

A later fresh task changes the selection rule and cause sufficiently that copying the repair is inadequate. The task is not independent evidence if its full solution was already studied. An optional Heroic extension can introduce a newly documented intermediary condition; disclose the research requirement and keep it outside the core completion gate.

## Acceptance for the future authored package

The fixture must reproduce the stale-content defect, distinguish it from a saving failure, and show the repair passing a previously failing case. Author tests must check the negative and unchanged cases, not just a refreshed visible page. Browser-specific observations require actual browser rehearsal; CLI verification alone is insufficient for those claims.

The learner review should answer: Could the learner explain the mechanism before diagnosing the bug? Did the investigation require reasoning rather than an unexplained trick? Could the walkthrough teach the missed insight? Did the later changed case expose understanding? Record authoring effort and learner friction before scaling this pattern to other advanced subjects.
