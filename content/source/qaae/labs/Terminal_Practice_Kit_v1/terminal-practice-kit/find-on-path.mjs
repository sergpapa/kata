// Walks the PATH list the way a shell does, looking for a program by name.
//
// Run it from this folder with:   node find-on-path.mjs node
//
// It prints every folder on the PATH list this program was handed, in order, and marks each
// folder that holds a program with the name you gave. The first one marked is the one a shell
// starts. It only looks at file names. It runs nothing and changes nothing.
//
// A shell knows a few names this program does not follow: its own built-in commands and short
// names, and in PowerShell a script file ending in .ps1, which PowerShell prefers to a program
// of the same name. For node, the name the lessons use, the two agree.

import fs from 'node:fs';
import path from 'node:path';

const wanted = process.argv[2];

if (!wanted) {
  console.error('find-on-path: name a program to look for, for example: node find-on-path.mjs node');
  process.exit(2);
}

const onWindows = process.platform === 'win32';

// On Windows a program file has an ending such as .exe or .cmd, which you do not type.
// The variable PATHEXT lists the endings a shell tries.
const endings = onWindows
  ? (process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD').split(';').filter(Boolean)
  : [''];

const folders = (process.env.PATH || '').split(path.delimiter).filter(Boolean);

/**
 * The file's name as the folder spells it. Windows finds node.exe when asked for node.EXE, and
 * PATHEXT is usually written in capitals, so the name that was tried is not always the real one.
 */
function nameOnDisk(folder, tried) {
  if (!onWindows) return tried;
  try {
    return fs.readdirSync(folder).find((name) => name.toLowerCase() === tried.toLowerCase()) ?? tried;
  } catch {
    return tried;
  }
}

/** The file in this folder that a shell would start for the wanted name, or null. */
function programIn(folder) {
  for (const ending of endings) {
    const candidate = path.join(folder, wanted + ending);
    try {
      if (!fs.statSync(candidate).isFile()) continue;
      if (!onWindows) fs.accessSync(candidate, fs.constants.X_OK);
      return nameOnDisk(folder, path.basename(candidate));
    } catch {
      // Not in this folder under this ending. Try the next one.
    }
  }
  return null;
}

console.log(`Looking for a program named ${wanted} in the ${folders.length} folders of PATH, in order:`);
console.log('');

let hits = 0;
folders.forEach((folder, index) => {
  const found = programIn(folder);
  const number = String(index + 1).padStart(3);
  if (!found) {
    console.log(`${number}  ${folder}`);
    return;
  }
  hits += 1;
  const note = hits === 1 ? 'FOUND, and this is the one a shell starts' : 'also here, never reached';
  console.log(`${number}  ${folder}   <-- ${found}: ${note}`);
});

console.log('');
console.log(
  hits === 0
    ? `No folder on the list holds a program named ${wanted}. A shell would report that it cannot find it.`
    : `Found in ${hits} folder${hits === 1 ? '' : 's'}. The earliest folder on the list wins.`,
);
