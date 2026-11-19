import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createClaudeCodeRunner } from './claudeCode.js';
import type { RunEvent, RunRequest } from './types.js';

/**
 * PF16, PF18, PF19 and PF20 in docs/specs/practice-feedback.md, with a real child process.
 *
 * The process here is a stand-in script (testkit/standInClaude.mjs) run by this Node, so nothing
 * reaches the learner's plan. What it proves is the part the pure tests cannot: that the prompt
 * really arrives on stdin, that an API key really does not reach the child, that the working
 * directory is really empty, and that a run the guard stops is really dead — a guard that reports
 * "stopped" while the process keeps generating would still spend the org's money.
 */

const standIn = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'testkit',
  'standInClaude.mjs',
);
const made: string[] = [];

afterEach(() => {
  while (made.length > 0) fs.rmSync(made.pop() as string, { recursive: true, force: true });
});

/** A data directory whose name a shell would mangle, to prove no shell is involved. */
function dataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educode feedback & co-'));
  made.push(dir);
  return dir;
}

function runner(mode: string, options: { timeoutMs?: number } = {}) {
  const dir = dataDir();
  const workDir = path.join(dir, 'feedback-workspace');
  return {
    workDir,
    runner: createClaudeCodeRunner({
      command: { file: process.execPath, leadingArgs: [standIn] },
      workDir,
      env: { ...process.env, STANDIN_MODE: mode, ANTHROPIC_API_KEY: 'sk-ant-must-not-arrive' },
      timeoutMs: options.timeoutMs ?? 20_000,
    }),
  };
}

const request: RunRequest = {
  sessionId: '00000000-0000-4000-8000-000000000001',
  resume: false,
  model: 'sonnet',
  systemPrompt: 'Coach first.\nNo grades.',
  prompt: 'Your prediction:\nThe page shows "drinks" & <b>cups</b>.\n',
};

async function collect(events: AsyncIterable<RunEvent>): Promise<RunEvent[]> {
  const all: RunEvent[] = [];
  for await (const event of events) all.push(event);
  return all;
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function pidOf(events: RunEvent[]): Promise<number> {
  const started = events.find((event) => event.type === 'started');
  if (started?.type !== 'started') throw new Error('the run never started');
  return Number(started.sessionId);
}

describe('a turn run as a real process', () => {
  it('sends the prompt on stdin exactly, and the system prompt through its file', async () => {
    const { runner: run } = runner('report');
    const events = await collect(run.run(request));
    const done = events.at(-1);

    expect(done?.type).toBe('done');
    const report = JSON.parse(done?.type === 'done' ? done.text : '{}');
    expect(report.stdin).toBe(request.prompt);
    expect(report.systemPrompt).toBe(request.systemPrompt);
  });

  it('passes the arguments through untouched by any shell', async () => {
    const { runner: run } = runner('report');
    const events = await collect(run.run(request));
    const report = JSON.parse((events.at(-1) as { text: string }).text);

    expect(report.args).toContain('--safe-mode');
    expect(report.args).not.toContain('--bare');
    const file = report.args[report.args.indexOf('--system-prompt-file') + 1] as string;
    expect(file).toContain('educode feedback & co-');
    expect(fs.existsSync(file)).toBe(true);
  });

  it('runs in an empty working directory under the data directory', async () => {
    const { runner: run, workDir } = runner('report');
    const events = await collect(run.run(request));
    const report = JSON.parse((events.at(-1) as { text: string }).text);

    expect(fs.realpathSync(report.cwd)).toBe(fs.realpathSync(workDir));
    expect(report.cwdEntries).toEqual([]);
  });

  it('does not hand the server’s API key to the child', async () => {
    const { runner: run } = runner('report');
    const events = await collect(run.run(request));
    const report = JSON.parse((events.at(-1) as { text: string }).text);

    expect(report.sawApiKey).toBe(false);
  });

  it('kills a run that does not finish in time, and says so', async () => {
    const { runner: run } = runner('hang', { timeoutMs: 1_500 });
    const events = await collect(run.run(request));

    const last = events.at(-1);
    expect(last?.type).toBe('failed');
    expect(last?.type === 'failed' && last.reason).toMatch(/did not finish within/i);
    const pid = await pidOf(events);
    expect(alive(pid)).toBe(false);
  }, 15_000);

  it('kills a run at once when it reports extra usage in use', async () => {
    const { runner: run } = runner('overage', { timeoutMs: 10_000 });
    const began = Date.now();
    const events = await collect(run.run(request));

    expect(Date.now() - began).toBeLessThan(8_000);
    expect(events.at(-1)?.type).toBe('failed');
    expect(alive(await pidOf(events))).toBe(false);
  }, 15_000);

  it('kills a run whose credentials come from an API key, before any reply', async () => {
    const { runner: run, workDir } = runner('apikey', { timeoutMs: 10_000 });
    const began = Date.now();
    const events = await collect(run.run(request));

    expect(events.map((event) => event.type)).toEqual(['failed']);
    expect(Date.now() - began).toBeLessThan(8_000);
    const pid = Number(fs.readFileSync(path.join(workDir, 'standin.pid'), 'utf8'));
    expect(alive(pid)).toBe(false);
  }, 15_000);
});

describe('when Claude Code is not on this computer', () => {
  const missing = () =>
    createClaudeCodeRunner({
      command: null,
      workDir: path.join(os.tmpdir(), 'never-made'),
      env: {},
      timeoutMs: 1_000,
    });
  const reason =
    'Claude Code was not found on this computer. Install it, or set EDUCODE_CLAUDE_PATH to its claude.exe.';

  it('says so before anybody asks', () => {
    expect(missing().unavailableReason).toBe(reason);
  });

  it('fails a run with the same words instead of throwing', async () => {
    expect(await collect(missing().run(request))).toEqual([{ type: 'failed', reason }]);
  });
});
