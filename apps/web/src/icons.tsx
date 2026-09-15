import type { ReactNode } from 'react';

/**
 * The eight line icons this interface uses, drawn here rather than installed.
 *
 * The design package's original uses Lucide. A dependency for eight glyphs is not worth its supply
 * chain, and Lucide is not vendored in the package, so copying its paths would be guessing at them
 * from memory. These are drawn to the same visual rules — 24px box, 1.75 stroke, round caps and
 * joins, no fill — which is what makes a set look like a set.
 *
 * Every icon here sits beside its own text label, so each is `aria-hidden`: announcing "book,
 * Learn" tells a screen-reader user one thing twice.
 */
function Glyph({ children }: { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/** The brand mark: angle brackets around a slash, the oldest shorthand there is for code. */
export function CodeIcon() {
  return (
    <Glyph>
      <path d="M8.5 8 4.5 12l4 4" />
      <path d="m15.5 8 4 4-4 4" />
      <path d="M13.5 6.5 10.5 17.5" />
    </Glyph>
  );
}

export function BookIcon() {
  return (
    <Glyph>
      <path d="M5 4.5h9a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H5z" />
      <path d="M5 4.5v12.5" />
      <path d="M19.5 7.5v12" />
    </Glyph>
  );
}

export function TerminalIcon() {
  return (
    <Glyph>
      <path d="m5 7 4.5 4.5L5 16" />
      <path d="M12.5 16.5h6" />
    </Glyph>
  );
}

export function MessageIcon() {
  return (
    <Glyph>
      <path d="M20 14a2.5 2.5 0 0 1-2.5 2.5H9L4.5 20V6.5A2.5 2.5 0 0 1 7 4h10.5A2.5 2.5 0 0 1 20 6.5z" />
    </Glyph>
  );
}

export function LayersIcon() {
  return (
    <Glyph>
      <path d="m12 3.5 8 4.25-8 4.25-8-4.25z" />
      <path d="m4 12.25 8 4.25 8-4.25" />
      <path d="m4 16.5 8 4.25 8-4.25" />
    </Glyph>
  );
}

export function MenuIcon() {
  return (
    <Glyph>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Glyph>
  );
}

export function ChevronRightIcon() {
  return (
    <Glyph>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </Glyph>
  );
}

export function ArrowRightIcon() {
  return (
    <Glyph>
      <path d="M4.5 12h15" />
      <path d="m13 5.5 6.5 6.5-6.5 6.5" />
    </Glyph>
  );
}
