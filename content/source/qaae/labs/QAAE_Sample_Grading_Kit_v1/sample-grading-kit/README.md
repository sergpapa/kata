# Sample grading kit

Start with **Lesson 5: How good are your tests?** It explains every step below, in order.

This folder holds a small booking site that runs only on your computer, one Playwright test, and a grading program. The site can be served as a good build or as one of six fault builds, each with one planted fault. Grading measures which faults your tests catch.

## Files

| File or folder | Purpose |
| --- | --- |
| `site/server.mjs` | The practice site: the good build and the six fault builds. It listens at `http://127.0.0.1:4420` |
| `tests/book-room.spec.ts` | The tests that are graded. You add to this file |
| `grade.mjs` | The grading program |
| `package.json`, `package-lock.json` | What the project needs (Playwright Test 1.65.1), at exact versions |
| `playwright.config.ts` | Settings for Playwright Test |
| `manifest.json` | Version and file identities, for authors and course tooling |

## Command reminder, after reading the lesson

Open this folder in VS Code and open a new terminal.

```sh
npm install
```

Run once. If you have not done Lesson 4 on this computer, also run `npx playwright install chromium`.

```sh
node site/server.mjs
```

Starts the good build by hand. Open `http://127.0.0.1:4420/rooms` in a browser. Press Ctrl+C to stop it before grading.

```sh
npx playwright test
npm run grade
```

The first runs your tests against the good build. The second grades them: three runs against the good build, then one run against each fault build. It takes about half a minute, and longer as your tests catch more.

## Reading the result

`caught` means at least one test failed on that fault build. `missed` means every test passed on it. The report names the category of each fault and not its place. `Not graded` means a test failed on the good build, so nothing can be counted.

The result is a practice measurement against six sample faults. It says which of these faults these tests catch. It is not a measure of the site, and not an assessment of you.

## About the faults

The six faults are written in `site/server.mjs`, where you can read them. The lesson asks you to predict and grade first. The course's full grading kit ships its faults sealed inside the builds.

## What the kit changes on your computer

`npm install` creates `node_modules`, and npm keeps a copy of its downloads and its logs in a cache folder in your home folder. A failed test creates `test-results`. Grading creates `results/grade-results.json`. Those three are inside this folder. The site accepts connections only from this computer.

## Reset

Delete this folder, extract the ZIP again and run `npm install`.

## Scope

The author ran every command in the lesson on Windows 11 with Node.js v24.12.0 and Playwright Test 1.65.1 in its Chromium build. macOS and Linux runs, and use by a learner, have not been checked yet.
