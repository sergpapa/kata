import { MODEL_ALIASES, type ModelAlias, type SentField } from './types.js';

/**
 * Reads a feedback request body into what the route acts on, or the refusal it answers with
 * (docs/specs/practice-feedback.md PF1, PF6, PF13). Each fault is named on its own, so a refusal
 * says what to change.
 */

/** The same ceiling a saved answer has, for one box and for one message. */
const MAX_FEEDBACK_TEXT = 100_000;

export type FeedbackRequest =
  | {
      readonly action: 'start';
      readonly model: ModelAlias;
      /** Every declared box in declared order; a box the request left out is empty. */
      readonly sentFields: readonly SentField[];
    }
  | {
      readonly action: 'follow_up';
      readonly model: ModelAlias;
      readonly conversationId: number;
      readonly expectedTurns: number;
      readonly message: string;
    };

export interface Refusal {
  readonly error: string;
  readonly message: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

const tooLong = (length: number): Refusal => ({
  error: 'feedback_too_long',
  message: `Claude is sent up to ${MAX_FEEDBACK_TEXT.toLocaleString('en-GB')} characters in one box or message, and this is ${length.toLocaleString('en-GB')}. Nothing was sent.`,
});

const empty: Refusal = {
  error: 'feedback_empty',
  message: 'There is nothing to send yet: write something first.',
};

export function readFeedbackRequest(
  body: unknown,
  declaredFields: readonly string[],
):
  | { readonly ok: true; readonly request: FeedbackRequest }
  | { readonly ok: false; readonly refusal: Refusal } {
  const refuse = (refusal: Refusal) => ({ ok: false as const, refusal });
  const invalid = (message: string) => refuse({ error: 'feedback_invalid', message });

  if (!isRecord(body)) return invalid('A feedback request is a JSON object.');
  if (body.action !== 'start' && body.action !== 'follow_up') {
    return invalid('A feedback request says whether it starts a conversation or continues one.');
  }
  if (
    typeof body.model !== 'string' ||
    !(MODEL_ALIASES as readonly string[]).includes(body.model)
  ) {
    return refuse({
      error: 'feedback_model_invalid',
      message: `Feedback can come from ${MODEL_ALIASES.join(', ')}; this request named something else.`,
    });
  }
  const model = body.model as ModelAlias;

  if (body.action === 'follow_up') {
    if (typeof body.message !== 'string')
      return invalid('A follow-up carries its message as text.');
    if (!isCount(body.conversationId) || !isCount(body.expectedTurns)) {
      return invalid('A follow-up names the conversation it continues and how many turns it has.');
    }
    if (body.message.length > MAX_FEEDBACK_TEXT) return refuse(tooLong(body.message.length));
    if (body.message.trim() === '') return refuse(empty);
    return {
      ok: true,
      request: {
        action: 'follow_up',
        model,
        conversationId: body.conversationId,
        expectedTurns: body.expectedTurns,
        message: body.message,
      },
    };
  }

  if (!isRecord(body.fields)) return invalid('A request for feedback carries the boxes as fields.');
  for (const [name, text] of Object.entries(body.fields)) {
    if (!declaredFields.includes(name)) {
      return invalid(
        `This activity has no box called ${name}. It has: ${declaredFields.join(', ')}.`,
      );
    }
    if (typeof text !== 'string') return invalid(`The box ${name} was not sent as text.`);
    if (text.length > MAX_FEEDBACK_TEXT) return refuse(tooLong(text.length));
  }
  const fields = body.fields as Record<string, string>;
  const sentFields = declaredFields.map((fieldName) => ({
    fieldName,
    text: fields[fieldName] ?? '',
  }));
  if (sentFields.every((field) => field.text.trim() === '')) return refuse(empty);
  return { ok: true, request: { action: 'start', model, sentFields } };
}
