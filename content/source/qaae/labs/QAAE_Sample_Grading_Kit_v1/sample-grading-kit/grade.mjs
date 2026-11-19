// The sample grading kit.
//
// Run it from this folder with:   npm run grade
//
// It answers one question: which planted faults do your tests catch?
//   1. It starts the good build of the practice site and runs your tests three times.
//      They must pass every time, because the good build has nothing wrong with it.
//   2. It starts each fault build in turn and runs your tests once against it.
//      A fault is "caught" when at least one test fails, and "missed" when every test passes.
//   3. It prints the result and writes it to results/grade-results.json.
//
// It runs only on this computer. It downloads nothing and sends nothing anywhere.

import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KIT_ID = 'QAAE-LAB-Q01-03';
const KIT_VERSION = '1.0.0-draft';
const FAULT_SET_ID = 'QAAE-SAMPLE-FAULTS-1';
const PORT = 4420;
const SITE_URL = `http://127.0.0.1:${PORT}/rooms`;
const GOOD_RUNS = 3;

// The category is what the report shows. Where each fault sits in the site is not reported.
const FAULT_BUILDS = [
  { build: 'F1', category: 'pricing' },
  { build: 'F2', category: 'pricing' },
  { build: 'F3', category: 'booking details' },
  { build: 'F4', category: 'dates' },
  { build: 'F5', category: 'booking flow' },
  { build: 'F6', category: 'booking rules' },
];

const kitFolder = path.dirname(fileURLToPath(import.meta.url));
const playwrightCli = path.join(kitFolder, 'node_modules', '@playwright', 'test', 'cli.js');

/** The site this program has running at the moment, so that it is never left behind. */
let runningSite = null;
process.on('exit', () => runningSite?.kill());
process.on('SIGINT', () => process.exit(130));

function stop(message) {
  console.error('');
  console.error(message);
  process.exit(1);
}

async function siteAnswers() {
  try {
    const response = await fetch(SITE_URL, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startSite(build) {
  const site = spawn(process.execPath, ['site/server.mjs', '--build', build, '--port', String(PORT)], {
    cwd: kitFolder,
    stdio: 'ignore',
  });
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (site.exitCode !== null) break;
    if (await siteAnswers()) {
      runningSite = site;
      return site;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  site.kill();
  stop(`The ${build} build of the site did not start on port ${PORT}. Run "npm run site" to see why.`);
}

function stopSite(site) {
  runningSite = null;
  return new Promise((resolve) => {
    if (site.exitCode !== null) {
      resolve();
      return;
    }
    site.once('exit', resolve);
    site.kill();
  });
}

/** Runs the tests once and returns how many passed and failed. */
function runTests() {
  return new Promise((resolve) => {
    const run = spawn(process.execPath, [playwrightCli, 'test', '--reporter=json'], {
      cwd: kitFolder,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    let errors = '';
    run.stdout.on('data', (chunk) => (output += chunk));
    run.stderr.on('data', (chunk) => (errors += chunk));
    run.on('close', () => {
      try {
        const report = JSON.parse(output);
        const passed = report.stats.expected;
        const failed = report.stats.unexpected + report.stats.flaky;
        const problem =
          report.errors?.[0]?.message ??
          'No test ran. Every test may be skipped, or the tests folder may hold no test file.';
        resolve({ passed, failed, problem });
      } catch {
        resolve({ passed: 0, failed: 0, problem: errors.trim() || output.trim() || 'Playwright printed nothing.' });
      }
    });
  });
}

function fingerprint(relativePath) {
  const bytes = fs.readFileSync(path.join(kitFolder, relativePath));
  return { path: relativePath, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
}

function testFiles() {
  return fs
    .readdirSync(path.join(kitFolder, 'tests'), { recursive: true })
    .map(String)
    .filter((name) => /\.(spec|test)\.(ts|js|mjs)$/.test(name))
    .sort()
    .map((name) => fingerprint(`tests/${name.replaceAll('\\', '/')}`));
}

function writeResults(results) {
  const folder = path.join(kitFolder, 'results');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'grade-results.json'), `${JSON.stringify(results, null, 2)}\n`);
}

function categoryLines(outcomes, wanted) {
  const counts = new Map();
  for (const { category, outcome } of outcomes) {
    if (outcome === wanted) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts].map(([category, count]) => `  ${wanted.padEnd(7)} ${category}${count > 1 ? ` (${count} faults)` : ''}`);
}

// --- Checks before grading ---------------------------------------------------------------

if (!fs.existsSync(playwrightCli)) {
  stop('Playwright Test is not installed in this folder yet. Run "npm install" first, then grade again.');
}
if (await siteAnswers()) {
  stop(
    `A site is already answering on port ${PORT}. Grading needs to start each build itself.\n` +
      'Find the terminal where the site is running, press Ctrl+C there, then grade again.',
  );
}

const results = {
  kit_id: KIT_ID,
  kit_version: KIT_VERSION,
  fault_set_id: FAULT_SET_ID,
  graded_at: new Date().toISOString(),
  node_version: process.version,
  test_files: testFiles(),
  kit_files: ['grade.mjs', 'playwright.config.ts', 'site/server.mjs'].map(fingerprint),
  good_build_runs: [],
  fault_builds: [],
  summary: null,
};

console.log(`Sample grading kit ${KIT_VERSION}, fault set ${FAULT_SET_ID}`);
console.log('');

// --- 1. The good build -------------------------------------------------------------------

for (let run = 1; run <= GOOD_RUNS; run += 1) {
  process.stdout.write(`Good build, run ${run} of ${GOOD_RUNS} ... `);
  const site = await startSite('good');
  const { passed, failed, problem } = await runTests();
  await stopSite(site);

  if (passed + failed === 0) {
    console.log('could not run');
    stop(
      `Playwright could not run your tests:\n\n${problem}\n\n` +
        'Run "npx playwright test" to see the same message. It names either a line of the test file\n' +
        'or something missing from your setup. Repair that, then grade again.',
    );
  }
  const outcome = failed === 0 ? 'passed' : 'failed';
  console.log(failed === 0 ? `passed (${passed} of ${passed} tests)` : `FAILED (${failed} of ${passed + failed} tests failed)`);
  results.good_build_runs.push({ run, outcome, tests_passed: passed, tests_failed: failed });
}

const goodPasses = results.good_build_runs.filter((run) => run.outcome === 'passed').length;
if (goodPasses < GOOD_RUNS) {
  results.summary = { graded: false, good_build_passes: goodPasses, good_build_runs: GOOD_RUNS };
  writeResults(results);
  console.log('');
  console.log(`Not graded: your tests passed on the good build in ${goodPasses} of ${GOOD_RUNS} runs.`);
  if (goodPasses === 0) {
    console.log('The good build has no planted fault, so a failure here does not come from the site.');
  } else {
    console.log('The same tests against the same build gave different results. That is an unreliable test.');
  }
  console.log('Tests that fail when nothing is wrong cannot show that something is wrong.');
  console.log('Run "npx playwright test" to read the failure, repair it, then grade again.');
  console.log('');
  console.log('Written to results/grade-results.json');
  process.exit(1);
}

// --- 2. The fault builds -----------------------------------------------------------------

for (const [index, { build, category }] of FAULT_BUILDS.entries()) {
  process.stdout.write(`Fault build ${index + 1} of ${FAULT_BUILDS.length} ... `);
  const site = await startSite(build);
  const { passed, failed, problem } = await runTests();
  await stopSite(site);

  if (passed + failed === 0) {
    console.log('could not run');
    stop(`Playwright could not run your tests against this build, so nothing is counted:\n\n${problem}`);
  }
  const outcome = failed > 0 ? 'caught' : 'missed';
  console.log(outcome);
  results.fault_builds.push({ build, category, outcome, tests_passed: passed, tests_failed: failed });
}

// --- 3. The report -----------------------------------------------------------------------

const caught = results.fault_builds.filter((fault) => fault.outcome === 'caught').length;
results.summary = {
  graded: true,
  good_build_passes: goodPasses,
  good_build_runs: GOOD_RUNS,
  faults_caught: caught,
  faults_total: FAULT_BUILDS.length,
};
writeResults(results);

console.log('');
console.log(`Good build     passed ${goodPasses} of ${GOOD_RUNS} runs`);
console.log(`Fault builds   caught ${caught} of ${FAULT_BUILDS.length}`);
console.log('');
for (const line of [...categoryLines(results.fault_builds, 'caught'), ...categoryLines(results.fault_builds, 'missed')]) {
  console.log(line);
}
console.log('');
console.log('Written to results/grade-results.json');
