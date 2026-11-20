import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria KD5 to KD8 and KD13 to KD17 in docs/specs/kata-diagrams.md, driven through the lesson
 * renderer as a black box: Markdown goes in, the document is inspected.
 *
 * Mermaid is mocked as in MermaidDiagram.test.tsx, because jsdom cannot draw it. Here the mock is
 * also a witness: a Kata diagram that draws must never have asked Mermaid for anything (KD14).
 * Layout and colour (KD9 to KD12) need a real browser and are checked by tools/screenshots.mjs.
 */

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

const SVG =
  '<svg id="m-1" width="100%" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" ' +
  'role="graphics-document document" aria-roledescription="sequence"><g><text>A</text></g></svg>';

beforeEach(() => {
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
  mermaid.parse.mockResolvedValue(true);
  mermaid.render.mockResolvedValue({ svg: SVG });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const KATA = JSON.stringify(
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

const BROKEN = KATA.replace('"to": "site"', '"to": "sitee"');

const MERMAID = 'sequenceDiagram\n    Runner->>Browser: Open the rooms page\n';

function fence(language: string, body: string): string {
  return ['```' + language, body.replace(/\n$/, ''), '```'].join('\n');
}

function md(...blocks: string[]): string {
  return blocks.join('\n\n');
}

const IN_WORDS = 'In words: the runner opens the page through the browser.';

function lesson(markdown: string, place?: string) {
  return render(<LessonMarkdown markdown={markdown} place={place} />).container;
}

function kataRegion(container: HTMLElement): HTMLElement {
  const region = within(container).getByRole('region', { name: /^Diagram 1: Sequence diagram/ });
  expect(region.querySelector('iframe')).toBeNull();
  return region;
}

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

describe('the Mermaid fence after it is its fallback (KD13, KD14)', () => {
  it('draws only the Kata diagram, leaves no trace of the fallback and never loads Mermaid', () => {
    const container = lesson(md(fence('kata-diagram', KATA), fence('mermaid', MERMAID), IN_WORDS));

    expect(within(container).getAllByRole('region', { name: /^Diagram/ })).toHaveLength(1);
    expect(container.textContent).not.toContain('Runner->>Browser');
    expect(container.querySelectorAll('.diagram')).toHaveLength(1);
    expect(container.querySelectorAll('details')).toHaveLength(1);
    expect(container.querySelector('iframe')).toBeNull();
    expect(mermaid.parse).not.toHaveBeenCalled();
    expect(mermaid.render).not.toHaveBeenCalled();
  });

  it('counts the pair as one diagram, so the next diagram is Diagram 2', async () => {
    const container = lesson(
      md(
        fence('kata-diagram', KATA),
        fence('mermaid', MERMAID),
        IN_WORDS,
        'Later in the lesson:',
        fence('mermaid', 'sequenceDiagram\n    A->>B: later\n'),
      ),
    );

    kataRegion(container);
    await waitFor(() =>
      expect(
        within(container).getByRole('region', { name: 'Diagram 2: Sequence diagram' }),
      ).toBeTruthy(),
    );
    expect(mermaid.render).toHaveBeenCalledTimes(1);
    expect(mermaid.render.mock.calls[0]?.[1]).toContain('A->>B: later');
  });

  it('pairs them across several blank lines', () => {
    const container = lesson(
      [fence('kata-diagram', KATA), '', '', '', fence('mermaid', MERMAID)].join('\n\n'),
    );

    expect(within(container).getAllByRole('region', { name: /^Diagram/ })).toHaveLength(1);
    expect(mermaid.render).not.toHaveBeenCalled();
  });

  it('takes only the first of two Mermaid fences as the fallback', async () => {
    const second = 'sequenceDiagram\n    A->>B: second\n';
    const container = lesson(
      md(fence('kata-diagram', KATA), fence('mermaid', MERMAID), fence('mermaid', second)),
    );

    kataRegion(container);
    await waitFor(() =>
      expect(
        within(container).getByRole('region', { name: 'Diagram 2: Sequence diagram' }),
      ).toBeTruthy(),
    );
    expect(mermaid.render).toHaveBeenCalledTimes(1);
    expect(mermaid.render.mock.calls[0]?.[1]).toBe(second);
  });

  it('does not pair a Mermaid fence that a paragraph separates from the Kata fence', async () => {
    const container = lesson(
      md(fence('kata-diagram', KATA), 'A paragraph between them.', fence('mermaid', MERMAID)),
    );

    kataRegion(container);
    await waitFor(() =>
      expect(
        within(container).getByRole('region', { name: 'Diagram 2: Sequence diagram' }),
      ).toBeTruthy(),
    );
    expect(mermaid.render.mock.calls[0]?.[1]).toContain('Runner->>Browser');
  });

  it('does not pair a Mermaid fence that comes before the Kata fence', async () => {
    const container = lesson(md(fence('mermaid', MERMAID), fence('kata-diagram', KATA)));

    await waitFor(() =>
      expect(
        within(container).getByRole('region', { name: 'Diagram 1: Sequence diagram' }),
      ).toBeTruthy(),
    );
    expect(
      within(container).getByRole('region', { name: 'Diagram 2: Sequence diagram' }),
    ).toBeTruthy();
    expect(mermaid.render).toHaveBeenCalledTimes(1);
  });
});

describe('a refused Kata diagram with a fallback (KD15)', () => {
  it('draws the Mermaid fallback as today and says why in a closed disclosure', async () => {
    const container = lesson(
      md(fence('kata-diagram', BROKEN), fence('mermaid', MERMAID), IN_WORDS),
    );

    await waitFor(() => expect(container.querySelector('.diagram-scroll iframe')).not.toBeNull());
    expect(mermaid.render.mock.calls[0]?.[1]).toBe(MERMAID);

    const why = [...container.querySelectorAll('details')].find((details) =>
      (details.querySelector('summary')?.textContent ?? '').includes(
        'Why this diagram is shown in its fallback form',
      ),
    );
    expect(why).toBeDefined();
    expect(why?.open).toBe(false);
    expect(why?.textContent).toContain('steps[2].to: "sitee" is not a participant');

    expect(screen.queryByText(/could not be drawn/i)).toBeNull();
    expect(
      within(container).getAllByRole('region', { name: /^Diagram 1: Sequence diagram/ }),
    ).toHaveLength(1);
  });

  it('keeps the fallback described by the "In words:" paragraph', async () => {
    const container = lesson(
      md(fence('kata-diagram', BROKEN), fence('mermaid', MERMAID), IN_WORDS),
    );

    const region = await waitFor(() =>
      within(container).getByRole('region', { name: 'Diagram 1: Sequence diagram' }),
    );
    const described = document.getElementById(region.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe(IN_WORDS);
  });
});

describe('a refused Kata diagram with no fallback (KD16)', () => {
  it('says it could not be drawn, shows its source, and says why', async () => {
    const container = lesson(md(fence('kata-diagram', BROKEN), IN_WORDS));

    await waitFor(() =>
      expect(container.querySelector('[role="status"]')?.textContent).toMatch(
        /could not be drawn/i,
      ),
    );
    const blocks = [...container.querySelectorAll('pre')].map((block) => block.textContent ?? '');
    expect(blocks).toContain(BROKEN + '\n');

    const why = [...container.querySelectorAll('details')].find(
      (details) => details.querySelector('summary')?.textContent === 'Why it could not be drawn',
    );
    expect(why?.textContent).toContain('steps[2].to: "sitee" is not a participant');
    expect(mermaid.render).not.toHaveBeenCalled();
  });
});

describe('its name, its description and its source (KD17)', () => {
  it('is described by the "In words:" paragraph after its fallback', () => {
    const container = lesson(md(fence('kata-diagram', KATA), fence('mermaid', MERMAID), IN_WORDS));
    const region = kataRegion(container);

    const described = document.getElementById(region.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe(IN_WORDS);
  });

  it('is described by the "In words:" paragraph straight after it when it has no fallback', () => {
    const container = lesson(md(fence('kata-diagram', KATA), IN_WORDS));
    const region = kataRegion(container);

    const described = document.getElementById(region.getAttribute('aria-describedby') ?? '');
    expect(described?.textContent).toBe(IN_WORDS);
  });

  it('is described by nothing when no "In words:" paragraph follows', () => {
    const region = kataRegion(lesson(md(fence('kata-diagram', KATA), 'Just a paragraph.')));

    expect(region.hasAttribute('aria-describedby')).toBe(false);
  });

  it('names its place when it is not in the lesson body', () => {
    const container = lesson(fence('kata-diagram', KATA), 'the prompt for Practice A');

    expect(
      within(container).getByRole('region', {
        name: 'Diagram 1: Sequence diagram in the prompt for Practice A',
      }),
    ).toBeTruthy();
  });

  it('keeps its exact source behind a closed "Show diagram source" disclosure', () => {
    const container = lesson(fence('kata-diagram', KATA));

    const source = [...container.querySelectorAll('details')].find(
      (details) => details.querySelector('summary')?.textContent === 'Show diagram source',
    );
    expect(source?.open).toBe(false);
    expect(source?.querySelector('pre')?.textContent).toBe(KATA + '\n');
  });
});
