import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { StreamInterpreter } from './streamInterpreter.js';
import type { FeedbackRunner, ModelAlias, RunEvent, RunRequest } from './types.js';

export { StreamInterpreter };

/**
 * The boundary with the learner's own Claude Code (ADR 0019, docs/specs/practice-feedback.md
 * PF16, PF18–PF20).
 *
 * Everything here exists to keep one promise: a feedback turn runs on the learner's plan, with no
 * tools, or it does not run. The arguments never include `--bare` (API-key-only sign-in), the
 * environment loses every variable that would move billing elsewhere, and the stream is vetted at
 * its init event — anything that reports an API key, a tool or an MCP server, or that does not say,
 * is killed before a word of its reply is used.
 */

export const NOT_FOUND =
  'Claude Code was not found on this computer. Install it, or set EDUCODE_CLAUDE_PATH to its claude.exe.';

/** Compared upper-cased: Windows honours a variable in whatever case it was set. */
const BILLING_VARIABLES = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_FOUNDRY_API_KEY',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
]);

/**
 * The arguments one turn starts with. Never `--bare`, which signs in by API key only; always
 * `--safe-mode`, no tools and no MCP servers. A first turn names its session (`--session-id`) so
 * the store knows it before the run; a follow-up resumes it.
 */
export function claudeArgs(request: {
  readonly sessionId: string;
  readonly resume: boolean;
  readonly model: ModelAlias;
  readonly systemPromptFile: string;
}): string[] {
  return [
    '-p',
    '--safe-mode',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-partial-messages',
    '--tools',
    '',
    '--strict-mcp-config',
    '--system-prompt-file',
    request.systemPromptFile,
    '--model',
    request.model,
    ...(request.resume ? ['--resume', request.sessionId] : ['--session-id', request.sessionId]),
  ];
}

/**
 * The server's environment without any variable that would bill an API key or a cloud provider,
 * matched without regard to case because Windows honours a variable in any case. Returns a copy.
 */
export function childEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const kept: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(env)) {
    if (!BILLING_VARIABLES.has(name.toUpperCase())) kept[name] = value;
  }
  return kept;
}

/**
 * Where the learner's Claude Code is, or null. `EDUCODE_CLAUDE_PATH` wins and is never second-
 * guessed: if it names nothing, the answer is null rather than some other `claude` on PATH. On
 * Windows an npm `claude.cmd` shim is followed to the `claude.exe` beside it, since a shim needs a
 * shell and the runner never uses one.
 */
export function resolveClaudeExecutable(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
  exists: (candidate: string) => boolean,
): string | null {
  const chosen = env.EDUCODE_CLAUDE_PATH;
  // A named path that is not there is an answer, not a hint: silently starting a different
  // executable would run something the learner did not choose.
  if (chosen) {
    const absolute = path.resolve(chosen);
    return exists(absolute) ? absolute : null;
  }

  const windows = platform === 'win32';
  const paths = windows ? path.win32 : path.posix;
  const pathKey = Object.keys(env).find((name) => name.toUpperCase() === 'PATH');
  const dirs = (pathKey ? (env[pathKey] ?? '') : '')
    .split(windows ? ';' : ':')
    .filter((dir) => dir !== '');

  for (const dir of dirs) {
    if (!windows) {
      const candidate = paths.join(dir, 'claude');
      if (exists(candidate)) return candidate;
      continue;
    }
    const direct = paths.join(dir, 'claude.exe');
    if (exists(direct)) return direct;
    // npm installs a claude.cmd shim, which only a shell can run. The real executable sits in
    // the package beside it.
    if (exists(paths.join(dir, 'claude.cmd'))) {
      const behind = paths.join(
        dir,
        'node_modules',
        '@anthropic-ai',
        'claude-code',
        'bin',
        'claude.exe',
      );
      if (exists(behind)) return behind;
    }
  }
  return null;
}

/** How much stderr is kept for the failure line; enough for any first line Claude Code prints. */
const STDERR_LIMIT = 64 * 1024;

/**
 * The real runner: one child process per turn, killed at the time limit or the moment its stream
 * reports billing, tools or extra usage. With no command it reports Claude Code as missing and
 * fails every run with that sentence instead of throwing.
 */
export function createClaudeCodeRunner(options: {
  readonly command: { readonly file: string; readonly leadingArgs: readonly string[] } | null;
  readonly workDir: string;
  readonly env: NodeJS.ProcessEnv;
  readonly timeoutMs: number;
}): FeedbackRunner {
  const { command } = options;
  return {
    unavailableReason: command ? null : NOT_FOUND,
    run(request: RunRequest): AsyncIterable<RunEvent> {
      if (!command) {
        return (async function* () {
          yield { type: 'failed', reason: NOT_FOUND } as const;
        })();
      }
      return runOnce(command, options, request);
    },
  };
}

async function* runOnce(
  command: { readonly file: string; readonly leadingArgs: readonly string[] },
  options: {
    readonly workDir: string;
    readonly env: NodeJS.ProcessEnv;
    readonly timeoutMs: number;
  },
  request: RunRequest,
): AsyncGenerator<RunEvent> {
  fs.mkdirSync(options.workDir, { recursive: true });
  // Beside the working directory, never in it: that directory stays empty. One file for every run,
  // rewritten only when the prompt changes, so concurrent runs never write different text to it.
  const promptFile = path.join(path.dirname(options.workDir), 'system-prompt.txt');
  if (!fs.existsSync(promptFile) || fs.readFileSync(promptFile, 'utf8') !== request.systemPrompt) {
    fs.writeFileSync(promptFile, request.systemPrompt, 'utf8');
  }

  const interpreter = new StreamInterpreter(options.timeoutMs);
  const queue: RunEvent[] = [];
  let finished = false;
  let wake: (() => void) | null = null;
  const push = (events: readonly RunEvent[]) => {
    queue.push(...events);
    wake?.();
  };

  const child = spawn(
    command.file,
    [...command.leadingArgs, ...claudeArgs({ ...request, systemPromptFile: promptFile })],
    { cwd: options.workDir, env: childEnvironment(options.env), shell: false, windowsHide: true },
  );

  let stderr = '';
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, options.timeoutMs);

  const finish = (event: RunEvent | null) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (event) queue.push(event);
    wake?.();
  };

  child.stderr.on('data', (chunk: Buffer) => {
    if (stderr.length < STDERR_LIMIT) stderr += chunk.toString('utf8');
  });
  createInterface({ input: child.stdout }).on('line', (line) => {
    const events = interpreter.line(line);
    push(events);
    if (events.some((event) => event.type === 'failed')) child.kill();
  });
  child.on('error', (error) => {
    finish({ type: 'failed', reason: `Claude Code could not be started: ${error.message}` });
  });
  child.on('close', (code) => finish(interpreter.end({ code, stderr, timedOut })));

  // A child that dies before reading its input closes stdin under us; that is its failure to
  // report, through `close`, not a reason to throw here.
  child.stdin.on('error', () => {});
  child.stdin.end(request.prompt, 'utf8');

  try {
    while (true) {
      const next = queue.shift();
      if (next) {
        yield next;
        continue;
      }
      if (finished) return;
      await new Promise<void>((resolve) => {
        wake = resolve;
      });
      wake = null;
    }
  } finally {
    clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
}
