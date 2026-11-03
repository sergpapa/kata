/**
 * Process entry point for the release scripts in the root package.json. Kept apart from `cli.ts`
 * so the command always runs here and never depends on comparing this file's URL with argv —
 * a comparison that fails silently on Windows when a drive letter's case differs.
 */
import { runCli } from './cli.js';

process.exitCode = runCli(process.argv.slice(2), (line) => {
  process.stdout.write(`${line}\n`);
});
