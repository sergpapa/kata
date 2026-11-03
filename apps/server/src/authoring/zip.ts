/**
 * The small zip subset the lab kits use, read and written with `node:zlib` alone.
 *
 * Why our own code and not a dependency: the kits are ours, the subset is tiny, and the build needs
 * byte-identical output for identical input — a property easier to guarantee by construction than
 * to audit in someone else's writer. Anything outside the subset (zip64, encryption, multi-disk,
 * other compression methods, directory entries, paths that could escape the folder they are
 * extracted into) is refused by name rather than half-read.
 */
import zlib from 'node:zlib';

export interface ZipEntry {
  readonly path: string;
  readonly bytes: Buffer;
  /** Set by `readZip` from the member's DOS timestamp, read as UTC. Ignored by `writeZip`. */
  readonly modified?: Date;
}

const LOCAL_SIGNATURE = 0x04034b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const END_SIGNATURE = 0x06054b50;
const END_SIZE = 22;
const STORED = 0;
const DEFLATED = 8;
const UTF8_NAMES = 0x0800;

/** Refuses a member name that is not a plain relative file path. */
function checkMemberPath(name: string): void {
  const reason =
    name === ''
      ? 'is empty'
      : name.endsWith('/')
        ? 'is a directory entry'
        : name.includes('\\')
          ? 'uses a backslash'
          : name.startsWith('/') || /^[A-Za-z]:/.test(name)
            ? 'is an absolute path'
            : name
                  .split('/')
                  .some((segment) => segment === '..' || segment === '.' || segment === '')
              ? 'could escape the folder it is extracted into'
              : null;
  if (reason !== null)
    throw new Error(`The zip member ${name} ${reason}, which kits never contain.`);
}

function findEnd(archive: Buffer): number {
  const earliest = Math.max(0, archive.length - END_SIZE - 0xffff);
  for (let at = archive.length - END_SIZE; at >= earliest; at -= 1) {
    if (archive.readUInt32LE(at) === END_SIGNATURE) return at;
  }
  throw new Error('These bytes are not a zip archive: no end-of-central-directory record.');
}

function fromDos(date: number, time: number): Date {
  return new Date(
    Date.UTC(
      1980 + (date >> 9),
      ((date >> 5) & 0x0f) - 1,
      date & 0x1f,
      time >> 11,
      (time >> 5) & 0x3f,
      (time & 0x1f) * 2,
    ),
  );
}

function toDos(moment: Date): { date: number; time: number } {
  return {
    date:
      ((moment.getUTCFullYear() - 1980) << 9) |
      ((moment.getUTCMonth() + 1) << 5) |
      moment.getUTCDate(),
    time:
      (moment.getUTCHours() << 11) |
      (moment.getUTCMinutes() << 5) |
      Math.floor(moment.getUTCSeconds() / 2),
  };
}

/** Reads every member of an archive in central-directory order, or throws naming what is wrong. */
export function readZip(archive: Buffer): ZipEntry[] {
  if (archive.length < END_SIZE) {
    throw new Error('These bytes are not a zip archive: too short to hold one.');
  }
  const end = findEnd(archive);
  if (archive.readUInt16LE(end + 4) !== 0 || archive.readUInt16LE(end + 6) !== 0) {
    throw new Error('This is a multi-disk zip archive, which kits never are.');
  }
  const count = archive.readUInt16LE(end + 10);
  const centralSize = archive.readUInt32LE(end + 12);
  const centralOffset = archive.readUInt32LE(end + 16);
  if (count === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new Error('This is a zip64 archive, which kits never are.');
  }

  const entries: ZipEntry[] = [];
  let at = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (archive.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
      throw new Error(`The zip's central directory is damaged at entry ${index + 1}.`);
    }
    const flags = archive.readUInt16LE(at + 8);
    const method = archive.readUInt16LE(at + 10);
    const time = archive.readUInt16LE(at + 12);
    const date = archive.readUInt16LE(at + 14);
    const crc = archive.readUInt32LE(at + 16);
    const compressedSize = archive.readUInt32LE(at + 20);
    const size = archive.readUInt32LE(at + 24);
    const nameLength = archive.readUInt16LE(at + 28);
    const extraLength = archive.readUInt16LE(at + 30);
    const commentLength = archive.readUInt16LE(at + 32);
    const localOffset = archive.readUInt32LE(at + 42);
    const name = archive.toString('utf8', at + 46, at + 46 + nameLength);
    at += 46 + nameLength + extraLength + commentLength;

    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error(`The zip member ${name} uses zip64 sizes, which kits never do.`);
    }
    if ((flags & 1) !== 0) throw new Error(`The zip member ${name} is encrypted.`);
    if (method !== STORED && method !== DEFLATED) {
      throw new Error(
        `The zip member ${name} uses compression method ${method}; only stored and deflated are read.`,
      );
    }
    checkMemberPath(name);

    if (archive.readUInt32LE(localOffset) !== LOCAL_SIGNATURE) {
      throw new Error(`The zip member ${name} has no local header where the directory says.`);
    }
    const dataStart =
      localOffset +
      30 +
      archive.readUInt16LE(localOffset + 26) +
      archive.readUInt16LE(localOffset + 28);
    const raw = archive.subarray(dataStart, dataStart + compressedSize);
    let bytes: Buffer;
    try {
      bytes = method === DEFLATED ? zlib.inflateRawSync(raw) : Buffer.from(raw);
    } catch (error) {
      throw new Error(`The zip member ${name} is damaged: ${(error as Error).message}`, {
        cause: error,
      });
    }
    if (bytes.length !== size || zlib.crc32(bytes) !== crc) {
      throw new Error(`The zip member ${name} is damaged: its bytes do not match its checksum.`);
    }
    entries.push({ path: name, bytes, modified: fromDos(date, time) });
  }
  return entries;
}

/**
 * Writes members in the order given, every one deflated and dated `modified` (UTC), with no extra
 * fields and no comment — so the same members and date always give the same bytes.
 */
export function writeZip(entries: readonly ZipEntry[], modified: Date): Buffer {
  const { date, time } = toDos(modified);
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    checkMemberPath(entry.path);
    const name = Buffer.from(entry.path, 'utf8');
    const data = zlib.deflateRawSync(entry.bytes, { level: 9 });
    const crc = zlib.crc32(entry.bytes);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_SIGNATURE, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_NAMES, 6);
    local.writeUInt16LE(DEFLATED, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(entry.bytes.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_SIGNATURE, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8_NAMES, 8);
    central.writeUInt16LE(DEFLATED, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(entry.bytes.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);

    locals.push(local, name, data);
    centrals.push(central, name);
    offset += local.length + name.length + data.length;
  }

  const centralBytes = Buffer.concat(centrals);
  const end = Buffer.alloc(END_SIZE);
  end.writeUInt32LE(END_SIGNATURE, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBytes, end]);
}
