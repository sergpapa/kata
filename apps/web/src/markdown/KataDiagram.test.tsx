import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, within } from '@testing-library/react';
import {
  fence,
  KATA,
  kataRegion,
  lesson,
  stubMatchMedia,
  SVG,
} from '../testkit/kataDiagramFixture.js';

/**
 * Criteria KD5 to KD8 in docs/specs/kata-diagrams.md, driven through the lesson renderer as a
 * black box: Markdown goes in, the document is inspected. Pairing with a Mermaid fallback, and
 * naming, are in KataDiagramPairing.test.tsx.
 *
 * Mermaid is mocked as in MermaidDiagram.test.tsx, because jsdom cannot draw it. Here the mock is
 * also a witness: a Kata diagram that draws must never have asked Mermaid for anything (KD14).
 * Layout and colour (KD9 to KD12) need a real browser and are checked by tools/screenshots.mjs.
 */

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

beforeEach(() => {
  stubMatchMedia();
  mermaid.parse.mockResolvedValue(true);
  mermaid.render.mockResolvedValue({ svg: SVG });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('a valid Kata diagram is drawn from the page’s own elements (KD5)', () => {
  it('puts every label, note, step, phase and the caption into the document as text', () => {
    const container = lesson(fence('kata-diagram', KATA));
    const region = kataRegion(container);
    const text = region.textContent ?? '';

    for (const expected of [
      'Test runner',
      'your test code',
      'Browser tab',
      'a real browser',
      'Booking site',
      'Open the page',
      'Check the result',
      'Open the rooms page',
      'Ask for the rooms page',
      'The rooms page',
      'Is a heading visible?',
      'the only check',
      'Record the test as passed',
      'One passing run.',
      'The runner never talks to the site.',
    ]) {
      expect(text).toContain(expected);
    }
  });

  it('shows markup in authored text as the characters typed, never as elements', () => {
    const hostile = JSON.stringify({
      kind: 'sequence',
      participants: [
        { id: 'a', label: '<b>Bold</b>', note: '<img src=x onerror=alert(1)>' },
        { id: 'b', label: 'B' },
      ],
      steps: [
        { phase: '<script>alert(2)</script>' },
        { from: 'a', to: 'b', say: '<a href="javascript:alert(3)">go</a>', note: '<i>n</i>' },
      ],
      caption: { lead: '<em>lead</em>', text: '<u>text</u>' },
    });
    const region = kataRegion(lesson(fence('kata-diagram', hostile)));
    const text = region.textContent ?? '';

    for (const typed of [
      '<b>Bold</b>',
      '<img src=x onerror=alert(1)>',
      '<script>alert(2)</script>',
      '<a href="javascript:alert(3)">go</a>',
      '<i>n</i>',
      '<em>lead</em>',
      '<u>text</u>',
    ]) {
      expect(text).toContain(typed);
    }
    expect(region.querySelectorAll('b, img, script, a, i, em, u')).toHaveLength(0);
  });

  it('uses no frame of any kind and never asks Mermaid', () => {
    const container = lesson(fence('kata-diagram', KATA));

    expect(container.querySelector('iframe')).toBeNull();
    expect(mermaid.parse).not.toHaveBeenCalled();
    expect(mermaid.render).not.toHaveBeenCalled();
  });
});

describe('steps, phases and who says what (KD6, KD7)', () => {
  it('groups steps under their phases, numbered from 1 across the groups', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));

    const groups = within(region).getAllByRole('group');
    expect(groups.map((group) => group.getAttribute('aria-label') ?? group.textContent)).toEqual([
      expect.stringContaining('Open the page'),
      expect.stringContaining('Check the result'),
    ]);

    const lists = groups.map((group) => group.querySelector('ol'));
    expect(lists.map((list) => list?.querySelectorAll(':scope > li').length)).toEqual([3, 3]);
    expect(lists.map((list) => list?.getAttribute('start') ?? '1')).toEqual(['1', '4']);
  });

  it('says each step’s number in words, which unstyled list markers cannot be relied on to do', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));
    const steps = [...region.querySelectorAll('ol > li')].map((item) => item.textContent ?? '');

    expect(steps.map((step) => /^Step (\d+):/.exec(step)?.[1])).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(region.querySelector('.kd-number')?.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('says in text who sends each step to whom, in authored order', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));
    const steps = [...region.querySelectorAll('ol > li')].map((item) => item.textContent ?? '');

    expect(steps).toHaveLength(6);
    expect(steps[0]).toContain('Test runner → Browser tab');
    expect(steps[0]).toContain('Open the rooms page');
    expect(steps[1]).toContain('Browser tab → Booking site');
    expect(steps[2]).toContain('Booking site → Browser tab');
    expect(steps[5]).toContain('Test runner, on its own');
    expect(steps[5]).toContain('Record the test as passed');
  });

  it('says "(reply)" on a reply and only on a reply', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));
    const steps = [...region.querySelectorAll('ol > li')].map((item) => item.textContent ?? '');

    expect(steps.map((step) => step.includes('(reply)'))).toEqual([
      false,
      false,
      true,
      false,
      true,
      false,
    ]);
  });

  it('says "Key step" on a highlighted step and only there, with its note', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));
    const steps = [...region.querySelectorAll('ol > li')].map((item) => item.textContent ?? '');

    expect(steps.map((step) => step.includes('Key step'))).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(steps[3]).toContain('the only check');
  });

  it('draws steps with no phase as one unlabelled group', () => {
    const plain = JSON.stringify({
      kind: 'sequence',
      participants: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
      steps: [
        { from: 'a', to: 'b', say: 'one' },
        { from: 'b', to: 'a', say: 'two', reply: true },
      ],
    });
    const region = kataRegion(lesson(fence('kata-diagram', plain)));

    expect(region.querySelectorAll('ol')).toHaveLength(1);
    expect(region.querySelectorAll('ol > li')).toHaveLength(2);
  });
});

describe('the caption (KD8)', () => {
  it('shows the lead in bold, inside the figure caption', () => {
    const region = kataRegion(lesson(fence('kata-diagram', KATA)));
    const caption = region.querySelector('figcaption');

    expect(caption?.querySelector('strong')?.textContent).toBe('One passing run.');
    expect(caption?.textContent).toContain('The runner never talks to the site.');
  });

  it('has no caption when the author wrote none', () => {
    const bare = JSON.stringify({ ...JSON.parse(KATA), caption: undefined });
    const region = kataRegion(lesson(fence('kata-diagram', bare)));

    expect(region.querySelector('figcaption')).toBeNull();
  });
});
