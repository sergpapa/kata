# Authoring handbook

Read this before writing or revising any lesson. Lessons used to come from an external author, a
ChatGPT project the owner worked with in September 2026. That tool stopped working in November 2026,
and authoring now happens in this repository. This handbook keeps what the owner told that author,
in the owner's own words, where the release specifications only paraphrase it. The full transcript
is in [history/2026-09-external-author-conversation.txt](history/2026-09-external-author-conversation.txt).
It is a byte-for-byte copy of the owner's salvaged export.

## What governs a lesson, in order

All of these sit under `content/releases/http-first-fifteen-v1_0_1/specifications/`.

1. **`Lesson_Authoring_Standard_v1.md`** (FSSE-AUTHOR-001 1.1.0) is the quality contract. §10 is the
   publication checklist and §11 holds the instructions for an AI author or reviewer.
2. **`Curriculum_Depth_and_Progression_Map_v1.md`**: the row for the lesson being written.
3. **The previous canonical lesson and the lab contract** it builds on.
4. **`Curriculum_Architecture_v1_1.md` and `Graduate_Competency_Standard_v1.md` (1.1)** set coverage
   and outcome boundaries.
5. **This handbook** supplies the owner's voice behind the rules.

If this handbook and the standard disagree, the standard wins. Put the disagreement to the owner.

## The owner as a reader

The owner is the first learner. For now this is a personal project. In the owner's words, after
Lessons 1–4:

> I do have knowledge and experience in many of these concepts and have worked in a number of
> application. On the other hand, there are many of these concepts that my interaction is purely
> practical and I am missing even the basic understanding behind it. So, I enjoy our dissection and
> how we explain everything.

The course itself is written for a motivated beginner with basic computer literacy, not a junior
developer (`Learning_Design_Review_and_Curriculum_Refinement_v1_1.md`, line 30). The owner's worry
after Lessons 1–4 was that the content was "very junior level", and the question was whether
deeper lessons were really planned. The agreed answer still holds. Keep the patient style all the
way through. Depth comes from more accurate models, interacting mechanisms, hard failure cases and
consequential decisions, never from denser terminology. Show each subject's destination at its
start.

## What the owner rejected, verbatim

The first draft of Lesson 1 was rewritten after this review. Every point is now a rule in the
standard's §4–§5. The wording shows what the owner reacts to.

- **On an analogy that only renames things:** "This is not a personable analogy. We do not create
  a mental image for the student nor we explain the system. We just use other words for it." The
  owner wants a familiar experience anyone has lived through, and "we also need to explain the
  analogy not just state 'this is like that'".
- **On the bridge to the technical part:** "we can use pieces of the simple explanation to make the
  connection stick to the brain of the student."
- **On a compressed technical explanation:** "it looks more like a quick summary than trying to
  explain to someone what it is."
- **On a term used without teaching it:** "how am I supposed to know what a 'bulletin data' is."
- **On an advanced 'where it breaks' section too early:** "the student is definitely not the level
  to understand it like this."
- **The instruction:** "explain more (don't be afraid to make it more verbose), give examples,
  analyse, make simple, diagramms etc". Read "verbose" as more causal explanation, not more new
  concepts at once (`Learning_Design_Review_and_Curriculum_Refinement_v1_1.md`, line 101).

## What the owner liked

The rewritten Lesson 1 drew "this is much cleaner". After Lessons 1–4: "I really enjoyed the
content. I liked how it is structured and the way the analogies and examples are worked within the
lesson." The café scene that opens Lesson 1 v2 and carries into Lesson 2 is the reference for a
developed analogy.

## Commitments that came from the owner

- **Real professional tools.** The owner called this "the most important finding": "We DEFINATELY
  want the student to use professional tools and learn and experiment/work with real versioning,
  docker, databases, kubernetes, cloud infrastructure and more."
- **Work happens locally in VS Code.** The platform reviews learner code and never executes it.
- **Exercises that resemble real work:** "errors, debugging, understanding code that was not
  written by them, project structure gone wrong, security defects (maybe try to break the security
  of this zyx that is not configured correctly - like a hacking excersice)".
- **Levels from easy to heroic.** The heroic level is "punching above the weight of the student".
  Research and experiment are expected there, failure is allowed, and the owner said "we are not
  keeping secrets". That is why full walkthroughs are always reachable (standard §8).
- **An exhaustive course with comprehensive assessment.** Graduation rests on demonstrated
  competence, not completed content (the Graduate Competency Standard).
- **Markdown everywhere**, "for better AI consumption".

## Owner reviews on record

The only owner verdict on teaching quality covers **Lessons 1–4**, and it is positive. App
integration produced two corrections, CF-001 and CF-002, which were accepted in `1.0.1-draft`
(`docs/content-feedback.md`). Each package shipped an `Owner_Review_After_Lesson_NN.md` form for
Lessons 5, 8, 13 and 15. No completed form is in the transcript or in this repository. Lessons 5–15
pass the written standard's checks, but the owner has not read them (confirmed 2026-11-03). The
bar for any new lesson is therefore Lessons 1–4. The first in-house release is likely to be
corrections to Lessons 5–15 from the owner's reading, not Lesson 16.

## How authoring works now

Before: the owner relayed between the external author and the VS Code coder. The author shipped a
cumulative release zip, the coder imported it, and findings went into the content feedback register
for the author's next reissue. From now on, the steps below apply. ADR 0013 records the move.

- **The output is still a cumulative release package** under `content/releases/`, in the same
  format: `learning-release.json`, `trial-activities.json`, lab zips with manifests, and
  `package-verification.json`. App code never edits lesson content (ADRs 0005 and 0009). Findings
  still go into `docs/content-feedback.md` and are fixed by a reissue.
- **Write and review in separate sessions.** The reviewer reads only the standard, the depth-map
  row, the previous lesson and the draft, with none of the drafting conversation.
- **The owner's review decides acceptance.**
- **Model.** The strongest available model designs and writes lessons (Fable 5.2 on 2026-11-19).
  A session on a weaker model proposes the switch before drafting anything. Sonnet 5.5 can do
  mechanical packaging (hashes, manifests, re-running kit tests). The owner set this on
  2026-11-19, replacing the 2026-11-03 agreement that Opus 5.5 writes and Fable is the fallback.
- **Checks the old author could not run.** These are now required: parse and render every Mermaid
  block with the app's pinned Mermaid 11.17.2 in real Chromium, rehearse in a real browser, and run
  kits natively on Windows. Kits target Node 24. Use nvm's Node, not Anaconda's v22.

## Reissuing a release

Every correction or new lesson ships as a new cumulative release built by the packaging tool
(`docs/specs/release-packaging.md`, `docs/specs/release-additions.md`). Nobody edits a hash by
hand. Each course has its own editable source: the QA course's is `content/source/qaae/`, seeded
on 2026-11-19. The full-stack course has none yet.

1. Once per course, seed the editable source from its current release, for example
   `npm run release:seed -- content/releases/http-first-fifteen-v1_0_1 content/source/fsse`.
2. **Starting a reissue**, set `previous_release` in the source's `release.json` to the current
   release, if it does not point there already. It stays on the superseded package between
   reissues, because a test rebuilds each current release from its source
   (`apps/server/src/authoring/realQaaeSource.test.ts`).
3. Edit `lessons/*.md`, the kit folders under `labs/<archive>/<folder>/`, or
   `trial-activities.json`. Never put a lesson copy inside a kit folder: the build injects it. Never
   run a kit inside the source tree either: the build refuses a kit folder that holds
   `node_modules` or a folder its `.gitignore` names. Run a copy.
4. **Adding a lesson** means adding its file and listing it in `release.json` `lessons` at its
   course position. **Adding a kit** means adding `labs/<archive without .zip>/<top folder>/` with a
   `manifest.json` (its `lab_id`, `version` and an empty `files` list) and listing it in
   `release.json` `labs`. Removing either is refused.
5. Move every version the edit touches: the lesson's front-matter `version`, each of its
   activities' `lesson_version`, the version in the manifest of the kit that carries it, and
   `release.version` and `release.date` in `release.json`. Also rewrite `release.status` and the
   package documents under `package/`. The build carries them as written.
6. `npm run release:build -- content/source/<course> content/releases/<new package name>`. It
   refuses anything inconsistent by name and prints exactly which lessons and kits changed or
   were added.
7. Follow the printed make-current steps 1 to 3. Leave step 4, `previous_release`, for the start of
   the next reissue (step 2 above). Update the release path in the test that rebuilds the course's
   release from its source.
8. Check what the tool does not: render the changed lessons' Mermaid blocks in the app
   (`npm run screenshots`), and run the changed kits' own tests.

## Lessons from the old loop

- **Name the changed bytes.** The owner's last message went unanswered. They had checked the 14–15
  package, found Lesson 2 unchanged (SHA-256 `38a49d31…`, semicolon still present), and wrote "I
  though you made changes based on the review and finding s". The fix only existed in the separate
  `1.0.1-draft` reissue, which is what the app now imports. Every release must list which lesson and
  kit hashes changed, so the owner can verify without guessing.
- **Keep work in git.** The old tool could not save files ("the Library skill encountered an
  authentication error"), so every artifact survived only as a download.
- **Keep claims honest.** The old author named what it ran and what it could not run, and never
  presented authored transcripts as learner evidence. Keep doing that.

## Next content

From `Release_Status_and_Sequence.md` and the depth map:

| Order | ID                 | Subject                                                                       | Test it must pass                                   |
| ----- | ------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------- |
| 16    | M021-08            | Review, justified disagreement, revision                                      | Can another engineer verify the reasoning?          |
| 17    | M021-09            | Fresh transfer under a changed selection rule                                 | Was a relationship learned or an answer remembered? |
| 18–20 | M021-10 to M021-12 | Origins and cookie scope, cross-origin access, redirects and cache boundaries | Planned, not yet specified at lesson level          |
