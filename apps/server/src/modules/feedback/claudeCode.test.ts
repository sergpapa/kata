import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  StreamInterpreter,
  childEnvironment,
  claudeArgs,
  resolveClaudeExecutable,
} from './claudeCode.js';
import type { RunEvent } from './types.js';

/**
 * PF5, PF9, PF16, PF18, PF19 and PF20 in docs/specs/practice-feedback.md, at the boundary with
 * Claude Code.
 *
 * The stream tests replay runs recorded from the owner's own Claude Code 2.1.293 on 2026-11-19
 * (testkit/recorded/, trimmed to the fields read here, local paths removed). A parser written
 * against a guessed format passes its own tests and breaks on the real thing; these files are the
 * real thing.
 */

const recorded = path.join(path.dirname(fileURLToPath(import.meta.url)), 'testkit', 'recorded');
const linesOf = (name: string): string[] =>
  fs
    .readFileSync(path.join(recorded, name), 'utf8')
    .split('\n')
    .filter((line) => line !== '');

function play(lines: readonly string[]): { events: RunEvent[]; stoppedAt: number | null } {
  const interpreter = new StreamInterpreter();
  const events: RunEvent[] = [];
  for (const [index, line] of lines.entries()) {
    const out = interpreter.line(line);
    events.push(...out);
    if (out.some((event) => event.type === 'failed')) return { events, stoppedAt: index };
  }
  const last = interpreter.end({ code: 0, stderr: '', timedOut: false });
  if (last) events.push(last);
  return { events, stoppedAt: null };
}

const text = (events: readonly RunEvent[]) =>
  events.flatMap((event) => (event.type === 'text' ? [event.text] : [])).join('');

describe('the arguments a turn starts with', () => {
  const base = {
    sessionId: '00000000-0000-4000-8000-000000000001',
    model: 'sonnet' as const,
    systemPromptFile: 'C:/data/feedback/system-prompt.txt',
  };

  it('never asks for --bare, which would bill an API key', () => {
    expect(claudeArgs({ ...base, resume: false })).not.toContain('--bare');
    expect(claudeArgs({ ...base, resume: true })).not.toContain('--bare');
  });

  it('runs headless in safe mode, with no tools and no MCP servers, streaming JSON', () => {
    const args = claudeArgs({ ...base, resume: false });

    expect(args).toContain('-p');
    expect(args).toContain('--safe-mode');
    expect(args).toContain('--strict-mcp-config');
    expect(args).toContain('--verbose');
    expect(args).toContain('--include-partial-messages');
    expect(args[args.indexOf('--tools') + 1]).toBe('');
    expect(args[args.indexOf('--output-format') + 1]).toBe('stream-json');
    expect(args[args.indexOf('--system-prompt-file') + 1]).toBe(base.systemPromptFile);
    expect(args[args.indexOf('--model') + 1]).toBe('sonnet');
    expect(args).not.toContain('--mcp-config');
  });

  it('starts a first turn under its own session id, and resumes a follow-up', () => {
    const first = claudeArgs({ ...base, resume: false });
    expect(first[first.indexOf('--session-id') + 1]).toBe(base.sessionId);
    expect(first).not.toContain('--resume');

    const next = claudeArgs({ ...base, resume: true, model: 'opus' });
    expect(next[next.indexOf('--resume') + 1]).toBe(base.sessionId);
    expect(next).not.toContain('--session-id');
    expect(next[next.indexOf('--model') + 1]).toBe('opus');
  });

  it('never carries the prompt itself, which goes on stdin', () => {
    const args = claudeArgs({ ...base, resume: false });
    expect(args.some((arg) => arg.includes('\n'))).toBe(false);
  });
});

describe("the child's environment", () => {
  const server = {
    PATH: 'C:\\Windows',
    USERPROFILE: 'C:\\Users\\learner',
    ANTHROPIC_API_KEY: 'sk-ant-should-never-reach-the-child',
    ANTHROPIC_AUTH_TOKEN: 'token',
    ANTHROPIC_BASE_URL: 'https://proxy.example',
    CLAUDE_CODE_USE_BEDROCK: '1',
    CLAUDE_CODE_USE_VERTEX: '1',
  };

  it('drops every variable that would move billing off the plan', () => {
    const env = childEnvironment(server);

    for (const name of [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_BASE_URL',
      'CLAUDE_CODE_USE_BEDROCK',
      'CLAUDE_CODE_USE_VERTEX',
    ]) {
      expect(env).not.toHaveProperty(name);
    }
  });

  it('keeps the rest, so Claude Code can find its own sign-in', () => {
    const env = childEnvironment(server);

    expect(env.PATH).toBe('C:\\Windows');
    expect(env.USERPROFILE).toBe('C:\\Users\\learner');
  });

  it('does not change the environment it was given', () => {
    const own = { ...server };
    childEnvironment(own);
    expect(own.ANTHROPIC_API_KEY).toBe(server.ANTHROPIC_API_KEY);
  });
});

describe('finding Claude Code', () => {
  const npmDir = 'C:\\Users\\learner\\AppData\\Roaming\\npm';
  const exe = path.win32.join(
    npmDir,
    'node_modules',
    '@anthropic-ai',
    'claude-code',
    'bin',
    'claude.exe',
  );

  it('uses EDUCODE_CLAUDE_PATH when it names a file that exists', () => {
    const chosen = 'D:\\tools\\claude.exe';
    expect(
      resolveClaudeExecutable(
        { EDUCODE_CLAUDE_PATH: chosen, PATH: npmDir },
        'win32',
        (p) => p === chosen || p === exe,
      ),
    ).toBe(chosen);
  });

  it('answers null when EDUCODE_CLAUDE_PATH names nothing, rather than silently using another', () => {
    expect(
      resolveClaudeExecutable(
        { EDUCODE_CLAUDE_PATH: 'D:\\gone.exe', PATH: npmDir },
        'win32',
        (p) => p === exe,
      ),
    ).toBeNull();
  });

  it('finds the real executable behind an npm claude.cmd shim on Windows', () => {
    const shim = path.win32.join(npmDir, 'claude.cmd');
    expect(
      resolveClaudeExecutable(
        { PATH: `C:\\Windows;${npmDir}` },
        'win32',
        (p) => p === shim || p === exe,
      ),
    ).toBe(exe);
  });

  it('prefers a claude.exe on PATH on Windows', () => {
    const direct = 'C:\\bin\\claude.exe';
    expect(
      resolveClaudeExecutable(
        { PATH: `C:\\bin;${npmDir}` },
        'win32',
        (p) => p === direct || p === exe,
      ),
    ).toBe(direct);
  });

  it('never answers a .cmd shim, which could only run through a shell', () => {
    const shim = path.win32.join(npmDir, 'claude.cmd');
    expect(resolveClaudeExecutable({ PATH: npmDir }, 'win32', (p) => p === shim)).toBeNull();
  });

  it('finds claude on PATH elsewhere', () => {
    expect(
      resolveClaudeExecutable(
        { PATH: '/usr/bin:/home/learner/.local/bin' },
        'linux',
        (p) => p === '/home/learner/.local/bin/claude',
      ),
    ).toBe('/home/learner/.local/bin/claude');
  });

  it('answers null when it is nowhere', () => {
    expect(resolveClaudeExecutable({ PATH: npmDir }, 'win32', () => false)).toBeNull();
    expect(resolveClaudeExecutable({}, 'linux', () => false)).toBeNull();
  });
});

describe('reading a recorded first turn', () => {
  it('reports the model and session, streams the text, and ends with the whole reply', () => {
    const { events, stoppedAt } = play(linesOf('first-turn-safe-mode-sonnet.jsonl'));

    expect(stoppedAt).toBeNull();
    expect(events[0]).toEqual({
      type: 'started',
      model: 'claude-sonnet-5-5',
      sessionId: 'bfb479c5-3336-4798-a5b2-33ed5d8b0ecd',
    });
    expect(text(events)).toBe('Ok.');
    expect(events.at(-1)).toEqual({ type: 'done', text: 'Ok.' });
    expect(events.filter((event) => event.type === 'done' || event.type === 'failed')).toHaveLength(
      1,
    );
  });

  it('finds the init event when it is not the first line', () => {
    const lines = linesOf('first-turn-safe-mode-sonnet.jsonl');
    expect(JSON.parse(lines[0] as string).subtype).not.toBe('init');

    const { events } = play(lines);
    expect(events.filter((event) => event.type === 'started')).toHaveLength(1);
  });

  it('passes on the usage report it saw', () => {
    const { events } = play(linesOf('first-turn-opus.jsonl'));
    const usage = events.find((event) => event.type === 'usage');

    expect(usage).toBeDefined();
    if (usage?.type === 'usage') {
      expect(usage.info.isUsingOverage).toBe(false);
      expect(usage.info.unifiedWindows?.seven_day?.utilization).toBe(0.24);
    }
  });

  it('stores the result text, not the streamed pieces, when they differ', () => {
    const lines = linesOf('first-turn-opus.jsonl').map((line) => {
      const parsed = JSON.parse(line);
      if (parsed.type === 'result') parsed.result = 'The final text Claude Code settled on.';
      return JSON.stringify(parsed);
    });

    const { events } = play(lines);
    expect(events.at(-1)).toEqual({ type: 'done', text: 'The final text Claude Code settled on.' });
  });

  it('reads a resumed turn the same way', () => {
    const { events } = play(linesOf('resumed-turn.jsonl'));

    expect(events.at(-1)).toEqual({ type: 'done', text: 'Teal.' });
    expect(events[0]?.type).toBe('started');
  });

  it('ignores a line that is not JSON, instead of failing the turn', () => {
    const lines = linesOf('first-turn-safe-mode-sonnet.jsonl');
    const { events } = play(['Warning: something Claude Code printed', ...lines]);

    expect(events.at(-1)).toEqual({ type: 'done', text: 'Ok.' });
  });
});

describe('stopping a run before it can bill or act (PF19, PF20)', () => {
  const init = (over: Record<string, unknown>) =>
    JSON.stringify({
      type: 'system',
      subtype: 'init',
      session_id: 's',
      model: 'claude-sonnet-5-5',
      tools: [],
      mcp_servers: [],
      apiKeySource: 'none',
      ...over,
    });
  const delta = JSON.stringify({
    type: 'stream_event',
    event: { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Hi' } },
  });
  const billed =
    'Claude Code here is set up to bill an API key or to use tools, so the app stopped it before it replied.';

  it('stops at the init event when it would bill an API key', () => {
    const { events, stoppedAt } = play([init({ apiKeySource: 'ANTHROPIC_API_KEY' }), delta]);

    expect(stoppedAt).toBe(0);
    expect(events).toEqual([{ type: 'failed', reason: billed }]);
  });

  it('stops at the init event when the run has a tool', () => {
    expect(play([init({ tools: ['Bash'] }), delta]).events).toEqual([
      { type: 'failed', reason: billed },
    ]);
  });

  it('stops at the init event when the run has an MCP server', () => {
    expect(
      play([init({ mcp_servers: [{ name: 'x', status: 'connected' }] }), delta]).events,
    ).toEqual([{ type: 'failed', reason: billed }]);
  });

  it('stops when an init event does not say where its credentials come from', () => {
    const missing = JSON.parse(init({})) as Record<string, unknown>;
    delete missing.apiKeySource;
    expect(play([JSON.stringify(missing), delta]).stoppedAt).toBe(0);
  });

  it('stops at once when a usage report shows extra usage in use', () => {
    const lines = linesOf('first-turn-opus.jsonl').map((line) => {
      const parsed = JSON.parse(line);
      if (parsed.type === 'rate_limit_event') parsed.rate_limit_info.isUsingOverage = true;
      return JSON.stringify(parsed);
    });
    const at = lines.findIndex((line) => line.includes('rate_limit_event'));

    const { events, stoppedAt } = play(lines);
    expect(stoppedAt).toBe(at);
    const failed = events.at(-1);
    expect(failed?.type).toBe('failed');
    expect(failed?.type === 'failed' && failed.reason).toMatch(/extra usage/i);
    // The report itself still reaches the caller, so the guard can hold the next turn back.
    expect(events.some((event) => event.type === 'usage')).toBe(true);
  });

  it('sends no reply text from a run it stopped', () => {
    const { events } = play([init({ apiKeySource: 'ANTHROPIC_API_KEY' }), delta]);
    expect(text(events)).toBe('');
  });
});

describe('ending a run that did not finish (PF16)', () => {
  it('names a missing conversation in words the learner can act on', () => {
    const interpreter = new StreamInterpreter();
    for (const line of linesOf('resume-missing.jsonl')) interpreter.line(line);
    const stderr = fs.readFileSync(path.join(recorded, 'resume-missing.stderr.txt'), 'utf8');

    expect(interpreter.end({ code: 1, stderr, timedOut: false })).toEqual({
      type: 'failed',
      reason: 'Claude Code no longer has this conversation. Start over to begin a new one.',
    });
  });

  it('says the run took too long when it was stopped by the time limit', () => {
    const interpreter = new StreamInterpreter();
    interpreter.line(linesOf('first-turn-safe-mode-sonnet.jsonl')[1] as string);

    expect(interpreter.end({ code: null, stderr: '', timedOut: true })).toEqual({
      type: 'failed',
      reason: 'Claude did not finish within 3 minutes.',
    });
  });

  it('quotes the first line of stderr verbatim for any other failure', () => {
    const interpreter = new StreamInterpreter();

    expect(
      interpreter.end({
        code: 1,
        stderr: 'Error: Invalid API key · Please run /login\nmore detail',
        timedOut: false,
      }),
    ).toEqual({
      type: 'failed',
      reason: 'Claude Code stopped with an error: Error: Invalid API key · Please run /login',
    });
  });

  it('quotes the result text of an error result when stderr is empty', () => {
    const interpreter = new StreamInterpreter();
    interpreter.line(
      JSON.stringify({
        type: 'result',
        subtype: 'success',
        is_error: true,
        result: "You've hit your limit · resets 3pm",
      }),
    );

    expect(interpreter.end({ code: 0, stderr: '', timedOut: false })).toEqual({
      type: 'failed',
      reason: "Claude Code stopped with an error: You've hit your limit · resets 3pm",
    });
  });

  it('fails a run that exited cleanly without any result', () => {
    const interpreter = new StreamInterpreter();
    const last = interpreter.end({ code: 0, stderr: '', timedOut: false });

    expect(last?.type).toBe('failed');
  });

  it('gives no second ending after a run it stopped itself', () => {
    const interpreter = new StreamInterpreter();
    interpreter.line(
      JSON.stringify({
        type: 'system',
        subtype: 'init',
        session_id: 's',
        model: 'm',
        tools: ['Bash'],
        mcp_servers: [],
        apiKeySource: 'none',
      }),
    );

    expect(interpreter.end({ code: null, stderr: '', timedOut: false })).toBeNull();
  });
});
