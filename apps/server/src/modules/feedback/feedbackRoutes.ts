import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import type { ReleaseState } from '../content/types.js';
import {
  clearConversation,
  conversationForPage,
  currentConversation,
  loadUsage,
  startConversation,
  appendTurn,
} from './feedbackRepository.js';
import { readFeedbackRequest } from './feedbackRequest.js';
import { openStream, streamTurn } from './feedbackRun.js';
import { FEEDBACK_SYSTEM_PROMPT, firstTurnPrompt } from './prompt.js';
import { usagePause } from './usageGuard.js';
import type { FeedbackAvailability, FeedbackDeps, FeedbackForPage } from './types.js';

/**
 * The feedback routes under a course's prefix (docs/specs/practice-feedback.md, ADR 0019).
 *
 * Every refusal is decided before anything is written or started, in this order: who is asking
 * (PF21), what the request says (PF1, PF6, PF13), whether a run is already going (PF14), whether
 * the conversation it names is current (PF14), and whether a run may start at all (PF16, PF20).
 */

export interface FeedbackRouteDeps {
  readonly db: Db;
  readonly release: ReleaseState;
  readonly feedback: FeedbackDeps;
  readonly activitiesOfRelease: () => readonly LessonActivity[];
  /** The author's worked answer for an activity, or null when it has none (PF2, PF3). */
  readonly workedAnswerOf: (activity: LessonActivity) => string | null;
  readonly provenanceOf: (
    candidateLessonId: string,
  ) => { readonly contentVersion: string; readonly releaseId: string } | undefined;
}

/**
 * Activities with a run going, per app. Keyed by the feedback wiring, which one app shares across
 * its courses, because a conversation is keyed by activity alone (ADR 0018).
 */
const replyingByApp = new WeakMap<FeedbackDeps, Set<string>>();
function replyingOf(feedback: FeedbackDeps): Set<string> {
  let replying = replyingByApp.get(feedback);
  if (!replying) {
    replying = new Set();
    replyingByApp.set(feedback, replying);
  }
  return replying;
}

export function feedbackAvailability(deps: FeedbackRouteDeps): FeedbackAvailability {
  const missing = deps.feedback.runner.unavailableReason;
  if (missing) return { state: 'unavailable', reason: missing };
  const pause = usagePause(loadUsage(deps.db), deps.feedback.now());
  return pause.paused
    ? { state: 'paused', reason: pause.reason, resumesAt: pause.resumesAt }
    : { state: 'ready' };
}

function areaOf(deps: FeedbackRouteDeps, activity: LessonActivity): FeedbackForPage {
  return {
    activityId: activity.activityId,
    hasWorkedAnswer: deps.workedAnswerOf(activity) !== null,
    conversation: conversationForPage(currentConversation(deps.db, activity.activityId)),
    replying: replyingOf(deps.feedback).has(activity.activityId),
  };
}

export function lessonFeedback(
  deps: FeedbackRouteDeps,
  activities: readonly LessonActivity[],
): {
  readonly availability: FeedbackAvailability;
  readonly activities: readonly FeedbackForPage[];
} {
  return {
    availability: feedbackAvailability(deps),
    activities: activities.map((activity) => areaOf(deps, activity)),
  };
}

const LOOPBACK_HOST = /^(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?$/i;
const LOOPBACK_ORIGIN = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{1,5})?$/i;

/**
 * Only this computer's own pages may ask (PF21). A page on another site can reach a loopback server
 * from the learner's browser; a forged Host (DNS rebinding) or a foreign Origin is refused, and so
 * is any body a cross-site form can send without asking first.
 */
async function guard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const host = request.headers.host ?? '';
  const origin = request.headers.origin;
  if (!LOOPBACK_HOST.test(host) || (origin !== undefined && !LOOPBACK_ORIGIN.test(origin))) {
    await reply.code(403).send({
      error: 'feedback_origin_refused',
      message: 'Feedback can only be asked for from this app’s own pages on this computer.',
    });
    return;
  }
  if (request.method === 'POST') {
    const type = (request.headers['content-type'] ?? '').split(';')[0]?.trim().toLowerCase();
    if (type !== 'application/json') {
      await reply.code(415).send({
        error: 'feedback_not_json',
        message: 'A feedback request is sent as JSON.',
      });
    }
  }
}

export function registerFeedbackRoutes(app: FastifyInstance, deps: FeedbackRouteDeps): void {
  void app.register(async (scope) => {
    scope.addHook('onRequest', guard);

    const activityOr404 = (activityId: string, reply: FastifyReply) => {
      const activity = deps.activitiesOfRelease().find((one) => one.activityId === activityId);
      if (!activity) {
        void reply.code(404).send({
          error: 'activity_not_found',
          message: `This release has no activity ${activityId}.`,
        });
      }
      return activity;
    };

    scope.get<{ Params: { activityId: string } }>(
      '/activities/:activityId/feedback',
      async (request, reply) => {
        if (deps.release.state === 'failed')
          return { state: 'failed', failure: deps.release.failure };
        const activity = activityOr404(request.params.activityId, reply);
        if (!activity) return reply;
        return { availability: feedbackAvailability(deps), ...areaOf(deps, activity) };
      },
    );

    scope.post<{ Params: { activityId: string }; Body: unknown }>(
      '/activities/:activityId/feedback/clear',
      async (request, reply) => {
        if (deps.release.state === 'failed')
          return { state: 'failed', failure: deps.release.failure };
        const activity = activityOr404(request.params.activityId, reply);
        if (!activity) return reply;
        const conversationId = (request.body as { conversationId?: unknown } | null)
          ?.conversationId;
        if (typeof conversationId !== 'number' || !Number.isInteger(conversationId)) {
          return reply.code(400).send({
            error: 'feedback_invalid',
            message: 'Start over names the conversation it hides.',
          });
        }
        if (replyingOf(deps.feedback).has(activity.activityId)) return inProgress(reply);
        const current = currentConversation(deps.db, activity.activityId);
        if (!current || current.id !== conversationId) return changed(reply, current);
        if (!clearConversation(deps.db, conversationId, deps.feedback.now().toISOString())) {
          return changed(reply, currentConversation(deps.db, activity.activityId));
        }
        return { state: 'cleared' };
      },
    );

    scope.post<{ Params: { activityId: string }; Body: unknown }>(
      '/activities/:activityId/feedback',
      async (request, reply) => {
        if (deps.release.state === 'failed')
          return { state: 'failed', failure: deps.release.failure };
        const activity = activityOr404(request.params.activityId, reply);
        if (!activity) return reply;

        const read = readFeedbackRequest(request.body, activity.responseFields);
        if (!read.ok) return reply.code(400).send(read.refusal);
        const asked = read.request;

        const replying = replyingOf(deps.feedback);
        if (replying.has(activity.activityId)) return inProgress(reply);
        const current = currentConversation(deps.db, activity.activityId);
        if (
          asked.action === 'start'
            ? current !== null
            : !current ||
              current.id !== asked.conversationId ||
              current.turns.length !== asked.expectedTurns
        ) {
          return changed(reply, current);
        }

        const availability = feedbackAvailability(deps);
        if (availability.state === 'unavailable') {
          return reply
            .code(409)
            .send({ error: 'feedback_unavailable', message: availability.reason });
        }
        if (availability.state === 'paused') {
          return reply.code(409).send({
            error: 'feedback_usage_paused',
            message: availability.reason,
            resumesAt: availability.resumesAt,
          });
        }

        const stamp = deps.provenanceOf(activity.lessonId);
        if (!stamp) {
          throw new Error(
            `Activity ${activity.activityId} names lesson ${activity.lessonId}, which the imported release does not carry.`,
          );
        }
        const provenance = { candidateLessonId: activity.lessonId, ...stamp };
        const at = deps.feedback.now().toISOString();

        // Claimed before anything is written, with no await since the check above: two requests
        // cannot both pass it.
        replying.add(activity.activityId);
        try {
          let conversationId: number;
          let learnerTurn;
          let runRequest;
          if (asked.action === 'start') {
            const sessionId = deps.feedback.newSessionId();
            ({ conversationId, turn: learnerTurn } = startConversation(deps.db, {
              activityId: activity.activityId,
              sessionId,
              sentFields: asked.sentFields,
              provenance,
              at,
            }));
            runRequest = {
              sessionId,
              resume: false,
              model: asked.model,
              systemPrompt: FEEDBACK_SYSTEM_PROMPT,
              prompt: firstTurnPrompt({
                title: activity.title,
                promptMarkdown: activity.promptMarkdown,
                workedAnswer: deps.workedAnswerOf(activity),
                fields: asked.sentFields,
              }),
            };
          } else {
            const continued = current as NonNullable<typeof current>;
            conversationId = continued.id;
            learnerTurn = appendTurn(deps.db, conversationId, {
              role: 'learner',
              text: asked.message,
              provenance,
              at,
            });
            runRequest = {
              sessionId: continued.sessionId,
              resume: true,
              model: asked.model,
              systemPrompt: FEEDBACK_SYSTEM_PROMPT,
              prompt: asked.message,
            };
          }

          reply.hijack();
          openStream(reply.raw);
          await streamTurn({
            raw: reply.raw,
            db: deps.db,
            feedback: deps.feedback,
            conversationId,
            learnerTurn,
            provenance,
            request: runRequest,
          });
        } finally {
          replying.delete(activity.activityId);
        }
        return reply;
      },
    );
  });
}

function inProgress(reply: FastifyReply): FastifyReply {
  return reply.code(409).send({
    error: 'feedback_in_progress',
    message: 'Claude is already replying to this activity. Wait for that reply first.',
  });
}

function changed(
  reply: FastifyReply,
  current: ReturnType<typeof currentConversation>,
): FastifyReply {
  return reply.code(409).send({
    error: 'feedback_conversation_changed',
    message: 'This conversation changed somewhere else, so the page now shows it as it is.',
    conversation: conversationForPage(current),
  });
}
