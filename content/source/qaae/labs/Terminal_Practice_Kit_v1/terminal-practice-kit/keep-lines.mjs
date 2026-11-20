// Passes on only the lines that contain a word. It is the second program in a pipe.
//
// Run it after another program:   node check-orders.mjs data/orders-2026-10.csv | node keep-lines.mjs PROBLEM
//
// It reads lines from its standard input, and writes the ones that contain the word to its
// standard output. It reads no files and changes nothing.

import readline from 'node:readline';

const word = process.argv[2];

if (!word) {
  console.error('keep-lines: name the word to keep, for example: node keep-lines.mjs PROBLEM');
  process.exit(2);
}

if (process.stdin.isTTY) {
  console.error('keep-lines: nothing was piped in. Put another command and a | before this one.');
  process.exit(2);
}

const lines = readline.createInterface({ input: process.stdin });
let kept = 0;

lines.on('line', (line) => {
  if (line.includes(word)) {
    console.log(line);
    kept += 1;
  }
});

lines.on('close', () => {
  console.error(`keep-lines: kept ${kept} line${kept === 1 ? '' : 's'} containing ${word}`);
});
