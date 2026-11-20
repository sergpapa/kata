import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { childEnvironment, claudeArgs, resolveClaudeExecutable } from './claudeCode.js';

/**
 * PF18 in docs/specs/practice-feedback.md, at the boundary with Claude Code: the arguments a turn
 * starts with, the environment it inherits, and where the executable is found. Reading the stream
 * is in streamInterpreter.test.ts.
 */

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
    expect(args).not.toContain('--dangerously-skip-permissions');
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
    CLAUDE_CODE_USE_FOUNDRY: '1',
    ANTHROPIC_FOUNDRY_API_KEY: 'foundry',
    // Windows keeps a variable in whatever case it was set in, and still honours it.
    Anthropic_Api_Key: 'sk-ant-mixed-case',
    claude_code_use_bedrock: '1',
  };

  it('drops every variable that would move billing off the plan', () => {
    const env = childEnvironment(server);

    const names = Object.keys(env).map((name) => name.toUpperCase());
    for (const name of [
      'ANTHROPIC_API_KEY',
      'ANTHROPIC_AUTH_TOKEN',
      'ANTHROPIC_BASE_URL',
      'ANTHROPIC_FOUNDRY_API_KEY',
      'CLAUDE_CODE_USE_BEDROCK',
      'CLAUDE_CODE_USE_VERTEX',
      'CLAUDE_CODE_USE_FOUNDRY',
    ]) {
      expect(names).not.toContain(name);
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

  it('uses KATA_CLAUDE_PATH when it names a file that exists', () => {
    const chosen = 'D:\\tools\\claude.exe';
    expect(
      resolveClaudeExecutable(
        { KATA_CLAUDE_PATH: chosen, PATH: npmDir },
        'win32',
        (p) => p === chosen || p === exe,
      ),
    ).toBe(chosen);
  });

  it('reads a relative KATA_CLAUDE_PATH from the directory the server started in', () => {
    const absolute = path.resolve('tools', 'claude.exe');
    expect(
      resolveClaudeExecutable(
        { KATA_CLAUDE_PATH: path.join('tools', 'claude.exe') },
        process.platform,
        (candidate) => candidate === absolute,
      ),
    ).toBe(absolute);
  });

  it('answers null when KATA_CLAUDE_PATH names nothing, rather than silently using another', () => {
    expect(
      resolveClaudeExecutable(
        { KATA_CLAUDE_PATH: 'D:\\gone.exe', PATH: npmDir },
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
