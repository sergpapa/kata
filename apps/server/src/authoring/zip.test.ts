import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { repoRoot } from '../config.js';
import { readZip, writeZip, type ZipEntry } from './zip.js';

const RELEASE_LABS = path.join(repoRoot, 'content/releases/http-first-fifteen-v1_0_1/content/labs');
const KITS = fs.readdirSync(RELEASE_LABS).filter((name) => name.endsWith('.zip'));
const MODIFIED = new Date(Date.UTC(2026, 10, 3, 12, 0, 0));

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

describe('readZip refuses what it does not support', () => {
  const firstCentralEntry = (archive: Buffer) => archive.readUInt32LE(archive.length - 22 + 16);

  it('refuses bytes that are not a zip archive', () => {
    expect(() => readZip(Buffer.from('this is not a zip archive at all'))).toThrow(/zip/i);
  });

  it('refuses an encrypted member', () => {
    const archive = writeZip([sample[0]!], MODIFIED);
    archive.writeUInt16LE(archive.readUInt16LE(6) | 1, 6);
    const central = firstCentralEntry(archive);
    archive.writeUInt16LE(archive.readUInt16LE(central + 8) | 1, central + 8);
    expect(() => readZip(archive)).toThrow(/encrypt/i);
  });

  it('refuses a zip64 archive', () => {
    const archive = writeZip([sample[0]!], MODIFIED);
    archive.writeUInt32LE(0xffffffff, archive.length - 22 + 16);
    expect(() => readZip(archive)).toThrow(/zip64/i);
  });

  it('refuses a member whose bytes were damaged', () => {
    const archive = writeZip([sample[2]!], MODIFIED);
    const dataStart = 30 + Buffer.byteLength(sample[2]!.path);
    archive[dataStart + 5] = archive[dataStart + 5]! ^ 0xff;
    expect(() => readZip(archive)).toThrow();
  });

  it('refuses a member path that would escape the folder it is extracted into', () => {
    const archive = writeZip([{ path: 'aa/escape.txt', bytes: Buffer.from('x') }], MODIFIED);
    const name = Buffer.from('aa/');
    const escaped = Buffer.from('../');
    let at = archive.indexOf(name);
    while (at !== -1) {
      escaped.copy(archive, at);
      at = archive.indexOf(name, at + 1);
    }
    expect(() => readZip(archive)).toThrow(/escape|\.\./i);
  });
});
