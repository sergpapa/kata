import fs from 'node:fs';
import type { FastifyInstance } from 'fastify';
import type { Db } from '../lifecycle/database.js';
import type { ReleaseState } from './types.js';
import { loadLabKitRow } from './repository.js';
import { isImportFailure, readVerifiedBytes } from './releaseFiles.js';
import { contentDisposition } from './download.js';

/**
 * Handing over a lab kit's bytes, and nothing else.
 *
 * Split out of `app.ts` when that file crossed the ~350-line guidance, along the same seam
 * `registerResponseRoutes` already uses: one route family, one module, one reason to change.
 */

export interface LabRouteDeps {
  readonly db: Db;
  readonly release: ReleaseState;
  /** The directory holding `learning-release.json`, as configured. Canonicalised per request. */
  readonly releaseDir: string;
}

/** Registered inside a course's prefix (`/api/courses/:courseId`), so every path here is relative. */
export function registerLabRoutes(app: FastifyInstance, deps: LabRouteDeps): void {
  /**
   * One lab kit's bytes. The kit runs on the reader's own computer; this app has never run one and
   * does not start here (ADR 0005, and four handoffs say so in four ways).
   *
   * The id is looked up, never joined to a path, so a traversal in the URL finds no row rather than
   * escaping the release. The bytes are then re-hashed against what the release declares — the
   * start-up check proves the file was right when the process began, and the promise the handoffs
   * ask for is about the moment the reader takes it.
   */
  app.get<{ Params: { labId: string } }>('/labs/:labId/download', async (request, reply) => {
    if (deps.release.state === 'failed') {
      return { state: 'failed', failure: deps.release.failure };
    }

    const { labId } = request.params;
    const kit = loadLabKitRow(deps.db, deps.release.releaseRowId, labId);
    if (!kit) {
      return reply.code(404).send({
        error: 'lab_not_found',
        message: `This release has no lab kit ${labId}.`,
      });
    }

    // Canonicalised before it is handed over, exactly as `verifyRelease` does it. The containment
    // check inside `readVerifiedBytes` compares its base against the *real* path of the target, so
    // a base that is itself behind a symlink, a Windows junction or an 8.3 short name makes every
    // kit in the release look as though it climbs out of it.
    let releaseRealDir: string;
    try {
      releaseRealDir = fs.realpathSync(deps.releaseDir);
    } catch {
      return reply.code(409).send({
        error: 'file_missing',
        message: `There is no release directory at ${deps.releaseDir}, so ${kit.fileName} could not be read.`,
      });
    }

    let bytes: Buffer;
    try {
      bytes = readVerifiedBytes(releaseRealDir, kit.sourcePath, kit.sha256);
    } catch (error) {
      // A kit that changed under a running app is refused, not handed over. 409 rather than 500:
      // the app is fine and the file is not, which is the same distinction the release endpoint draws.
      if (isImportFailure(error)) {
        return reply.code(409).send({ error: error.code, message: error.message });
      }
      throw error;
    }

    return (
      reply
        .code(200)
        .header('content-type', 'application/zip')
        .header('content-length', String(bytes.byteLength))
        // The author's own filename. Lesson 2 tells the reader to use a file by that name, and a
        // download landing as the lab id would make the lesson's instruction wrong. Escaped rather
        // than interpolated: the name comes out of the manifest, and manifest content is untrusted
        // (ADR 0005).
        .header('content-disposition', contentDisposition(kit.fileName))
        // The whole point of re-hashing on every request is that the answer is about the bytes on
        // disk *now*. A cached copy is an answer about some earlier moment, served without the
        // route running at all — so the 409 a changed kit earns would never reach the reader.
        .header('cache-control', 'no-store')
        .send(bytes)
    );
  });
}
