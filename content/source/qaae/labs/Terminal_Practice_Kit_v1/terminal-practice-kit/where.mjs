// Shows where a path leads from the place the terminal is standing in.
//
// Run it from this folder with:   node where.mjs            (reports the current folder)
//                                 node where.mjs data       (also follows the path "data")
// From another folder, give the path to this file, as in:   node ../where.mjs data
//
// It only looks. It reads no file contents and changes nothing.

import fs from 'node:fs';
import path from 'node:path';

const asked = process.argv.slice(2);
const currentFolder = process.cwd();

console.log(`Current folder:  ${currentFolder}`);

for (const typed of asked) {
  const kind = path.isAbsolute(typed) ? 'full path' : 'relative path';
  const leadsTo = path.resolve(currentFolder, typed);

  console.log('');
  console.log(`You typed:       ${typed}   (a ${kind})`);
  console.log(`It leads to:     ${leadsTo}`);
  console.log(`What is there:   ${describe(leadsTo)}`);
}

/** Says in plain words what, if anything, is at a full path. */
function describe(fullPath) {
  let found;
  try {
    found = fs.statSync(fullPath);
  } catch {
    return 'nothing';
  }
  if (found.isDirectory()) {
    const count = fs.readdirSync(fullPath).length;
    return `a folder holding ${count} item${count === 1 ? '' : 's'}`;
  }
  return `a file of ${found.size} bytes`;
}
