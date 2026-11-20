import { expect } from 'vitest';
import { render, within } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';

/**
 * What the two Kata-diagram rendering suites share (docs/specs/kata-diagrams.md KD5 to KD17): one
 * authored diagram, a broken copy of it, a Mermaid fallback, and the helpers that put them on a
 * lesson page. Each suite still mocks Mermaid itself, because `vi.mock` is hoisted per file.
 */

/** Shaped like Mermaid's real output, with the viewBox the frame is sized from. */
export const SVG =
  '<svg id="m-1" width="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" ' +
  'role="graphics-document document" aria-roledescription="sequence"><g><text>A</text></g></svg>';

/** jsdom has no `matchMedia`, and a Mermaid diagram reads the colour scheme through it. */
export function stubMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      media: query,
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
      onchange: null,
    }),
  });
}

export const KATA = JSON.stringify(
  {
    kind: 'sequence',
    participants: [
      { id: 'runner', label: 'Test runner', note: 'your test code' },
      { id: 'browser', label: 'Browser tab', note: 'a real browser' },
      { id: 'site', label: 'Booking site' },
    ],
    steps: [
      { phase: 'Open the page' },
      { from: 'runner', to: 'browser', say: 'Open the rooms page' },
      { from: 'browser', to: 'site', say: 'Ask for the rooms page' },
      { from: 'site', to: 'browser', say: 'The rooms page', reply: true },
      { phase: 'Check the result' },
      {
        from: 'runner',
        to: 'browser',
        say: 'Is a heading visible?',
        highlight: true,
        note: 'the only check',
      },
      { from: 'browser', to: 'runner', say: 'Yes', reply: true },
      { from: 'runner', to: 'runner', say: 'Record the test as passed' },
    ],
    caption: { lead: 'One passing run.', text: 'The runner never talks to the site.' },
  },
  null,
  2,
);

/** KATA with step 2 sent to a participant nobody declared. */
export const BROKEN = KATA.replace('"to": "site"', '"to": "sitee"');

export const MERMAID = 'sequenceDiagram\n    Runner->>Browser: Open the rooms page\n';

export const IN_WORDS = 'In words: the runner opens the page through the browser.';

export function fence(language: string, body: string): string {
  return ['```' + language, body.replace(/\n$/, ''), '```'].join('\n');
}

export function md(...blocks: string[]): string {
  return blocks.join('\n\n');
}

export function lesson(markdown: string, place?: string): HTMLElement {
  const where = place === undefined ? {} : { place };
  return render(<LessonMarkdown markdown={markdown} {...where} />).container;
}

/** The drawn Kata diagram, which must be in the page itself rather than in a frame. */
export function kataRegion(container: HTMLElement): HTMLElement {
  const region = within(container).getByRole('region', { name: /^Diagram 1: Sequence diagram/ });
  expect(region.querySelector('iframe')).toBeNull();
  return region;
}
