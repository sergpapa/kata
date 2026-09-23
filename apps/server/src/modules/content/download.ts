/**
 * Turning a release's own filename into a header a browser will honour.
 *
 * A lab kit's filename comes out of the release manifest, and ADR 0005 says release content is
 * untrusted data. Interpolated straight into `content-disposition` it is not: a `"` closes the
 * quoted string and lets the rest of the name assert header parameters of its own, a CR or LF makes
 * Node reject the header so the reader gets an unnamed 500 instead of one of this app's named
 * refusals, and a non-ASCII name sent raw arrives mangled — the same "the lesson's instruction is
 * now wrong" outcome that naming the file at all exists to prevent.
 */

/** Characters no header value may carry, whatever a manifest says. */
// eslint-disable-next-line no-control-regex -- naming the control characters is the whole point
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;
/** Everything outside printable ASCII, which the quoted form cannot be trusted to carry. */
const NON_ASCII = /[^\u0020-\u007e]/g;
/** The same class without `g`: a global regex carries `lastIndex`, so `.test` on one is stateful. */
const HAS_NON_ASCII = /[^\u0020-\u007e]/;

/**
 * `attachment`, with the filename in the quoted form every browser has always understood.
 *
 * The RFC 5987 `filename*` form is added only when the quoted form cannot carry the name. Every kit
 * in the shipped release is plain ASCII, and a second parameter repeating `kit-02.zip` byte for
 * byte tells a browser nothing it did not already have. Escaping a quote is not that case: an
 * escaped name is still the name.
 */
export function contentDisposition(fileName: string): string {
  const safe = fileName.replace(CONTROL_CHARACTERS, '');
  const fallback = safe.replace(NON_ASCII, '_').replace(/["\\]/g, '\\$&');
  const quoted = `attachment; filename="${fallback}"`;

  if (!HAS_NON_ASCII.test(safe)) return quoted;

  // Percent-encoded UTF-8. `encodeURIComponent` leaves `!'()*` alone, which the grammar does not.
  const encoded = encodeURIComponent(safe).replace(
    /['()!*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `${quoted}; filename*=UTF-8''${encoded}`;
}
