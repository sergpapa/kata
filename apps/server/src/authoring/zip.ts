export interface ZipEntry {
  readonly path: string;
  readonly bytes: Buffer;
}

export function readZip(_archive: Buffer): ZipEntry[] {
  throw new Error('not implemented');
}

export function writeZip(_entries: readonly ZipEntry[], _modified: Date): Buffer {
  throw new Error('not implemented');
}
