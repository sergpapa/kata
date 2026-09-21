---
document_id: FSSE-HTTP-STUDENT-12
version: "1.0.0-draft"
date: "2026-09-18"
module: M021
candidate_lesson_id: LS-M021-04
course_order: 12
status: "Student-facing draft; owner review pending"
prerequisites: ["Explain the changed and unchanged conditional GET in Lesson 11", "Trace conditions and early return from Lessons 6–8", "Read a supplied assertion and run Node tests"]
introduced_concepts: ["If-None-Match lists, wildcard, and weak comparison", "Normal failure precedence", "Conditional HEAD", "A declared parser contract and malformed-input policy", "A case matrix translated into a small decision function"]
learning_outcomes: ["Predict conditional outcomes for the stated retrieval-only lab", "Preserve missing-path and unsupported-method behavior", "Implement and test the status decision from an explicit contract"]
exercise_kit: HTTP_Lessons_09_13_Local_Kit_v1.zip
lab_id: FSSE-HTTP-LAB-09-13
runtime_target: "Node.js 24.x and curl"
assessment_scope: "A bounded conditional-retrieval decision, not full HTTP parser or write-precondition implementation"
deferred: ["If-Match and conditional writes: later API work", "Range requests and negotiated encodings: later HTTP work", "Faulty-validator investigation: M021-06/07"]
---

# Lesson 12: Make the conditional decision precise

The ordinary validation story has two branches: the selected representation matches a tag you supplied, or it does not. Real implementations also need to handle missing resources, different methods, and input forms that are easy to misread.

For example, should asking for a nonexistent notice with a wildcard somehow turn “not found” into “not modified”? Should a POST rejected by this retrieval-only service become a successful cache validation?

We will answer those questions by making the contract explicit. Then you will implement its small decision function using mechanisms already taught. The supplied parser handles the header syntax; its behavior is explained before the exercise relies on it.

## 1. Establish what is being asked before checking the edition

Return to the café's edition-label conversation. A visitor asks whether their copy of the dinner notice still applies. But this café has no dinner notice.

Looking for a matching edition label before establishing that the requested notice exists would confuse two questions. Likewise, a visitor asking to change the notice is requesting a different operation from someone asking to read it.

Our program needs that order of reasoning. First establish the normal request outcome: is the target available, and does this resource support this method? A conditional field does not turn an unrelated failure into a successful retrieval.

HTTP's precondition rules give ordinary failures and redirects precedence over conditional evaluation when the underlying request would not have a successful or relevant precondition-failure result. In this lab, that means a missing API target remains 404 and unsupported POST remains 405. [When HTTP preconditions are evaluated](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.2.1)

We are implementing a bounded retrieval service. Later lessons will teach conditions for updates and their different outcomes. Do not extend today's GET/HEAD decision table blindly to a write API.

## 2. A request may supply more than one tag

So far you supplied one saved tag. If-None-Match can also contain a list. Here is an **illustrative** field:

```http
If-None-Match: "notice-old", "notice-current"
```

For conditional retrieval, any matching tag in the list is enough to take the not-modified path. The condition is not “the whole header text must equal the response's ETag text.” It concerns the individual supplied validators.

Suppose the current tag is `"notice-current"`. Comparing the whole line with that tag would incorrectly report a mismatch because the line also contains `"notice-old"` and a comma. Parsing and comparison have different jobs: identify the list members, then apply the correct comparison to them.

A comma inside a quoted tag is part of that tag, not a separator between tags. That is one reason a general implementation should not simply split this header at every comma. Our supplied helper walks the quoted values and preserves their contents.

## 3. Weak comparison does not mean careless comparison

You may encounter a tag beginning with `W/`:

```http
ETag: W/"notice-current"
```

The marker identifies a **weak validator**. Broadly, weak validation can describe equivalence suitable for some uses without asserting byte-for-byte identity. A strong validator has a stricter relationship to representation data. We will revisit that distinction when byte ranges and transformed representations matter. [Validator comparison rules](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3.2)

For If-None-Match, the specified comparison is weak. For the examples below, compare the opaque quoted value while allowing the weak marker to differ:

| Current tag | Supplied tag | Match for If-None-Match? |
| --- | --- | --- |
| `"notice-A"` | `"notice-A"` | Yes |
| `"notice-A"` | `W/"notice-A"` | Yes |
| `"notice-A"` | `"notice-B"` | No |

“Weak” does not authorize partial text matches, case changes inside the opaque value, or guesses about similar version numbers. The comparison rule remains precise.

Our origin emits strong tags. This exercise still matters because a client can present a weak form in its condition. The helper must apply the requested field's comparison semantics instead of treating the marker as part of an ordinary whole-string equality test.

## 4. Understand the wildcard

The field can also be:

```http
If-None-Match: *
```

The wildcard concerns whether a current representation exists. It is not a quoted tag named star, and it does not mean “compare every character with anything.” In our known GET/HEAD retrieval case, an existing representation leads to 304. A missing target still produces 404 in the normal failure path. [If-None-Match syntax and meaning](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2)

This exposes an important limit in a casual explanation of 304: a client can send a condition without actually possessing the content. A wildcard response does not prove that the client has a usable stored body. The client must still manage its own stored state correctly.

Do not replace the saved-tag experiment with a wildcard and then claim you validated a particular saved edition. Those are different conditions.

## 5. HEAD follows the conditional decision too

You already know that HEAD returns response metadata without a body. Conditional evaluation also applies to HEAD in this lab:

| Known resource | GET | HEAD |
| --- | --- | --- |
| No condition, or a valid nonmatching condition | 200 with content | 200 without content |
| Matching If-None-Match condition | 304 without content | 304 without content |

The body rule and the conditional-status decision are distinct. “HEAD has no body” does not mean every HEAD must be 304. An ordinary unconditional HEAD can correctly be 200.

Likewise, a 404 HEAD remains 404 while omitting its error body. If you check only for an empty body, you cannot determine which decision the server made.

## 6. Know the helper's contract

The lab provides `support/if-none-match.mjs`. You are not expected to invent header grammar from memory. Its comparison function classifies input for an already-selected existing representation:

| Classification | Meaning in this kit |
| --- | --- |
| `absent` | No If-None-Match field was supplied |
| `different` | A valid list contains no matching opaque tag |
| `match` | At least one tag matches under weak comparison, or the wildcard applies to the existing representation |
| `invalid` | The field violates the helper's declared syntax or limits |

These are program labels, not HTTP status codes. In particular, `match` means a matching validator was found. It does not mean that the logical “none match” condition is true.

The parser accepts quoted entity tags, an uppercase `W/` prefix, comma-separated lists, and a standalone wildcard. It tolerates bounded empty list elements and spaces/tabs around members, and preserves commas inside quoted values. Its size limits are documented in the kit README. You can use this helper's stated result without first learning to implement a complete HTTP parser.

Bare text without quotes, an unfinished quoted value, and a wildcard mixed with a list are invalid for this helper. An empty list contains no matching tags. For a known supported retrieval, this application reports malformed input as 400. **That rejection behavior is an explicit lab policy**, not a claim that every HTTP implementation must choose the same recovery for every malformed field.

The main handler performs path/method checks before trying to interpret a condition for a normal failure. That keeps a bad conditional field from converting an already missing target into the wrong kind of result.

## 7. Work through the case matrix

For the coding exercise, assume the representation selection and header parser have already supplied their stated inputs. Your decision function receives a method, whether the target exists, and the condition classification.

| Method | Target exists? | Condition classification | Expected status |
| --- | --- | --- | ---: |
| GET | Yes | absent | 200 |
| GET | Yes | different | 200 |
| GET | Yes | match | 304 |
| HEAD | Yes | absent | 200 |
| HEAD | Yes | different | 200 |
| HEAD | Yes | match | 304 |
| GET | No | match | 404 |
| HEAD | No | match | 404 |
| POST | Yes | match | 405 |
| POST | No | match | 404 |
| GET | Yes | invalid | 400 |
| HEAD | Yes | invalid | 400 |
| GET | No | invalid | 404 |
| POST | Yes | invalid | 405 |

Read one row aloud in full. For example: “A POST to a known API target is unsupported here, so it receives 405 even if the supplied condition would match.” That explanation reveals why the check order matters.

This matrix is a behavioral agreement. It permits several equivalent implementations. It does not require copying a particular arrangement of braces or variable names.

## 8. Implement the small decision

Open `practice/decision.mjs`. The starter currently returns 200 for everything:

```javascript
export function decideResponse(method, exists, condition) {
  return 200;
}
```

This isolated exercise is separate from the correct live server helper in `support/decision.mjs`. Editing the practice file changes what the practice tests load; it does not silently break the running browser lab.

Run:

```sh
node --test checks/practice.test.mjs
```

For the untouched practice file, four of the fourteen cases pass and ten fail. The failing cases show which distinctions the starter does not make. A syntax error or missing file is a different problem from an expected failed assertion.

Use the case matrix to complete the function. You have already used `if`, `return`, `!==`, `&&`, and the boolean negation `!` in earlier lessons. Here `exists` is a boolean, so `!exists` means that the target is absent.

Try your own ordering before reading the worked implementation. Then save and rerun the tests. You may also read the complete answer immediately if the missing connection is blocking your learning.

### Worked implementation

This is a complete replacement for the practice file:

```javascript
export function decideResponse(method, exists, condition) {
  if (!exists) return 404;
  if (method !== 'GET' && method !== 'HEAD') return 405;
  if (condition === 'invalid') return 400;
  if (condition === 'match') return 304;
  return 200;
}
```

Each return finishes the function before a later rule can override it. Once the missing target and unsupported method cases are excluded, the input policy and conditional comparison determine the retrieval outcome.

The final 200 covers both an absent condition and a valid nonmatching condition. The request needs the current retrieval response in either case. The response-writing code separately ensures that HEAD and 304 do not send a body.

All fourteen practice checks should now pass. That does not prove a full server is correct; it checks this function's decision contract. The kit's separate protocol checks exercise the real HTTP response writing and parser paths.

## 9. Connect the matrix back to actual HTTP

Use the correct live server, not the isolated practice function. Restore known data and capture a fresh tag:

```sh
node state.mjs baseline
node state.mjs validate
curl -i --etag-save observations/cases.etag "http://127.0.0.1:4319/api/notice"
```

Run those as separate commands. In PowerShell use `curl.exe`. Open `cases.etag`; it should contain the tag from this new response.

First test conditional HEAD:

```sh
curl -I --etag-compare observations/cases.etag "http://127.0.0.1:4319/api/notice"
```

Expect 304 and no body. Compare it with unconditional `curl -I` on the same URL, which should produce 200 and no body. The condition changed the status; HEAD constrained the body in both cases.

For a weak-tag or list experiment, create `observations/condition.headers` in VS Code. Write `If-None-Match: W/` followed immediately by the complete quoted value copied from `cases.etag`. Then use:

```sh
curl -i -H "@observations/condition.headers" "http://127.0.0.1:4319/api/notice"
```

It should match under the weak comparison rule. Change that file to a valid list containing a different quoted tag followed by the actual tag, and repeat. It should still match. Avoid copying the fictional labels from the earlier teaching examples into an experiment meant to use your actual tag.

Finally, put exactly `If-None-Match: *` in the file and request `/api/missing`. It should remain 404. This is a direct observation of the distinction between a condition on an existing retrieval and a missing target.

The fallback header-file approach from Lesson 11 can also supply the exact tag for curl versions without the ETag options.

## 10. Practice: challenge the tempting rule

### Practice A: condition presence is not a match

An implementation returns 304 whenever the request contains If-None-Match. Which ordinary case would it get wrong? Explain what needs to be compared instead.

### Practice B: matching before checking existence

A proposed function checks `condition === 'match'` before `!exists`. Use one matrix row to show why that order violates this lab's agreement.

### Practice C: a body-free response is not enough evidence

A tool sees an empty body after a HEAD request and concludes that its stored copy was successfully validated. What else must it inspect before drawing that conclusion?

### Practice explanations

For A, a valid nonmatching tag needs the current representation, so a known GET receives 200. Presence alone does not establish equivalence. Parse the supplied condition and compare it with the validator of the selected current representation.

For B, a GET with `exists=false` and classification `match` must remain 404 in the decision contract. Returning 304 first would ignore the normal failure. The real parser is only evaluated for eligible requests; the function still preserves that precedence when tested with supplied inputs.

For C, ordinary HEAD can return 200 without a body, and an error HEAD can omit a body too. Inspect the status, the request's actual condition, and the relevant response metadata. Body absence alone does not identify the branch.

## 11. Prepare to compare viewpoints

You can now explain the cases instead of memorizing “matching tag means 304” without context. Keep your completed practice function and one failing-before/passing-after result.

Next we will inspect a subtle but normal browser behavior: the origin logs 304, while page code receives status 200 and usable content. The apparently conflicting observations become consistent once you distinguish the origin exchange, HTTP cache, and displayed page.
