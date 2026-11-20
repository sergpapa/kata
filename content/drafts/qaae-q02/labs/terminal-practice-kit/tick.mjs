// A program that keeps running, for practising how to watch and stop a process.
//
// Run it from this folder with:   node tick.mjs               (runs until you stop it)
//                                 node tick.mjs --count 5     (stops by itself after 5 ticks)
//                                 node tick.mjs --stall-after 3   (goes silent after 3 ticks)
//
// It prints one line each second. While it runs it keeps a small marker file named tick.running
// in this folder, holding its process number, and it removes that file when it stops in an
// orderly way. It changes nothing else.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MARKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'tick.running');

function numberAfter(option) {
  const position = process.argv.indexOf(option);
  if (position === -1) return null;
  const value = Number(process.argv[position + 1]);
  if (!Number.isInteger(value) || value < 1) {
    console.error(`tick: the option ${option} needs a whole number after it, such as ${option} 5`);
    process.exit(2);
  }
  return value;
}

const stopAfter = numberAfter('--count');
const stallAfter = numberAfter('--stall-after');

/** True when a process with this number exists on this computer right now. */
function isRunning(processNumber) {
  try {
    process.kill(processNumber, 0); // signal 0 sends nothing: it only asks whether the process exists
    return true;
  } catch (error) {
    return error.code === 'EPERM'; // it exists and belongs to another account
  }
}

// Only one tick may run at a time. The marker file is how a second one finds out.
if (fs.existsSync(MARKER)) {
  const earlier = Number(fs.readFileSync(MARKER, 'utf8'));
  if (Number.isInteger(earlier) && isRunning(earlier)) {
    console.error(`tick: already running as process ${earlier}. Stop that one first.`);
    process.exit(1);
  }
  console.error(`tick: found a marker left by process ${earlier}, which is no longer running.`);
  console.error('tick: that process did not stop in an orderly way. Replacing its marker.');
}

fs.writeFileSync(MARKER, `${process.pid}\n`);
console.log(`tick: started as process ${process.pid}. Stop me with Ctrl+C.`);

let ticks = 0;

function finish(reason) {
  clearInterval(timer);
  fs.rmSync(MARKER, { force: true });
  console.log(`tick: ${reason} after ${ticks} tick${ticks === 1 ? '' : 's'}. Marker removed.`);
  process.exit(0);
}

const timer = setInterval(() => {
  if (stallAfter !== null && ticks >= stallAfter) return; // still running, and saying nothing
  ticks += 1;
  console.log(`tick ${ticks}`);
  if (stopAfter !== null && ticks >= stopAfter) finish('finished');
}, 1000);

// Ctrl+C in the terminal arrives here as SIGINT. A polite request from another program to stop
// arrives as SIGTERM. A forced stop arrives nowhere: the process simply ends, mid-step.
process.on('SIGINT', () => finish('stopped on request (Ctrl+C)'));
process.on('SIGTERM', () => finish('stopped on request'));
