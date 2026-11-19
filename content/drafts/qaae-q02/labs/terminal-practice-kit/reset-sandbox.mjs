// Builds the practice folder named sandbox, in a known starting state.
//
// Run it from this folder with:   node reset-sandbox.mjs
//
// It deletes the folder named sandbox that sits beside this program, if there is one, and
// builds it again from nothing. It touches no other folder, wherever the terminal is standing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kitFolder = path.dirname(fileURLToPath(import.meta.url));
const sandbox = path.join(kitFolder, 'sandbox');

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

fs.rmSync(sandbox, { recursive: true, force: true });

for (const [name, content] of Object.entries(files)) {
  const target = path.join(sandbox, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}
fs.mkdirSync(path.join(sandbox, 'archive'), { recursive: true });

console.log(`Done: 3 folders (inbox, keep, archive) and ${Object.keys(files).length} files.`);
