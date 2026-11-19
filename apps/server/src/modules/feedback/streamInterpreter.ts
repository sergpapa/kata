import type { RateLimitInfo, RunEvent } from './types.js';

/**
 * Reads Claude Code's `stream-json` output one line at a time (docs/specs/practice-feedback.md
 * PF5, PF16, PF19, PF20; the format is pinned by testkit/recorded/).
 *
 * Fails closed: reply text is only ever used after an init event that reports no API key, no tool
 * and no MCP server, and a `failed` event from `line` means the caller must stop the process now.
 */

const BILLED_OR_TOOLED =
  'Claude Code here is set up to bill an API key or to use tools, so the app stopped it before it replied.';
const OVERAGE =
  'Claude Code started using paid extra usage, so the app stopped it before it went further.';
const SESSION_MISSING =
  'Claude Code no longer has this conversation. Start over to begin a new one.';
function durationWords(ms: number): string {
  if (ms % 60_000 === 0) {
    const minutes = ms / 60_000;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  return `${Math.round(ms / 1000)} seconds`;
}

const firstLine = (text: string): string =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line !== '') ?? '';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class StreamInterpreter {
  private vetted = false;
  private ended = false;
  private result: {
    readonly isError: boolean;
    readonly subtype: unknown;
    readonly text: unknown;
  } | null = null;

  /** `timeoutMs` only shapes the words of a timeout; the runner owns the timer. */
  constructor(private readonly timeoutMs = 180_000) {}

  line(text: string): readonly RunEvent[] {
    if (this.ended) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return [];
    }
    if (!isRecord(parsed)) return [];

    if (parsed.type === 'system' && parsed.subtype === 'init') return this.init(parsed);

    if (parsed.type === 'stream_event' && isRecord(parsed.event)) {
      const delta = parsed.event.delta;
      if (!isRecord(delta) || delta.type !== 'text_delta' || typeof delta.text !== 'string') {
        return [];
      }
      if (!this.vetted) return this.stop(BILLED_OR_TOOLED);
      return [{ type: 'text', text: delta.text }];
    }

    if (parsed.type === 'rate_limit_event' && isRecord(parsed.rate_limit_info)) {
      const info = parsed.rate_limit_info as RateLimitInfo;
      const usage: RunEvent = { type: 'usage', info };
      return info.isUsingOverage === true ? [usage, ...this.stop(OVERAGE)] : [usage];
    }

    if (parsed.type === 'result') {
      this.result = {
        isError: parsed.is_error === true,
        subtype: parsed.subtype,
        text: parsed.result,
      };
    }
    return [];
  }

  end(exit: {
    readonly code: number | null;
    readonly stderr: string;
    readonly timedOut: boolean;
  }): RunEvent | null {
    if (this.ended) return null;
    this.ended = true;
    const result = this.result;
    const succeeded =
      result !== null &&
      !result.isError &&
      result.subtype === 'success' &&
      typeof result.text === 'string';
    // A reply that finished just before the limit is a reply, even if the process was then stopped
    // on its way out: the result line is Claude Code's own word that the turn completed.
    if (succeeded && this.vetted && exit.timedOut) {
      return { type: 'done', text: result.text as string };
    }
    if (exit.timedOut) {
      return {
        type: 'failed',
        reason: `Claude did not finish within ${durationWords(this.timeoutMs)}.`,
      };
    }
    if (
      exit.code === 0 &&
      result &&
      !result.isError &&
      result.subtype === 'success' &&
      typeof result.text === 'string'
    ) {
      // Never a reply from a run whose init was not seen and vetted.
      return this.vetted
        ? { type: 'done', text: result.text }
        : { type: 'failed', reason: BILLED_OR_TOOLED };
    }
    if (exit.stderr.includes('No conversation found with session ID')) {
      return { type: 'failed', reason: SESSION_MISSING };
    }
    const detail =
      firstLine(exit.stderr) ||
      (typeof result?.text === 'string' ? firstLine(result.text) : '') ||
      (exit.code === null || exit.code === 0
        ? 'it ended without a reply.'
        : `it exited with code ${exit.code}.`);
    return { type: 'failed', reason: `Claude Code stopped with an error: ${detail}` };
  }

  private init(event: Record<string, unknown>): readonly RunEvent[] {
    const safe =
      event.apiKeySource === 'none' &&
      Array.isArray(event.tools) &&
      event.tools.length === 0 &&
      Array.isArray(event.mcp_servers) &&
      event.mcp_servers.length === 0;
    if (!safe) return this.stop(BILLED_OR_TOOLED);
    this.vetted = true;
    return [
      {
        type: 'started',
        model: String(event.model ?? ''),
        sessionId: String(event.session_id ?? ''),
      },
    ];
  }

  private stop(reason: string): readonly RunEvent[] {
    this.ended = true;
    return [{ type: 'failed', reason }];
  }
}
