import type { ServerResponse } from 'node:http';
import type { Db } from '../lifecycle/database.js';
import { appendTurn, saveUsage, type TurnProvenance } from './feedbackRepository.js';
import type { FeedbackDeps, FeedbackTurnForPage, RunRequest } from './types.js';

/**
 * One turn, from the learner's stored message to Claude's stored reply, streamed to the page as
 * server-sent events (docs/specs/practice-feedback.md PF5, PF9, PF15, PF16, PF20).
 *
 * The run belongs to the server, not to the page: a page that goes away stops receiving events,
 * and the run still finishes and is stored. Whatever the runner does — finish, fail, throw, or end
 * without saying — exactly one Claude turn is stored and the activity is released.
 */

/** Writes one event, unless the page has gone: its absence is not the run's failure. */
function send(raw: ServerResponse, event: string, data: unknown): void {
  if (raw.destroyed || raw.writableEnded) return;
  raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Starts a server-sent event stream, unbuffered, and ignores errors from a page that has gone. */
export function openStream(raw: ServerResponse): void {
  raw.on('error', () => {});
  raw.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'no-cache',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
  });
}

/** Ends a stream that cannot finish normally with one `error` event the page shows as written. */
export function endWithError(raw: ServerResponse, message: string): void {
  if (!raw.headersSent) openStream(raw);
  send(raw, 'error', { message });
  if (!raw.destroyed && !raw.writableEnded) raw.end();
}

export async function streamTurn(input: {
  readonly raw: ServerResponse;
  readonly db: Db;
  readonly feedback: FeedbackDeps;
  readonly conversationId: number;
  readonly learnerTurn: FeedbackTurnForPage;
  readonly provenance: TurnProvenance;
  readonly request: RunRequest;
}): Promise<void> {
  const { raw, db, feedback, conversationId, provenance } = input;
  send(raw, 'learner', { conversationId, turn: input.learnerTurn });

  let model: string | null = null;
  let partial = '';
  let ending: { readonly text: string } | { readonly failure: string } | null = null;
  try {
    for await (const event of feedback.runner.run(input.request)) {
      if (event.type === 'started') model = event.model || null;
      else if (event.type === 'text') {
        partial += event.text;
        send(raw, 'delta', { text: event.text });
      } else if (event.type === 'usage') {
        saveUsage(db, event.info, feedback.now().toISOString());
      } else if (event.type === 'done') {
        ending = { text: event.text };
        break;
      } else if (event.type === 'failed') {
        ending = { failure: event.reason };
        break;
      }
    }
  } catch (error) {
    ending = {
      failure: `Claude Code stopped with an error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  ending ??= { failure: 'Claude Code stopped with an error: it ended without a reply.' };

  const turn = appendTurn(db, conversationId, {
    role: 'claude',
    ...('text' in ending
      ? { text: ending.text, outcome: 'complete' as const, failure: null }
      : { text: partial, outcome: 'failed' as const, failure: ending.failure }),
    model,
    provenance,
    at: feedback.now().toISOString(),
  });
  send(raw, 'reply', { conversationId, turn });
  if (!raw.destroyed && !raw.writableEnded) raw.end();
}
