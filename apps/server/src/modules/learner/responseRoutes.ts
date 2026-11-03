import type { FastifyInstance, FastifyReply } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import type { LessonActivity } from '../content/activitySet.js';
import type { ReleaseState } from '../content/types.js';
import {
  loadEarlierRevisions,
  saveResponse,
  type StoredResponse,
  type StoredRevision,
} from './responseRepository.js';

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

/**
 * One superseded answer, as the page shows it (ADR 0012).
 *
 * `contentVersion` is here and the release and lesson keys are not, for the same reason
 * `ResponseForPage` carries none of them: the version is what the reader is being asked to read
 * this text against, and the rest is provenance the export reads from the store.
 */
export interface EarlierVersionForPage {
  readonly revision: number;
  readonly text: string;
  readonly writtenAt: string;
  readonly contentVersion: string;
}

/** One field's superseded answers, out of a batch loaded for a whole page or for one save. */
export function earlierVersionsOf(
  revisions: readonly StoredRevision[],
  activityId: string,
  fieldName: string,
): readonly EarlierVersionForPage[] {
  return revisions
    .filter((revision) => revision.activityId === activityId && revision.fieldName === fieldName)
    .map((revision) => ({
      revision: revision.revision,
      text: revision.text,
      writtenAt: revision.writtenAt,
      contentVersion: revision.contentVersion,
    }));
}

/**
 * A stored field with its own superseded answers attached, for the lesson page.
 *
 * The revisions are passed in rather than loaded here, and the parameter has no default: a default
 * would let a caller that forgot them answer "this field has no earlier versions", which is a
 * statement about the owner's work and not a missing optimisation.
 */
export function responseWithHistory(
  stored: StoredResponse,
  revisions: readonly StoredRevision[],
): ResponseForPage & { readonly earlierVersions: readonly EarlierVersionForPage[] } {
  return {
    ...responseForPage(stored),
    earlierVersions: earlierVersionsOf(revisions, stored.activityId, stored.fieldName),
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

/**
 * Registered inside a course's prefix (`/api/courses/:courseId`): the activity is looked up in that
 * course's release and the provenance stamped is that release's, while the record itself is keyed
 * by activity alone, so a shared lesson keeps one answer across courses (ADR 0018).
 */
export function registerResponseRoutes(app: FastifyInstance, deps: ResponseRouteDeps): void {
  app.put<{ Params: { activityId: string; fieldName: string }; Body: unknown }>(
    '/activities/:activityId/responses/:fieldName',
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

      // Read after the write decided its own outcome, and sent whichever way it went. A page that
      // saved twice without reloading, and a page whose conflict was resolved by taking what was
      // stored, both have a list older than the store's — and a client that assembled one from
      // what it remembers sending would be inventing the owner's history (ADR 0012).
      const earlierVersions = earlierVersionsOf(
        loadEarlierRevisions(deps.db, [activityId]),
        activityId,
        fieldName,
      );

      if (outcome.state === 'conflict') {
        return reply.code(409).send({
          error: 'revision_conflict',
          message:
            'This field was saved somewhere else since you started editing it. Nothing was overwritten.',
          stored: outcome.stored ? responseForPage(outcome.stored) : null,
          earlierVersions,
        });
      }

      return {
        state: 'saved',
        revision: outcome.response.revision,
        updatedAt: outcome.response.updatedAt,
        earlierVersions,
      };
    },
  );
}

function notFound(reply: FastifyReply, error: string, message: string): FastifyReply {
  return reply.code(404).send({ error, message });
}
