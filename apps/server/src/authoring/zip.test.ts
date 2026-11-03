import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { repoRoot } from '../config.js';
import { readZip, writeZip, type ZipEntry } from './zip.js';

const RELEASE_LABS = path.join(repoRoot, 'content/releases/http-first-fifteen-v1_0_1/content/labs');
const KITS = fs.readdirSync(RELEASE_LABS).filter((name) => name.endsWith('.zip'));
const MODIFIED = new Date(Date.UTC(2026, 10, 3, 0, 0, 0));

const sha256 = (bytes: Buffer) => crypto.createHash('sha256').update(bytes).digest('hex');

const temps: string[] = [];
afterEach(() => {
  for (const dir of temps.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

/**
 * Extracts one member with a zip reader that is not ours, so a writer bug cannot hide behind a
 * reader that shares it. Windows ships bsdtar, which reads zip; elsewhere Info-ZIP `unzip`.
 */
function extractWithSystemTool(zipBytes: Buffer, member: string): Buffer {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'educode-zip-'));
  temps.push(dir);
  const file = path.join(dir, 'archive.zip');
  fs.writeFileSync(file, zipBytes);
  if (process.platform === 'win32') {
    return execFileSync('C:\\Windows\\System32\\tar.exe', ['-xOf', file, member]);
  }
  return execFileSync('unzip', ['-p', file, member]);
}

interface HandMadeMember {
  name: string;
  data: Buffer;
  method?: number;
  flags?: number;
  crc?: number;
}

/**
 * A one-member stored archive built byte by byte here, independent of `writeZip`, so a refusal
 * test can set exactly the field it is about. Offsets follow APPNOTE 4.3.7, 4.3.12 and 4.3.16.
 */
function handMadeZip(member: HandMadeMember, eocd: { disk?: number } = {}): Buffer {
  const name = Buffer.from(member.name, 'utf8');
  const crc = member.crc ?? zlib.crc32(member.data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(member.flags ?? 0, 6);
  local.writeUInt16LE(member.method ?? 0, 8);
  local.writeUInt16LE(0, 10);
  local.writeUInt16LE(0x5b61, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(member.data.length, 18);
  local.writeUInt32LE(member.data.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(member.flags ?? 0, 8);
  central.writeUInt16LE(member.method ?? 0, 10);
  central.writeUInt16LE(0, 12);
  central.writeUInt16LE(0x5b61, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(member.data.length, 20);
  central.writeUInt32LE(member.data.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);

  const centralOffset = local.length + name.length + member.data.length;
  const centralSize = central.length + name.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(eocd.disk ?? 0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  return Buffer.concat([local, name, member.data, central, name, end]);
}

const sample: ZipEntry[] = [
  { path: 'kit/README.md', bytes: Buffer.from('# Read me\n\nCafé menu — UTF-8 text.\n', 'utf8') },
  { path: 'kit/empty.txt', bytes: Buffer.alloc(0) },
  { path: 'kit/checks/deep/case.mjs', bytes: Buffer.from('export const x = 1;\n'.repeat(400)) },
  { path: 'kit/binary.bin', bytes: crypto.randomBytes(3000) },
];

describe('readZip on the received kits', () => {
  it.each(KITS)('reads every member of %s with the bytes its manifest hashes', (kit) => {
    const entries = readZip(fs.readFileSync(path.join(RELEASE_LABS, kit)));
    const manifestEntry = entries.find((entry) => entry.path.endsWith('/manifest.json'));
    expect(manifestEntry).toBeDefined();
    const manifest = JSON.parse(manifestEntry!.bytes.toString('utf8')) as {
      files: { path: string; sha256: string }[];
    };
    const folder = manifestEntry!.path.slice(0, -'manifest.json'.length);

    expect(entries).toHaveLength(manifest.files.length + 1);
    for (const file of manifest.files) {
      const entry = entries.find((candidate) => candidate.path === folder + file.path);
      expect(entry, file.path).toBeDefined();
      expect(sha256(entry!.bytes), file.path).toBe(file.sha256);
    }
  });

  it('reads a stored (uncompressed) member and its timestamp', () => {
    const [entry] = readZip(handMadeZip({ name: 'kit/plain.txt', data: Buffer.from('plain') }));
    expect(entry!.path).toBe('kit/plain.txt');
    expect(entry!.bytes.toString('utf8')).toBe('plain');
    expect(entry!.modified).toEqual(new Date(Date.UTC(2025, 10, 1, 0, 0, 0)));
  });
});

describe('writeZip', () => {
  it('produces an archive our reader returns unchanged, in the given order', () => {
    const entries = readZip(writeZip(sample, MODIFIED));
    expect(entries.map((entry) => entry.path)).toEqual(sample.map((entry) => entry.path));
    entries.forEach((entry, index) => expect(entry.bytes.equals(sample[index]!.bytes)).toBe(true));
  });

  it('produces an archive an independent zip reader extracts to the same bytes', () => {
    const archive = writeZip(sample, MODIFIED);
    for (const entry of sample) {
      expect(extractWithSystemTool(archive, entry.path).equals(entry.bytes), entry.path).toBe(true);
    }
  });

  it('dates every member with the date it is given, not the time it runs', () => {
    const entries = readZip(writeZip(sample, MODIFIED));
    for (const entry of entries) expect(entry.modified, entry.path).toEqual(MODIFIED);
    const otherDay = new Date(Date.UTC(2026, 10, 4, 0, 0, 0));
    expect(writeZip(sample, otherDay).equals(writeZip(sample, MODIFIED))).toBe(false);
  });

  it('is deterministic: the same members and date give byte-identical archives', () => {
    expect(writeZip(sample, MODIFIED).equals(writeZip(sample, MODIFIED))).toBe(true);
  });

  it('round-trips a received kit member for member', () => {
    const original = readZip(fs.readFileSync(path.join(RELEASE_LABS, KITS[0]!)));
    const rewritten = readZip(writeZip(original, MODIFIED));
    expect(rewritten.map((entry) => [entry.path, sha256(entry.bytes)])).toEqual(
      original.map((entry) => [entry.path, sha256(entry.bytes)]),
    );
  });
});

describe('readZip refuses what it does not support, by name', () => {
  const plain = { name: 'kit/plain.txt', data: Buffer.from('plain text') };

  it('refuses bytes that are not a zip archive', () => {
    expect(() => readZip(Buffer.from('this is not a zip archive at all'))).toThrow(/zip/i);
  });

  it('refuses an encrypted member', () => {
    expect(() => readZip(handMadeZip({ ...plain, flags: 1 }))).toThrow(/encrypt/i);
  });

  it('refuses a compression method other than stored or deflated', () => {
    expect(() => readZip(handMadeZip({ ...plain, method: 12 }))).toThrow(/method/i);
  });

  it('refuses a zip64 archive', () => {
    const archive = handMadeZip(plain);
    archive.writeUInt32LE(0xffffffff, archive.length - 22 + 16);
    expect(() => readZip(archive)).toThrow(/zip64/i);
  });

  it('refuses a multi-disk archive', () => {
    expect(() => readZip(handMadeZip(plain, { disk: 1 }))).toThrow(/disk/i);
  });

  it('refuses a member whose bytes do not match its checksum, naming it', () => {
    const damaged = handMadeZip({ ...plain, crc: (zlib.crc32(plain.data) ^ 1) >>> 0 });
    expect(() => readZip(damaged)).toThrow(/kit\/plain\.txt/);
  });

  it.each([
    ['a parent-directory step', '../escape.txt'],
    ['an absolute path', '/etc/escape.txt'],
    ['a backslash path', 'kit\\escape.txt'],
    ['a directory entry', 'kit/folder/'],
  ])('refuses %s', (_label, name) => {
    expect(() => readZip(handMadeZip({ name, data: Buffer.alloc(0) }))).toThrow(
      new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    );
  });
});

describe('writeZip refuses a date a zip cannot record (found while profiling, 2026-11-03)', () => {
  it.each([
    ['before 1980', new Date(Date.UTC(1979, 11, 31))],
    ['after 2107', new Date(Date.UTC(2108, 0, 1))],
    ['not a date at all', new Date('not a date')],
  ])('refuses a member date %s, naming the range', (_label, date) => {
    expect(() => writeZip(sample, date)).toThrow(/1980.*2107/);
  });
});
