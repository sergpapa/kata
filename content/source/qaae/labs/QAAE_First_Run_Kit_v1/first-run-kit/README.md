# First run kit

Start with **Lesson 4: Run a test someone else wrote**. It explains every step below, in order.

This folder holds a small booking site that runs only on your computer, and one Playwright test for it. The site has one defect planted on purpose. The lesson leads you to it.

## Files

| File or folder | Purpose |
| --- | --- |
| `site/server.mjs` | The practice booking site. It needs only Node.js and listens at `http://127.0.0.1:4410` |
| `tests/book-room.spec.ts` | The test from Lesson 1 |
| `package.json`, `package-lock.json` | What the project needs (Playwright Test 1.65.1), at exact versions |
| `playwright.config.ts` | Settings for Playwright Test |
| `playwright.watch.config.ts` | The same settings with a visible, slowed-down browser |
| `manifest.json` | Version and file identities, for authors and course tooling |

## Command reminder, after reading the lesson

Open this folder in VS Code and open a new terminal.

```sh
npm install
npx playwright install chromium
```

Run these once. The first downloads Playwright Test into `node_modules`. The second downloads Playwright's builds of Chromium into a folder in your home folder.

```sh
node site/server.mjs
```

Starts the site by hand. Open `http://127.0.0.1:4410/rooms` in a browser. Press Ctrl+C in the terminal to stop it.

```sh
npx playwright test
npm run watch
```

The first runs the test. The second runs it with the browser visible and a pause after each action.

## What the kit changes on your computer

`npm install` creates `node_modules` in this folder, and npm keeps a copy of its downloads and its logs in a cache folder in your home folder. A failed test creates `test-results` in this folder. The browser download goes to Playwright's own folder in your home folder. The site accepts connections only from this computer.

## Reset

Delete this folder, extract the ZIP again and run `npm install`. The browser download is kept.

## Scope

The author ran every command in the lesson on Windows 11 with Node.js v24.12.0 and Playwright Test 1.65.1 in its Chromium build. macOS and Linux runs, Firefox and WebKit, and use by a learner have not been checked yet.
