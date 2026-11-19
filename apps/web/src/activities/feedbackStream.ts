/**
 * One POST to a feedback route, read as server-sent events when the server streams and as a JSON
 * refusal when it does not (docs/specs/practice-feedback.md PF5, PF16).
 *
 * `EventSource` cannot send a body, so the stream is read by hand from the fetch response.
 */

export type PostOutcome =
  | { readonly kind: 'streamed' }
  | { readonly kind: 'answered'; readonly status: number; readonly body: Record<string, unknown> }
  | { readonly kind: 'unreachable'; readonly reason: string };

export async function postFeedback(
  url: string,
  body: unknown,
  onEvent: (event: string, data: unknown) => void,
): Promise<PostOutcome> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (error) {
    return { kind: 'unreachable', reason: error instanceof Error ? error.message : String(error) };
  }

  const type = response.headers.get('content-type') ?? '';
  if (!type.startsWith('text/event-stream') || !response.body) {
    let parsed: unknown = {};
    try {
      parsed = await response.json();
    } catch {
      // A body that is not JSON is still an answer; the status says what kind.
    }
    return {
      kind: 'answered',
      status: response.status,
      body:
        typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {},
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Every complete event ends in a blank line; the last piece may still be arriving.
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? '';
      for (const block of blocks) dispatch(block, onEvent);
    }
  } catch (error) {
    return { kind: 'unreachable', reason: error instanceof Error ? error.message : String(error) };
  }
  if (buffer.trim() !== '') dispatch(buffer, onEvent);
  return { kind: 'streamed' };
}

function dispatch(block: string, onEvent: (event: string, data: unknown) => void): void {
  const lines = block.split(/\r?\n/);
  const event =
    lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim() ?? 'message';
  const data = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');
  if (data === '') return;
  try {
    onEvent(event, JSON.parse(data));
  } catch {
    // A line this page cannot read is skipped; the stored conversation is the record.
  }
}
