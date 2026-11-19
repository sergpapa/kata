// Checks one file of orders and reports the orders that need a second look.
//
// Run it from this folder with:   node check-orders.mjs data/orders-2026-10.csv
// For every option it accepts:    node check-orders.mjs --help
//
// It reads the one file you name and changes nothing. The orders are invented for the course.
//
// Three things about how it reports, which the lessons use:
//   - the report goes to standard output, and warnings and failures go to standard error;
//   - it ends with exit code 0 when every order is in order, 1 when it found problems,
//     and 2 when it could not do the check at all;
//   - two settings can also come from environment variables: ORDERS_LIMIT and ORDERS_DIR.

import fs from 'node:fs';
import path from 'node:path';

const VERSION = '1.0.0';
const DEFAULT_LIMIT = '500.00';
const EXPECTED_FIELDS = 6;

const EXIT_ALL_OK = 0;
const EXIT_PROBLEMS_FOUND = 1;
const EXIT_COULD_NOT_CHECK = 2;

const HELP = `check-orders ${VERSION}

Checks one file of orders and lists the orders that need a second look.

Usage:
  node check-orders.mjs <order file> [options]

Options:
  --limit <amount>   Report an order whose total is above this amount (default ${DEFAULT_LIMIT})
  -q, --quiet        Print only the Result line
  --settings         Print the settings in use and where each one came from, then stop
  -h, --help         Print this help, then stop
  --version          Print the version, then stop

Environment variables:
  ORDERS_LIMIT       The limit to use when --limit is not given
  ORDERS_DIR         A folder to look in when the order file is not a full path

Exit codes:
  0  every order is in order
  1  at least one order has a problem
  2  the check could not be done (no such file, or an option it does not know)`;

/** Ends the program with a message on standard error. Used when the check cannot be done. */
function stop(message) {
  console.error(`check-orders: ${message}`);
  process.exit(EXIT_COULD_NOT_CHECK);
}

/** Turns "10.50" into 1050, so that money is compared as whole cents and never as fractions. */
function toCents(text) {
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

function fromCents(cents) {
  return (cents / 100).toFixed(2);
}

// ---- 1. Read the arguments -------------------------------------------------------------------

const args = process.argv.slice(2);
const files = [];
let limitText = null;
let limitSource = null;
let quiet = false;
let showSettings = false;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--help' || arg === '-h') {
    console.log(HELP);
    process.exit(EXIT_ALL_OK);
  } else if (arg === '--version') {
    console.log(`check-orders ${VERSION}`);
    process.exit(EXIT_ALL_OK);
  } else if (arg === '--quiet' || arg === '-q') {
    quiet = true;
  } else if (arg === '--settings') {
    showSettings = true;
  } else if (arg === '--limit') {
    i += 1;
    if (i >= args.length) stop('the option --limit needs an amount after it, such as --limit 200');
    limitText = args[i];
    limitSource = 'the option --limit';
  } else if (arg.startsWith('-')) {
    stop(`unknown option ${arg}. For the options it accepts: node check-orders.mjs --help`);
  } else {
    files.push(arg);
  }
}

// ---- 2. Work out the settings: an option wins, then the environment, then the default --------

if (limitText === null && process.env.ORDERS_LIMIT) {
  limitText = process.env.ORDERS_LIMIT;
  limitSource = 'the environment variable ORDERS_LIMIT';
}
if (limitText === null) {
  limitText = DEFAULT_LIMIT;
  limitSource = 'the built-in default';
}

const limit = toCents(limitText);
if (limit === null) stop(`the limit must be an amount such as 200 or 199.50, and it is [${limitText}]`);

const ordersDir = process.env.ORDERS_DIR || null;

if (showSettings) {
  console.log('Settings in use:');
  console.log(`  limit        ${fromCents(limit)}  (from ${limitSource})`);
  console.log(
    ordersDir
      ? `  orders dir   ${ordersDir}  (from the environment variable ORDERS_DIR)`
      : '  orders dir   not set  (an order file is looked for from the current folder)',
  );
  process.exit(EXIT_ALL_OK);
}

// ---- 3. Find the file ------------------------------------------------------------------------

if (files.length === 0) stop('no order file named. For help: node check-orders.mjs --help');
if (files.length > 1) {
  stop(
    `one order file is expected and ${files.length} arguments arrived: ` +
      files.map((file) => `[${file}]`).join(' '),
  );
}

const typed = files[0];
const startingFolder = ordersDir && !path.isAbsolute(typed) ? ordersDir : process.cwd();
const fullPath = path.resolve(startingFolder, typed);

let text;
try {
  text = fs.readFileSync(fullPath, 'utf8');
} catch {
  stop(`cannot read the file ${fullPath}`);
}

// ---- 4. Check each order ---------------------------------------------------------------------

const lines = text.split(/\r?\n/);
const problems = [];
let checked = 0;

lines.forEach((line, index) => {
  const lineNumber = index + 1;
  if (lineNumber === 1 || line.trim() === '') return; // the heading line, and empty lines

  const fields = line.split(',');
  if (fields.length !== EXPECTED_FIELDS) {
    console.error(
      `check-orders: warning: line ${lineNumber} skipped, it has ${fields.length} fields and ` +
        `${EXPECTED_FIELDS} are expected`,
    );
    return;
  }

  const [order, , , quantityText, unitPriceText, totalText] = fields;
  const quantity = /^\d+$/.test(quantityText) ? Number(quantityText) : null;
  const unitPrice = toCents(unitPriceText);
  const total = toCents(totalText);
  checked += 1;

  if (quantity === null || unitPrice === null || total === null) {
    problems.push(`line ${lineNumber}: order ${order} has a value that is not a number`);
  } else if (quantity === 0) {
    problems.push(`line ${lineNumber}: order ${order} has quantity 0`);
  } else if (quantity * unitPrice !== total) {
    problems.push(
      `line ${lineNumber}: order ${order} total ${totalText} is not ${quantity} x ${unitPriceText}`,
    );
  } else if (total > limit) {
    problems.push(`line ${lineNumber}: order ${order} total ${totalText} is above the limit`);
  }
});

// ---- 5. Report -------------------------------------------------------------------------------

if (!quiet) {
  console.log(`Checking ${typed} (limit ${fromCents(limit)})`);
  for (const problem of problems) console.log(`PROBLEM  ${problem}`);
}
console.log(
  `Result: ${checked} orders checked, ${checked - problems.length} in order, ` +
    `${problems.length} with a problem.`,
);

process.exitCode = problems.length === 0 ? EXIT_ALL_OK : EXIT_PROBLEMS_FOUND;
