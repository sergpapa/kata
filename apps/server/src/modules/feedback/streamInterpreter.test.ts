import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { StreamInterpreter } from './streamInterpreter.js';
import type { RunEvent } from './types.js';

/**
 * PF5, PF9, PF16, PF19 and PF20 in docs/specs/practice-feedback.md: reading Claude Code's stream.
 *
 * These replay runs recorded from the owner's own Claude Code 2.1.293 on 2026-11-19
 * (testkit/recorded/, trimmed to the fields read here, local paths removed). A parser written
 * against a guessed format passes its own tests and breaks on the real thing; these files are the
 * real thing. Moved here from claudeCode.test.ts unchanged when that file passed 350 lines.
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

  for (const field of ['tools', 'mcp_servers'] as const) {
    it(`stops when an init event leaves out ${field}, or sends something that is not a list`, () => {
      const missing = JSON.parse(init({})) as Record<string, unknown>;
      delete missing[field];
      for (const line of [
        JSON.stringify(missing),
        init({ [field]: null }),
        init({ [field]: 'Bash' }),
        init({ [field]: { Bash: true } }),
      ]) {
        const { events, stoppedAt } = play([line, delta]);
        expect(stoppedAt, line).toBe(0);
        expect(events).toEqual([{ type: 'failed', reason: billed }]);
      }
    });
  }

  it('stops when reply text arrives before any init event, and uses none of it', () => {
    const { events, stoppedAt } = play([delta, init({})]);

    expect(stoppedAt).toBe(0);
    expect(events).toEqual([{ type: 'failed', reason: billed }]);
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

  it('keeps a finished reply whose process was stopped by the limit before it exited', () => {
    const interpreter = new StreamInterpreter();
    const [init, ...rest] = linesOf('first-turn-safe-mode-sonnet.jsonl').filter((line) =>
      /"subtype":"(init|success)"/.test(line),
    );
    interpreter.line(init as string);
    for (const line of rest) interpreter.line(line);

    expect(interpreter.end({ code: null, stderr: '', timedOut: true })).toEqual({
      type: 'done',
      text: 'Ok.',
    });
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
