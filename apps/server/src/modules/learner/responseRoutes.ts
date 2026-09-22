import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import type { ReleaseState } from '../content/types.js';
import { saveResponse, type StoredResponse } from './responseRepository.js';

/**
 * The one endpoint that records learner work, kept out of `app.ts` so the save contract reads in
 * one place.
 *
 * Everything here is a refusal the reader can act on. The order matters: the release first, because
 * nothing may be recorded against a release the app would not serve; then the activity and the
 * field, because storing a field its author never declared would put something in the export that
 * nobody asked for; then the body. Provenance is never taken from the request — the server reads it
 * off the activity's own lesson (ADR 0011).
 */

/** Long enough for any answer somebody writes; short enough that a paste accident is refused. */
export const MAX_RESPONSE_LENGTH = 100_000;

/** What the page needs to draw a box and save from it. The provenance stays server-side. */
export interface ResponseForPage {
  readonly activityId: string;
  readonly fieldName: string;
  readonly text: string;
  readonly revision: number;
  readonly updatedAt: string;
}

export function responseForPage(stored: StoredResponse): ResponseForPage {
  return {
    activityId: stored.activityId,
    fieldName: stored.fieldName,
    text: stored.text,
    revision: stored.revision,
    updatedAt: stored.updatedAt,
  };
}

interface SaveBody {
  readonly text?: unknown;
  readonly expectedRevision?: unknown;
}

/** The body's own faults, named one at a time so a refusal says which part to change. */
function bodyFault(body: SaveBody | null): string | undefined {
  if (typeof body?.text !== 'string') {
    return 'A save carries its text as a string; this request has no usable text.';
  }
  if (
    typeof body.expectedRevision !== 'number' ||
    !Number.isInteger(body.expectedRevision) ||
    body.expectedRevision < 0
  ) {
    return 'A save carries the revision it believes it is editing: a whole number, 0 or more, and this request has no usable revision.';
  }
  return undefined;
}

export interface ResponseRouteDeps {
  readonly db: Db;
  readonly release: ReleaseState;
  /** The activities of the imported release, derived the same way the lesson view derives them. */
  readonly activitiesOfRelease: () => readonly LessonActivity[];
  /** The version and release a write against this lesson is recorded under (ADR 0011). */
  readonly provenanceOf: (
    candidateLessonId: string,
  ) => { readonly contentVersion: string; readonly releaseId: string } | undefined;
  readonly now: () => string;
}

export function registerResponseRoutes(app: FastifyInstance, deps: ResponseRouteDeps): void {
  app.put<{ Params: { activityId: string; fieldName: string }; Body: unknown }>(
    '/api/activities/:activityId/responses/:fieldName',
    async (request, reply): Promise<unknown> => {
      if (deps.release.state === 'failed') {
        // Answered, not thrown, and in the importer's own words — the same shape every other
        // endpoint uses. A 5xx here would report a broken app when the app is fine.
        return { state: 'failed', failure: deps.release.failure };
      }

      const { activityId, fieldName } = request.params;

      const activity = deps
        .activitiesOfRelease()
        .find((candidate) => candidate.activityId === activityId);
      if (!activity) {
        return notFound(reply, 'activity_not_found', `This release has no activity ${activityId}.`);
      }

      if (!activity.responseFields.includes(fieldName)) {
        const declared = activity.responseFields.join(', ');
        return notFound(
          reply,
          'field_not_declared',
          `Activity ${activityId} does not ask for ${fieldName}. It asks for: ${declared || 'nothing'}.`,
        );
      }

      const body = request.body as SaveBody | null;
      const fault = bodyFault(body);
      if (fault) {
        return reply.code(400).send({ error: 'response_invalid', message: fault });
      }

      const text = body?.text as string;
      const expectedRevision = body?.expectedRevision as number;

      if (text.length > MAX_RESPONSE_LENGTH) {
        return reply.code(400).send({
          error: 'response_too_long',
          message: `This app stores up to ${MAX_RESPONSE_LENGTH.toLocaleString('en-GB')} characters in one field, and this save is ${text.length.toLocaleString('en-GB')}. Nothing was stored; your text is still where you typed it.`,
        });
      }

      const provenance = deps.provenanceOf(activity.lessonId);
      if (!provenance) {
        throw new Error(
          `Activity ${activityId} names lesson ${activity.lessonId}, which the imported release does not carry. The importer refuses that release by name, so reaching here means the record store changed under a running app.`,
        );
      }

      const outcome = saveResponse(deps.db, {
        activityId,
        fieldName,
        candidateLessonId: activity.lessonId,
        contentVersion: provenance.contentVersion,
        releaseId: provenance.releaseId,
        text,
        expectedRevision,
        updatedAt: deps.now(),
      });

      if (outcome.state === 'conflict') {
        return reply.code(409).send({
          error: 'revision_conflict',
          message:
            'This field was saved somewhere else since you started editing it. Nothing was overwritten.',
          stored: outcome.stored ? responseForPage(outcome.stored) : null,
        });
      }

      return {
        state: 'saved',
        revision: outcome.response.revision,
        updatedAt: outcome.response.updatedAt,
      };
    },
  );
}

function notFound(reply: FastifyReply, error: string, message: string): FastifyReply {
  return reply.code(404).send({ error, message });
}
