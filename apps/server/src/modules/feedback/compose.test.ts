import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FEEDBACK_TIMEOUT_MS, feedbackRunnerOptions } from './compose.js';

/**
 * PF16 and PF18 in docs/specs/practice-feedback.md, at the composition root.
 *
 * The runner takes its working directory, environment and time limit as parameters, so a wrong
 * wiring passes every runner test: the repo as working directory (which reads its files), the
 * server's environment passed raw (an API key reaches Claude Code and the turn is billed), or no
 * useful limit. This pins what the app actually starts it with.
 */

const dataDir = path.join('C:', 'Users', 'learner', 'kata', 'data');
const exe = 'D:\\tools\\claude.exe';

function options(env: NodeJS.ProcessEnv = {}, found = true) {
  return feedbackRunnerOptions({
    dataDir,
    env: { KATA_CLAUDE_PATH: exe, PATH: 'C:\\Windows', ...env },
    platform: 'win32',
    exists: (candidate) => found && candidate === exe,
  });
}

describe('the runner the app starts', () => {
  it('works in its own directory under the data directory', () => {
    const workDir = options().workDir;
    const relative = path.relative(dataDir, workDir);

    expect(relative).not.toBe('');
    expect(relative.startsWith('..')).toBe(false);
    expect(path.isAbsolute(relative)).toBe(false);
  });

  it('stops a turn after three minutes', () => {
    expect(FEEDBACK_TIMEOUT_MS).toBe(180_000);
    expect(options().timeoutMs).toBe(180_000);
  });

  it('hands Claude Code an environment with no billing variable, whatever its case', () => {
    const env = options({
      ANTHROPIC_API_KEY: 'sk-ant-1',
      Anthropic_Api_Key: 'sk-ant-2',
      claude_code_use_bedrock: '1',
      ANTHROPIC_FOUNDRY_API_KEY: 'f',
      CLAUDE_CODE_USE_FOUNDRY: '1',
    }).env;

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
    expect(env.PATH).toBe('C:\\Windows');
  });

  it('starts the executable it found, with nothing in front of the arguments', () => {
    expect(options().command).toEqual({ file: exe, leadingArgs: [] });
  });

  it('has no command when Claude Code cannot be found', () => {
    expect(options({}, false).command).toBeNull();
  });
});
