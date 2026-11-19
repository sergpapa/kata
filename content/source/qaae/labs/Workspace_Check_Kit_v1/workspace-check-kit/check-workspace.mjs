// Workspace check for the course's first practical lessons.
//
// Run it from this folder with:   node check-workspace.mjs
//
// It only reads information about your computer, plus one write test: it creates a small file
// named .workspace-check-write-test in this folder, reads it back and deletes it. It changes
// nothing else, sends nothing anywhere and needs no internet connection.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_NODE_MAJOR = 24;
const REQUIRED_LINE = `${REQUIRED_NODE_MAJOR}.x`;
const GIB = 1024 ** 3;

const results = [];

function record(status, label, detail) {
  results.push({ status, label, detail });
}

/** The folder's real location, so that a shortcut in the path does not look like another folder. */
function realFolder(folder) {
  try {
    return fs.realpathSync(folder);
  } catch {
    return path.resolve(folder);
  }
}

// 1. Which Node.js is running this program?
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor === REQUIRED_NODE_MAJOR) {
  record('PASS', 'Node.js version', `${process.version} (the course uses the ${REQUIRED_LINE} line)`);
} else if (nodeMajor > REQUIRED_NODE_MAJOR) {
  record(
    'WARN',
    'Node.js version',
    `${process.version} is newer than the ${REQUIRED_LINE} line the course material was checked on. ` +
      'If a result differs from what a lesson shows, suspect this difference first.',
  );
} else {
  record(
    'FAIL',
    'Node.js version',
    `${process.version} is older than the ${REQUIRED_LINE} line the course uses. ` +
      `Install Node.js ${REQUIRED_NODE_MAJOR}, then close and reopen your editor.`,
  );
}

// 2. Which operating system is this?
record('INFO', 'Operating system', `${os.type()} ${os.release()} (${process.arch})`);

// 3. Is the terminal's current folder the folder that holds this program?
const kitFolder = realFolder(path.dirname(fileURLToPath(import.meta.url)));
const currentFolder = realFolder(process.cwd());
if (kitFolder.toLowerCase() === currentFolder.toLowerCase()) {
  record('PASS', 'Current folder', currentFolder);
} else {
  record(
    'WARN',
    'Current folder',
    `The terminal is in ${currentFolder}, but this program is in ${kitFolder}. ` +
      'Open a terminal in the kit folder before running the commands in the lessons.',
  );
}

// 4. Is the kit inside a folder that a cloud service keeps in sync?
// This only reads the wording of the path. It cannot ask the sync service itself.
const lowerPath = kitFolder.toLowerCase();
const syncNames = ['onedrive', 'dropbox', 'google drive', 'googledrive', 'icloud', 'mobile documents'];
const syncHit = syncNames.find((name) => lowerPath.includes(name));
const home = os.homedir().toLowerCase();
const macFolder =
  process.platform === 'darwin'
    ? ['documents', 'desktop'].find((name) => lowerPath.startsWith(path.join(home, name).toLowerCase() + path.sep))
    : undefined;
const moveAdvice =
  'Later lessons create folders with thousands of small files, which syncing can slow down or lock. ' +
  'Move your course-work folder directly into your home folder, as the lesson describes.';
if (syncHit) {
  record(
    'WARN',
    'Synced folder',
    `The kit's path contains "${syncHit}", so a sync service may be copying this folder. ${moveAdvice}`,
  );
} else if (macFolder) {
  record(
    'WARN',
    'Synced folder',
    `The kit is inside your ${macFolder === 'documents' ? 'Documents' : 'Desktop'} folder, which iCloud syncs ` +
      `when "Desktop & Documents Folders" is switched on. ${moveAdvice}`,
  );
} else {
  record('PASS', 'Synced folder', 'The path does not contain the name of a sync service.');
}

// 5. Can programs write files here?
const probe = path.join(kitFolder, '.workspace-check-write-test');
try {
  fs.writeFileSync(probe, 'written by check-workspace.mjs\n');
  const readBack = fs.readFileSync(probe, 'utf8');
  if (readBack.startsWith('written by')) {
    record('PASS', 'Write permission', 'Created, read back and deleted a test file in the kit folder.');
  } else {
    record('FAIL', 'Write permission', 'The test file was written but did not read back correctly.');
  }
} catch (error) {
  record(
    'FAIL',
    'Write permission',
    `Could not write in the kit folder: ${error.code ?? error.message}. ` +
      'Extract the kit into the course-work folder in your home folder.',
  );
} finally {
  fs.rmSync(probe, { force: true });
}

// 6. How much memory and free disk space does this computer have?
const memoryGiB = os.totalmem() / GIB;
record('INFO', 'Memory (RAM)', `${memoryGiB.toFixed(1)} GiB available to the system`);

try {
  const disk = fs.statfsSync(kitFolder);
  const freeGiB = (disk.bavail * disk.bsize) / GIB;
  const status = freeGiB < 5 ? 'WARN' : 'INFO';
  const advice = freeGiB < 5 ? ' Less than 5 GiB is tight for the tools later lessons download.' : '';
  record(status, 'Free disk space', `${freeGiB.toFixed(1)} GiB free on the drive holding the kit.${advice}`);
} catch (error) {
  record('INFO', 'Free disk space', `Could not be measured here (${error.code ?? error.message}).`);
}

// Report
console.log('Workspace check');
console.log('===============');
for (const { status, label, detail } of results) {
  console.log(`${status.padEnd(4)}  ${label}: ${detail}`);
}

const count = (status) => results.filter((result) => result.status === status).length;
const warnings = count('WARN');
console.log('');
console.log(
  `Summary: ${count('PASS')} passed, ${warnings} ${warnings === 1 ? 'warning' : 'warnings'}, ${count('FAIL')} failed.`,
);

if (count('FAIL') > 0) {
  console.log('Fix each FAIL line before the next practical lesson. The lesson explains each one.');
  process.exitCode = 1;
} else {
  console.log('Your workspace is ready. Read any WARN lines: they will not stop you today.');
}
