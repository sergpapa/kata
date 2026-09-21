# Content feedback for the release owner

Disposition recorded 2026-09-21. The two entries supplied by the implementation review are accepted in FSSE-HTTP-FIRST-FIFTEEN@1.0.1-draft. This register preserves exact original/proposed wording; it does not claim that a deployed app has already imported the release.

| ID | Lesson | Kind | Decision | App acceptance |
| --- | --- | --- | --- | --- |
| CF-001 | 2 | Diagram — breaks | Accepted and applied in reissue 1.0.1-draft | Import corrected release and confirm rendering |
| CF-002 | 7 | Teaching | Accepted and applied in reissue 1.0.1-draft | Confirm “Before you start” shows Lesson 6 |

## CF-001 — Lesson 2 sequence diagram

File: `content/lessons/HTTP_Lesson_02_Student_Edition_v1.md`, section 10, message line 425 in the current source snapshot. The submitted review cited line 418; the exact message text was used to locate the change rather than relying on that line number. Stable lesson: LS-M020-02. Reported found: 2026-09-11, Milestone 1 slice 3.

Exact original:

```text
    Server-->>Terminal: Stopped; the file remains
```

Exact accepted replacement:

```text
    Server-->>Terminal: Stopped, the file remains
```

Reason: a raw semicolon separates Mermaid sequence statements. The comma retains the intended meaning. The implementation review supplied the original parser error and reported a successful corrected render at 969.5 × 704; that result is reviewer-reported, not a new measurement in this reissue.

Until the app imports the reissue, its existing fallback may continue to show source and the parser explanation. The correction changes the canonical lesson and its bundled lab copy, not the app's renderer.

## CF-002 — Lesson 7 prerequisite

File: `content/lessons/HTTP_Lesson_07_Student_Edition_v1.md`, line 10 in the prerequisite list. Stable lesson: LS-M020-07. Reported found: 2026-09-21, Milestone 1 slice 5.

Exact original:

```text
  - "Follow path/method conditions, helper calls, and return in LS-M020-06"
```

Exact accepted replacement:

```text
  - "Follow path/method conditions, helper calls, and return in Lesson 6"
```

Reason: this prose is shown to the learner in “Before you start.” The stable identifier belongs in structured metadata, while the learner recognizes the course's displayed lesson number. The metadata identity itself is retained.

Until the app imports the reissue, its facts panel may show the original ID. The app should continue to display authored wording rather than rewriting it independently.

## Release consequences and future entries

Both corrections have updated lesson versions, canonical hashes, nested lesson copies, affected kit versions and hashes, current activity-version references, release metadata, and package integrity records. See `content-corrections.json` for exact hash transitions. Runtime code is unchanged; historical author execution reports are retained with their original dates.

The next feedback ID is CF-003. Preserve the same original/proposed/reason/reader-impact structure. Future changes should be applied through a versioned current release; never silently change a content-addressed source or rewrite historical learner evidence.
