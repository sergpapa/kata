import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { ImportFailure } from './types.js';

/**
 * Getting bytes out of a release directory safely: which paths are allowed to be followed, and
 * whether what came back is what the manifest said it would be. Nothing here knows what a lesson
 * is — that judgement lives in verify.ts.
 */

export const MANIFEST_FILENAME = 'learning-release.json';

/** A refusal is thrown so that the first thing to go wrong is the thing the owner is told about. */
export function refuse(failure: ImportFailure): never {
  throw failure;
}

export function isImportFailure(value: unknown): value is ImportFailure {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value;
}

export function sha256Of(bytes: Buffer): string {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function isInside(baseDir: string, target: string): boolean {
  const relative = path.relative(baseDir, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

/**
 * True when a path is absolute under either convention. A release is a portable package: a
 * drive-qualified or UNC path authored on Windows must not be admitted as an innocent filename when
 * the app runs on Linux, and `/etc/passwd` must not be admitted on Windows. Asking both
 * implementations is how that holds on a machine that only knows its own rules.
 *
 * Exported so it can be tested directly — a test that goes through a release directory can only
 * ever exercise the host's own convention.
 */
export function escapesByConvention(relativePath: string): boolean {
  return (
    path.isAbsolute(relativePath) ||
    path.posix.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath)
  );
}

/**
 * Resolves a manifest path within the release, or refuses it. The final check is against the real
 * path, so a link inside the release directory cannot point out of it.
 */
function resolveInsideRelease(releaseRealDir: string, relativePath: string): string {
  if (escapesByConvention(relativePath)) {
    refuse({
      code: 'path_escapes_release',
      message: `The release manifest points at ${relativePath}, which is outside the release. Every path in a release must sit inside the release directory.`,
      file: relativePath,
    });
  }

  const resolved = path.resolve(releaseRealDir, relativePath);
  if (!isInside(releaseRealDir, resolved)) {
    refuse({
      code: 'path_escapes_release',
      message: `The release manifest points at ${relativePath}, which climbs out of the release directory.`,
      file: relativePath,
    });
  }

  let real: string;
  try {
    real = fs.realpathSync(resolved);
  } catch {
    return resolved; // Absent or unreadable: reported as file_missing by the caller that reads it.
  }
  if (!isInside(releaseRealDir, real)) {
    refuse({
      code: 'path_escapes_release',
      message: `The release manifest points at ${relativePath}, which is a link to ${real}, outside the release directory.`,
      file: relativePath,
    });
  }
  return real;
}

/** Reads a release file and proves it is the one the manifest describes, or refuses it by name. */
export function readVerifiedBytes(
  releaseRealDir: string,
  relativePath: string,
  expectedSha256: string,
): Buffer {
  const absolute = resolveInsideRelease(releaseRealDir, relativePath);

  let bytes: Buffer;
  try {
    bytes = fs.readFileSync(absolute);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      refuse({
        code: 'file_missing',
        message: `The release names ${relativePath}, but there is no such file in the release directory.`,
        file: relativePath,
      });
    }
    refuse({
      code: 'file_unreadable',
      message: `The release names ${relativePath}, but it could not be read: ${(error as Error).message}`,
      file: relativePath,
    });
  }

  const received = sha256Of(bytes);
  if (received.toLowerCase() !== expectedSha256.trim().toLowerCase()) {
    refuse({
      code: 'hash_mismatch',
      message: `${relativePath} is not the file the release describes. The release gives SHA-256 ${expectedSha256}; the bytes read hash to ${received}.`,
      file: relativePath,
    });
  }
  return bytes;
}
