import { describe, expect, it } from 'vitest';
import { contentDisposition } from './download.js';

/**
 * A lab kit's filename comes out of the release manifest, and ADR 0005 says manifest content is
 * untrusted data. Nothing in the importer restricts what characters a basename may hold beyond
 * "does not escape the release", so the header this builds is the last place a hostile or merely
 * careless name can be caught.
 *
 * Added after `/code-review` found the name being interpolated into the header raw.
 */

describe('the download filename header', () => {
  it('names an ordinary kit exactly, and says nothing more', () => {
    // The five shipped kits are all plain ASCII. A second `filename*` parameter repeating the same
    // bytes tells a browser nothing it did not already have.
    expect(contentDisposition('HTTP_Lesson_02_Local_Server_Kit_v1.zip')).toBe(
      'attachment; filename="HTTP_Lesson_02_Local_Server_Kit_v1.zip"',
    );
  });

  it('escapes a quote, so a name cannot close the string and assert parameters of its own', () => {
    const header = contentDisposition('kit"; filename="passwd.zip');

    expect(header).toBe('attachment; filename="kit\\"; filename=\\"passwd.zip"');

    // Parsed the way a browser parses it, not scanned for the text `filename=`: a scan counts the
    // escaped one *inside* the quotes and reports an injection that is not there. The claim is that
    // the whole header is one parameter whose value unescapes to exactly the name we were given.
    const quoted = /^attachment; filename="((?:[^"\\]|\\.)*)"$/.exec(header);
    expect(quoted, 'the header must be one quoted filename and nothing else').not.toBeNull();
    expect((quoted?.[1] ?? '').replace(/\\(.)/g, '$1')).toBe('kit"; filename="passwd.zip');
  });

  it('escapes a backslash, which would otherwise escape the closing quote', () => {
    expect(contentDisposition('kit\\.zip')).toBe('attachment; filename="kit\\\\.zip"');
  });

  it('drops control characters, which make Node refuse the header outright', () => {
    // Without this the reader gets an unnamed 500 from ERR_INVALID_CHAR instead of a kit or one of
    // this app's named refusals.
    const header = contentDisposition('kit\r\nX-Injected: yes\u0000.zip');

    // eslint-disable-next-line no-control-regex -- the control characters are what is under test
    expect(header).not.toMatch(/[\r\n\u0000]/);
    expect(header).toBe('attachment; filename="kitX-Injected: yes.zip"');
  });

  it('carries a non-ASCII name in the form that survives, and a readable fallback', () => {
    const header = contentDisposition('kit-ανάπτυξη.zip');

    // The quoted form is ASCII by definition — a browser reading only that form cannot be assumed
    // to decode anything else — so the real bytes travel in the RFC 5987 parameter beside it.
    expect(header).toBe(
      'attachment; filename="kit-________.zip"; filename*=UTF-8\'\'kit-%CE%B1%CE%BD%CE%AC%CF%80%CF%84%CF%85%CE%BE%CE%B7.zip',
    );
  });

  it('percent-encodes the characters RFC 5987 does not allow bare', () => {
    // `encodeURIComponent` leaves `!'()*` alone and the grammar does not.
    const header = contentDisposition("kit'(1)!*é.zip");

    const extended = /filename\*=UTF-8''(.+)$/.exec(header)?.[1] ?? '';
    expect(extended).not.toMatch(/['()!*]/);
  });
});
