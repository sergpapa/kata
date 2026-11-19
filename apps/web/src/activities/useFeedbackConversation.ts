import { useEffect, useState } from 'react';
import { postFeedback } from './feedbackStream.js';
import type {
  EarlierConversation,
  FeedbackArea,
  FeedbackAvailability,
  FeedbackConversation,
  FeedbackModel,
  FeedbackTurn,
  SentField,
} from './feedbackTypes.js';

/**
 * One activity's conversation with Claude, as the page knows it (docs/specs/practice-feedback.md
 * PF5–PF8, PF14–PF17, PF20).
 *
 * The run belongs to the server, not to the page. So a stream that breaks after the question was
 * stored is not a failure: the reply is still being written, and the page asks for it every
 * three seconds until the server says the run is over. The conversation shown is only ever one the
 * server sent; any refusal that names the current conversation replaces what is on screen.
 */

/** How often a page asks whether a reply it is not streaming has arrived (PF15). */
const POLL_MS = 3_000;

type Pending = 'start' | 'follow_up' | 'clear' | null;

export function useFeedbackConversation(
  url: string,
  area: FeedbackArea,
  loaded: FeedbackAvailability,
) {
  const [conversation, setConversation] = useState<FeedbackConversation | null>(area.conversation);
  const [earlier, setEarlier] = useState<readonly EarlierConversation[]>(area.earlier ?? []);
  const [availability, setAvailability] = useState(loaded);
  /** A run this page is not streaming: started elsewhere, or its stream was lost. */
  const [replyingElsewhere, setReplyingElsewhere] = useState(area.replying);
  /** Claude's text so far on the run this page is streaming; null when none is. */
  const [writing, setWriting] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  /** Moves on every poll, so the next one is scheduled while the run is still going. */
  const [polls, setPolls] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!replyingElsewhere || pending) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(url);
        const body = (await response.json()) as FeedbackArea & {
          availability: FeedbackAvailability;
        };
        setConversation(body.conversation);
        takeEarlier(body);
        setAvailability(body.availability);
        setReplyingElsewhere(body.replying);
      } catch {
        // Asked again on the next tick: the reply is stored at the server either way.
      }
      setPolls((count) => count + 1);
    }, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [replyingElsewhere, pending, url, polls]);

  function showTurn(conversationId: number, turn: FeedbackTurn) {
    setConversation((shown) =>
      shown && shown.conversationId === conversationId
        ? { conversationId, turns: [...shown.turns.filter((one) => one.turn !== turn.turn), turn] }
        : { conversationId, turns: [turn] },
    );
  }

  /** The server's list replaces the page's whenever an answer carries one (EC7). */
  function takeEarlier(body: { readonly earlier?: unknown }): void {
    if (Array.isArray(body.earlier)) setEarlier(body.earlier as EarlierConversation[]);
  }

  function onRefusal(status: number, body: Record<string, unknown>): void {
    if (body.error === 'feedback_conversation_changed') {
      setConversation((body.conversation as FeedbackConversation | null) ?? null);
      takeEarlier(body);
    } else if (body.error === 'feedback_usage_paused' && typeof body.resumesAt === 'string') {
      setAvailability({
        state: 'paused',
        reason: String(body.message ?? ''),
        resumesAt: body.resumesAt,
      });
    } else if (body.error === 'feedback_unavailable') {
      setAvailability({ state: 'unavailable', reason: String(body.message ?? '') });
    } else {
      setNotice(
        typeof body.message === 'string' ? body.message : `The app answered with status ${status}.`,
      );
    }
  }

  async function run(
    body: { readonly action: 'start' | 'follow_up'; readonly [key: string]: unknown },
    afterReply?: () => void,
  ): Promise<void> {
    setPending(body.action);
    setNotice(null);
    let asked = false;
    let replied = false;
    let reported: string | null = null;
    const outcome = await postFeedback(url, body, (event, data) => {
      const payload = data as {
        conversationId?: number;
        turn?: FeedbackTurn;
        text?: string;
        message?: string;
      };
      if (event === 'delta' && typeof payload.text === 'string') {
        const piece = payload.text;
        setWriting((sofar) => (sofar ?? '') + piece);
      } else if (
        (event === 'learner' || event === 'reply') &&
        payload.turn &&
        typeof payload.conversationId === 'number'
      ) {
        showTurn(payload.conversationId, payload.turn);
        if (event === 'learner') {
          asked = true;
          setWriting('');
        } else {
          replied = true;
          setWriting(null);
        }
      } else if (event === 'error' && typeof payload.message === 'string') {
        reported = payload.message;
      }
    });
    setPending(null);
    setWriting(null);

    if (replied) {
      afterReply?.();
      return;
    }
    if (reported !== null) {
      setNotice(reported);
      return;
    }
    if (outcome.kind === 'answered') {
      onRefusal(outcome.status, outcome.body);
      return;
    }
    if (asked) {
      // The question was stored and the run is the server's: watch for its reply there.
      setReplyingElsewhere(true);
      return;
    }
    setNotice(
      outcome.kind === 'unreachable'
        ? `The local app did not answer: ${outcome.reason}`
        : 'The app ended the request without an answer.',
    );
  }

  const ask = (model: FeedbackModel, fields: readonly SentField[]) =>
    run({
      action: 'start',
      model,
      fields: Object.fromEntries(fields.map((field) => [field.fieldName, field.text])),
    });

  const send = (model: FeedbackModel, message: string, afterReply: () => void) =>
    conversation
      ? run(
          {
            action: 'follow_up',
            model,
            conversationId: conversation.conversationId,
            expectedTurns: conversation.turns.length,
            message,
          },
          afterReply,
        )
      : Promise.resolve();

  async function startOver(): Promise<boolean> {
    if (!conversation) return true;
    setPending('clear');
    setNotice(null);
    const outcome = await postFeedback(
      `${url}/clear`,
      { conversationId: conversation.conversationId },
      () => {},
    );
    setPending(null);
    if (outcome.kind === 'answered' && outcome.status === 200) {
      setConversation(null);
      takeEarlier(outcome.body);
      return true;
    }
    if (outcome.kind === 'answered') onRefusal(outcome.status, outcome.body);
    else if (outcome.kind === 'unreachable')
      setNotice(`The local app did not answer: ${outcome.reason}`);
    return false;
  }

  /** Starts over, then resends what the unanswered first turn sent (PF17). */
  async function tryAgain(model: FeedbackModel, sent: readonly SentField[]): Promise<void> {
    if (await startOver()) await ask(model, sent);
  }

  return {
    conversation,
    earlier,
    availability,
    replyingElsewhere,
    writing,
    pending,
    notice,
    busy: pending !== null || replyingElsewhere,
    ask,
    send,
    startOver,
    tryAgain,
  };
}
