import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import {
  BROKEN,
  fence,
  IN_WORDS,
  KATA,
  kataRegion,
  lesson,
  md,
  MERMAID,
  stubMatchMedia,
  SVG,
} from '../testkit/kataDiagramFixture.js';

/**
 * Criteria KD13 to KD17 in docs/specs/kata-diagrams.md: a Kata fence and the Mermaid fence after
 * it as one diagram, what is drawn when the Kata fence is refused, and the drawn diagram's name,
 * description and source. Driven through the lesson renderer as a black box.
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
