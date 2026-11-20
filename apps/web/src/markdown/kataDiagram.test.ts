import { describe, expect, it } from 'vitest';
import { readKataDiagram } from './kataDiagram.js';

/**
 * Criteria KD1 to KD4 in docs/specs/kata-diagrams.md: what a `kata-diagram` fence may say, and
 * what the reader answers when it says something else.
 *
 * The reader is the only thing between authored text and a drawing, so every refusal here is a
 * diagram that would otherwise have been drawn with something missing or misattributed.
 */

const VALID = {
  kind: 'sequence',
  participants: [
    { id: 'runner', label: 'Test runner', note: 'your test code' },
    { id: 'browser', label: 'Browser tab' },
    { id: 'site', label: 'Booking site' },
  ],
  steps: [
    { phase: 'Open the page' },
    { from: 'runner', to: 'browser', say: 'Open the rooms page' },
    { from: 'browser', to: 'site', say: 'Ask for the rooms page' },
    { from: 'site', to: 'browser', say: 'The rooms page', reply: true },
    { phase: 'Check' },
    {
      from: 'runner',
      to: 'runner',
      say: 'Record the test as passed',
      highlight: true,
      note: 'the total was never read',
    },
  ],
  caption: { lead: 'One run.', text: 'The runner never talks to the site.' },
};

/** VALID with one change, made by `edit` on a deep copy. */
function variant(edit: (diagram: typeof VALID & Record<string, unknown>) => void): string {
  const copy = structuredClone(VALID) as typeof VALID & Record<string, unknown>;
  edit(copy);
  return JSON.stringify(copy);
}

function refusal(source: string): string {
  const reading = readKataDiagram(source);
  if (reading.ok) throw new Error(`expected a refusal, but the diagram was read: ${source}`);
  return reading.reason;
}

describe('a valid sequence (KD3)', () => {
  it('is read with every participant, step, phase and the caption, in authored order', () => {
    const reading = readKataDiagram(JSON.stringify(VALID));
    if (!reading.ok) throw new Error(reading.reason);

    expect(reading.diagram).toEqual({
      kind: 'sequence',
      participants: [
        { id: 'runner', label: 'Test runner', note: 'your test code' },
        { id: 'browser', label: 'Browser tab' },
        { id: 'site', label: 'Booking site' },
      ],
      steps: [
        { kind: 'phase', label: 'Open the page' },
        {
          kind: 'message',
          from: 'runner',
          to: 'browser',
          say: 'Open the rooms page',
          reply: false,
          highlight: false,
        },
        {
          kind: 'message',
          from: 'browser',
          to: 'site',
          say: 'Ask for the rooms page',
          reply: false,
          highlight: false,
        },
        {
          kind: 'message',
          from: 'site',
          to: 'browser',
          say: 'The rooms page',
          reply: true,
          highlight: false,
        },
        { kind: 'phase', label: 'Check' },
        {
          kind: 'message',
          from: 'runner',
          to: 'runner',
          say: 'Record the test as passed',
          reply: false,
          highlight: true,
          note: 'the total was never read',
        },
      ],
      caption: { lead: 'One run.', text: 'The runner never talks to the site.' },
    });
  });

  it('needs no phases, notes or caption', () => {
    const reading = readKataDiagram(
      JSON.stringify({
        kind: 'sequence',
        participants: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        steps: [{ from: 'a', to: 'b', say: 'hello' }],
      }),
    );

    expect(reading.ok).toBe(true);
  });

  it('accepts five participants, the most a column layout can hold', () => {
    const reading = readKataDiagram(
      variant((d) => {
        d.participants.push({ id: 'd', label: 'D' }, { id: 'e', label: 'E' });
      }),
    );

    expect(reading.ok).toBe(true);
  });
});

describe('text that is not one JSON object (KD1)', () => {
  it('is refused with the JSON parser’s own message', () => {
    let parserSays = '';
    try {
      JSON.parse('{ "kind": "sequence", }');
    } catch (failure) {
      parserSays = (failure as Error).message;
    }

    expect(refusal('{ "kind": "sequence", }')).toContain(parserSays);
  });

  it.each([
    ['an array', '[]'],
    ['a string', '"sequence"'],
    ['null', 'null'],
  ])('is refused when the fence holds %s', (_, source) => {
    expect(refusal(source)).toMatch(/one JSON object/);
  });
});

describe('the kind (KD2)', () => {
  it('refuses a kind it does not know, naming the kind it found', () => {
    expect(refusal(variant((d) => (d.kind = 'flow')))).toMatch(/^kind: .*"flow"/);
  });

  it('refuses a diagram with no kind', () => {
    expect(refusal(variant((d) => delete (d as Partial<typeof d>).kind))).toMatch(/^kind: /);
  });
});

describe('participants (KD3, KD4)', () => {
  it('refuses fewer than two', () => {
    expect(refusal(variant((d) => d.participants.splice(1)))).toBe(
      'participants: a sequence needs 2 to 5, found 1',
    );
  });

  it('refuses more than five', () => {
    expect(
      refusal(
        variant((d) => {
          d.participants.push(
            { id: 'd', label: 'D' },
            { id: 'e', label: 'E' },
            { id: 'f', label: 'F' },
          );
        }),
      ),
    ).toMatch(/^participants: .*2 to 5.*found 6/);
  });

  it('refuses two participants with one id, naming the second', () => {
    expect(refusal(variant((d) => (d.participants[2]!.id = 'runner')))).toBe(
      'participants[2].id: "runner" is already used',
    );
  });

  it('refuses an empty id', () => {
    expect(refusal(variant((d) => (d.participants[0]!.id = '')))).toBe(
      'participants[0].id: must be non-empty text',
    );
  });

  it('refuses an empty note', () => {
    expect(refusal(variant((d) => (d.participants[0]!.note = ' ')))).toBe(
      'participants[0].note: must be non-empty text',
    );
  });

  it('refuses an empty label', () => {
    expect(refusal(variant((d) => (d.participants[1]!.label = '  ')))).toMatch(
      /^participants\[1\]\.label: /,
    );
  });

  it('refuses a label that is not a string', () => {
    expect(
      refusal(variant((d) => ((d.participants[0] as Record<string, unknown>).label = 7))),
    ).toMatch(/^participants\[0\]\.label: /);
  });

  it('refuses a key it does not know, so a typo is never silently dropped', () => {
    expect(
      refusal(variant((d) => ((d.participants[0] as Record<string, unknown>).labl = 'x'))),
    ).toMatch(/^participants\[0\]: .*"labl"/);
  });
});

describe('steps (KD3, KD4)', () => {
  it('names the step, the field and the participants when a step names a stranger', () => {
    expect(refusal(variant((d) => ((d.steps[3] as { to: string }).to = 'sitee')))).toBe(
      'steps[3].to: "sitee" is not a participant (runner, browser, site)',
    );
  });

  it('names the step and the field when the sender is a stranger', () => {
    expect(refusal(variant((d) => ((d.steps[1] as { from: string }).from = 'tester')))).toBe(
      'steps[1].from: "tester" is not a participant (runner, browser, site)',
    );
  });

  it('refuses a message that is not text', () => {
    expect(refusal(variant((d) => ((d.steps[2] as Record<string, unknown>).say = 42)))).toBe(
      'steps[2].say: must be non-empty text',
    );
  });

  it('refuses an empty step note', () => {
    expect(refusal(variant((d) => ((d.steps[5] as { note: string }).note = '')))).toBe(
      'steps[5].note: must be non-empty text',
    );
  });

  it.each(['reply', 'highlight', 'note'])('refuses a phase that carries "%s"', (key) => {
    expect(refusal(variant((d) => ((d.steps[4] as Record<string, unknown>)[key] = true)))).toMatch(
      new RegExp(`^steps\\[4\\]: unknown key "${key}"`),
    );
  });

  it('refuses a step with no sender', () => {
    expect(refusal(variant((d) => delete (d.steps[1] as { from?: string }).from))).toMatch(
      /^steps\[1\]\.from: /,
    );
  });

  it('refuses an empty message', () => {
    expect(refusal(variant((d) => ((d.steps[2] as { say: string }).say = '')))).toMatch(
      /^steps\[2\]\.say: /,
    );
  });

  it('refuses a reply flag that is not a boolean', () => {
    expect(refusal(variant((d) => ((d.steps[3] as Record<string, unknown>).reply = 'yes')))).toBe(
      'steps[3].reply: must be true or false, not "yes"',
    );
  });

  it('refuses a highlight flag that is not a boolean', () => {
    expect(
      refusal(variant((d) => ((d.steps[5] as Record<string, unknown>).highlight = 1))),
    ).toMatch(/^steps\[5\]\.highlight: .*true or false/);
  });

  it('refuses an empty phase label', () => {
    expect(refusal(variant((d) => ((d.steps[0] as { phase: string }).phase = '')))).toMatch(
      /^steps\[0\]\.phase: /,
    );
  });

  it('refuses a phase that also carries message fields', () => {
    expect(
      refusal(variant((d) => ((d.steps[0] as Record<string, unknown>).say = 'stray'))),
    ).toMatch(/^steps\[0\]: .*"say"/);
  });

  it('refuses a step with a key it does not know', () => {
    expect(
      refusal(variant((d) => ((d.steps[1] as Record<string, unknown>).tooo = 'site'))),
    ).toMatch(/^steps\[1\]: .*"tooo"/);
  });

  it('refuses a diagram made only of phases, which has nothing to draw', () => {
    expect(
      refusal(
        variant((d) => {
          d.steps = [{ phase: 'Alone' }] as typeof d.steps;
        }),
      ),
    ).toMatch(/^steps: .*at least one message/);
  });

  it('refuses steps that are not a list', () => {
    expect(refusal(variant((d) => ((d as Record<string, unknown>).steps = {})))).toMatch(
      /^steps: /,
    );
  });
});

describe('the caption and the top level (KD3, KD4)', () => {
  it('refuses a caption with an empty lead', () => {
    expect(refusal(variant((d) => (d.caption.lead = '')))).toMatch(/^caption\.lead: /);
  });

  it('refuses a caption with empty text', () => {
    expect(refusal(variant((d) => (d.caption.text = '')))).toBe(
      'caption.text: must be non-empty text',
    );
  });

  it('refuses a caption with a key it does not know', () => {
    expect(refusal(variant((d) => ((d.caption as Record<string, unknown>).body = 'x')))).toMatch(
      /^caption: .*"body"/,
    );
  });

  it('refuses a top-level key it does not know', () => {
    expect(refusal(variant((d) => (d.title = 'x')))).toMatch(/^\(top level\): .*"title"/);
  });
});
