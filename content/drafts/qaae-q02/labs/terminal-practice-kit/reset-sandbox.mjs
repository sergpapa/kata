// Builds the practice folder named sandbox, in a known starting state.
//
// Run it from this folder with:   node reset-sandbox.mjs
//
// It deletes the folder named sandbox that sits beside this program, if there is one, and
// builds it again from nothing. It touches no other folder, wherever the terminal is standing.
// It refuses to start while the terminal is standing inside sandbox, and then changes nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kitFolder = path.dirname(fileURLToPath(import.meta.url));
const sandbox = path.join(kitFolder, 'sandbox');

/** Ends the program with a message on standard error, before or instead of a reset. */
function stop(message) {
  console.error(`reset-sandbox: ${message}`);
  process.exit(2);
}

// Deleting the folder a terminal is standing in leaves that terminal in a place that no longer
// exists, and Windows refuses the delete half-way. So the check comes first, on every system.
const fromSandbox = fs.existsSync(sandbox)
  ? path.relative(fs.realpathSync(sandbox), fs.realpathSync(process.cwd()))
  : '..';
const standingInside = fromSandbox === '' || (!fromSandbox.startsWith('..') && !path.isAbsolute(fromSandbox));
if (standingInside) {
  stop(
    `this terminal is standing inside ${sandbox}, the folder a reset deletes. Nothing was changed. ` +
      'Go to the kit folder first, then run: node reset-sandbox.mjs',
  );
}

const files = {
  'inbox/orders-week-1.csv': 'order,date,item,quantity,unit_price,total\n1201,2026-12-01,Desk lamp,1,42.00,42.00\n',
  'inbox/orders-week-2.csv': 'order,date,item,quantity,unit_price,total\n1202,2026-12-08,Pen box,4,2.75,11.00\n',
  'inbox/notes.txt': 'Week 2 arrived a day late. Ask whether week 3 will too.\n',
  'inbox/draft.tmp': 'half-written line\n',
  'inbox/old.tmp': 'left over from last month\n',
  'keep/price-list.txt': 'Desk lamp 42.00\nPen box 2.75\nNotebook A5 3.50\n',
  'keep/scratch.tmp': 'This file ends in .tmp too, and somebody still needs it.\n',
};

console.log(`Resetting the practice folder: ${sandbox}`);

try {
  fs.rmSync(sandbox, { recursive: true, force: true });
} catch (error) {
  stop(
    `could not delete the old sandbox (${error.code}). Something is still using it: another terminal ` +
      'standing inside it, or one of its files open in another program. Close that, then run this again.',
  );
}

for (const [name, content] of Object.entries(files)) {
  const target = path.join(sandbox, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
fs.mkdirSync(path.join(sandbox, 'archive'), { recursive: true });

console.log(`Done: 3 folders (inbox, keep, archive) and ${Object.keys(files).length} files.`);
