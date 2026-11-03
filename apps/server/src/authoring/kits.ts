/**
 * Assembling one lab kit from the source tree: its authored members, the canonical copy of every
 * lesson it serves, and a `manifest.json` whose hashes are recomputed — then deciding whether the
 * previous release's zip can be reused byte for byte or the kit must be repacked.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  KIT_MANIFEST,
  Refusal,
  archiveBase,
  jsonText,
  listFiles,
  parseJson,
  type SourceLab,
} from './sourceTree.js';
import { readZip, writeZip, type ZipEntry } from './zip.js';

/** Lowercase hex SHA-256, the form every manifest in a release uses. */
export const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

interface ManifestFileEntry {
  path: string;
  sha256: string;
  bytes?: number;
  [field: string]: unknown;
}

export interface AssembledKit {
  readonly labId: string;
  readonly archive: string;
  /** From the kit manifest's `version`, or `kit_version` in the older shape. */
  readonly version: string;
  readonly zip: Buffer;
  readonly changed: boolean;
}

export interface PreviousKit {
  readonly zip: Buffer;
  readonly members: readonly ZipEntry[];
  readonly version: string;
}

/** The version a kit manifest declares, in whichever field its shape uses. */
export function kitVersion(manifest: Record<string, unknown>, label: string): string {
  const version = manifest.version ?? manifest.kit_version;
  if (typeof version !== 'string') {
    throw new Refusal(`${label}'s manifest.json declares no version or kit_version.`);
  }
  return version;
}

/**
 * The previous release's copy of a kit: its exact bytes (reused when nothing changed), its members
 * in archive order (the order a repack keeps), and the version a change has to move away from.
 * An archive outside the supported zip subset is a refusal naming the kit.
 */
export function readPreviousKit(zip: Buffer, label: string): PreviousKit {
  let members: ZipEntry[];
  try {
    members = readZip(zip);
  } catch (error) {
    throw new Refusal(`The previous ${label} cannot be read: ${(error as Error).message}`, {
      cause: error,
    });
  }
  const manifest = members.find(
    (member) => member.path.split('/').slice(1).join('/') === KIT_MANIFEST,
  );
  if (manifest === undefined) throw new Refusal(`The previous ${label} has no manifest.json.`);
  return {
    zip,
    members,
    version: kitVersion(
      parseJson<Record<string, unknown>>(
        manifest.bytes.toString('utf8'),
        `The previous ${label}'s manifest.json`,
      ),
      label,
    ),
  };
}

/**
 * Rewrites `files[]` to the members' real hashes (and `bytes` where an entry records it), adding an
 * entry for a member the manifest does not list yet. Returns the authored bytes untouched when no
 * value moved, so an unchanged kit's manifest stays byte-identical whatever its formatting.
 */
function honestManifest(
  authored: Buffer,
  members: ReadonlyMap<string, Buffer>,
  label: string,
): Buffer {
  const manifest = parseJson<Record<string, unknown> & { files?: ManifestFileEntry[] }>(
    authored.toString('utf8'),
    `${label}'s manifest.json`,
  );
  if (!Array.isArray(manifest.files)) {
    throw new Refusal(`${label}'s manifest.json has no files list to keep honest.`);
  }
  if (manifest.files.some((entry) => entry.path === KIT_MANIFEST)) {
    throw new Refusal(
      `${label}'s manifest.json lists itself; its own hash can never be true, so remove that entry.`,
    );
  }
  const recordsBytes = manifest.files.some((entry) => 'bytes' in entry);
  let moved = false;
  const listed = new Set<string>();
  const files = manifest.files.map((entry) => {
    const bytes = members.get(entry.path);
    if (bytes === undefined) {
      throw new Refusal(
        `${label}'s manifest.json lists ${entry.path}, which the kit does not contain.`,
      );
    }
    listed.add(entry.path);
    const next: ManifestFileEntry = { ...entry, sha256: sha256(bytes) };
    if ('bytes' in entry) next.bytes = bytes.byteLength;
    if (next.sha256 !== entry.sha256 || next.bytes !== entry.bytes) moved = true;
    return next;
  });
  for (const [memberPath, bytes] of members) {
    if (memberPath === KIT_MANIFEST || listed.has(memberPath)) continue;
    moved = true;
    files.push(
      recordsBytes
        ? { path: memberPath, bytes: bytes.byteLength, sha256: sha256(bytes) }
        : { path: memberPath, sha256: sha256(bytes) },
    );
  }
  return moved ? Buffer.from(jsonText({ ...manifest, files }), 'utf8') : authored;
}

/**
 * Builds one kit. `lessonCopies` maps each served lesson's file name to its canonical bytes;
 * `modified` dates every member if the kit has to be repacked.
 */
export function assembleKit(
  sourceDir: string,
  lab: SourceLab,
  lessonCopies: ReadonlyMap<string, Buffer>,
  previous: PreviousKit,
  modified: Date,
): AssembledKit {
  const label = `${lab.lab_id} (${lab.archive})`;
  const root = path.join(sourceDir, 'labs', archiveBase(lab.archive));
  const folders = fs.existsSync(root) ? fs.readdirSync(root) : [];
  if (folders.length !== 1) {
    throw new Refusal(
      `${label} must have exactly one top folder under ${root}; found ${folders.length}.`,
    );
  }
  const inner = folders[0]!;
  const folder = path.join(root, inner);

  const members = new Map<string, Buffer>();
  for (const file of listFiles(folder)) members.set(file, fs.readFileSync(path.join(folder, file)));
  for (const [name, bytes] of lessonCopies) {
    if (members.has(name)) {
      throw new Refusal(
        `${label} holds its own ${name}; lesson copies are injected from lessons/ and must not be kept in the kit folder.`,
      );
    }
    members.set(name, bytes);
  }
  const authoredManifest = members.get(KIT_MANIFEST);
  if (authoredManifest === undefined) throw new Refusal(`${label} has no manifest.json.`);
  const manifestBytes = honestManifest(authoredManifest, members, label);
  members.set(KIT_MANIFEST, manifestBytes);
  const version = kitVersion(
    parseJson<Record<string, unknown>>(manifestBytes.toString('utf8'), `${label}'s manifest.json`),
    label,
  );

  // The previous order applies only to members under the same top folder: after a rename, every
  // previous path belongs to the old folder and none of them may be reused or trimmed.
  const prefix = `${inner}/`;
  const previousNames = previous.members
    .map((member) => member.path)
    .filter((memberPath) => memberPath.startsWith(prefix))
    .map((memberPath) => memberPath.slice(prefix.length));
  const ordered: ZipEntry[] = [
    ...previousNames.filter((name) => members.has(name)),
    ...[...members.keys()].filter((name) => !previousNames.includes(name)).sort(),
  ].map((name) => ({ path: prefix + name, bytes: members.get(name)! }));

  const unchanged =
    ordered.length === previous.members.length &&
    ordered.every(
      (member, index) =>
        member.path === previous.members[index]!.path &&
        member.bytes.equals(previous.members[index]!.bytes),
    );
  if (unchanged) {
    return { labId: lab.lab_id, archive: lab.archive, version, zip: previous.zip, changed: false };
  }
  if (version === previous.version) {
    throw new Refusal(
      `${label} changed but its manifest version is still ${version}; move it before reissuing the kit.`,
    );
  }
  return {
    labId: lab.lab_id,
    archive: lab.archive,
    version,
    zip: writeZip(ordered, modified),
    changed: true,
  };
}
