/**
 * Reads a `kata-diagram` fence: authored JSON in, a checked diagram or a refusal out.
 *
 * The contract is criteria KD1 to KD4 in docs/specs/kata-diagrams.md; the reasoning is ADR 0025.
 * Lesson content is untrusted input (ADR 0005), and this is the only thing between it and a
 * drawing, so it is strict on purpose: a key it does not know, a participant nobody declared, or a
 * value of the wrong type is refused rather than skipped. A skipped typo is a diagram that quietly
 * says less than its author wrote. Every refusal starts with the JSON path of what it refuses, so
 * the reviewer reading "Why it could not be drawn" can go straight to the line.
 */

export interface Participant {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
}

export interface MessageStep {
  readonly kind: 'message';
  readonly from: string;
  readonly to: string;
  readonly say: string;
  readonly reply: boolean;
  readonly highlight: boolean;
  readonly note?: string;
}

export interface PhaseStep {
  readonly kind: 'phase';
  readonly label: string;
}

export type Step = MessageStep | PhaseStep;

export interface SequenceDiagram {
  readonly kind: 'sequence';
  readonly participants: readonly Participant[];
  readonly steps: readonly Step[];
  readonly caption?: { readonly lead: string; readonly text: string };
}

export type KataReading =
  | { readonly ok: true; readonly diagram: SequenceDiagram }
  | { readonly ok: false; readonly reason: string };

/** The most participants a column layout can hold with labels still readable at 768px. */
const MOST_PARTICIPANTS = 5;

/** Thrown inside the reader and turned into a refusal at its edge; never escapes this module. */
class Refusal extends Error {}

type Json = Record<string, unknown>;

function refuse(where: string, what: string): never {
  throw new Refusal(`${where}: ${what}`);
}

function isObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function onlyKeys(value: Json, where: string, allowed: readonly string[]): void {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    refuse(
      where,
      `unknown ${unknown.length === 1 ? 'key' : 'keys'} ${unknown.map((key) => JSON.stringify(key)).join(', ')}` +
        ` (expected ${allowed.join(', ')})`,
    );
  }
}

function text(value: unknown, where: string): string {
  if (typeof value !== 'string' || value.trim() === '') refuse(where, 'must be non-empty text');
  return value;
}

function optionalText(value: unknown, where: string): string | undefined {
  return value === undefined ? undefined : text(value, where);
}

function flag(value: unknown, where: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== 'boolean')
    refuse(where, `must be true or false, not ${JSON.stringify(value)}`);
  return value;
}

function participantsOf(value: unknown): Participant[] {
  if (!Array.isArray(value)) refuse('participants', 'must be a list');
  if (value.length < 2 || value.length > MOST_PARTICIPANTS) {
    refuse('participants', `a sequence needs 2 to ${MOST_PARTICIPANTS}, found ${value.length}`);
  }
  const seen = new Set<string>();
  return value.map((entry: unknown, index) => {
    const where = `participants[${index}]`;
    if (!isObject(entry)) refuse(where, 'must be an object');
    onlyKeys(entry, where, ['id', 'label', 'note']);
    const id = text(entry.id, `${where}.id`);
    if (seen.has(id)) refuse(`${where}.id`, `${JSON.stringify(id)} is already used`);
    seen.add(id);
    const note = optionalText(entry.note, `${where}.note`);
    const label = text(entry.label, `${where}.label`);
    return note === undefined ? { id, label } : { id, label, note };
  });
}

function stepsOf(value: unknown, participants: readonly Participant[]): Step[] {
  if (!Array.isArray(value)) refuse('steps', 'must be a list');
  const ids = participants.map((participant) => participant.id);
  const participant = (raw: unknown, where: string): string => {
    const id = text(raw, where);
    if (!ids.includes(id))
      refuse(where, `${JSON.stringify(id)} is not a participant (${ids.join(', ')})`);
    return id;
  };

  const steps = value.map((entry: unknown, index): Step => {
    const where = `steps[${index}]`;
    if (!isObject(entry)) refuse(where, 'must be an object');
    if ('phase' in entry) {
      onlyKeys(entry, where, ['phase']);
      return { kind: 'phase', label: text(entry.phase, `${where}.phase`) };
    }
    onlyKeys(entry, where, ['from', 'to', 'say', 'reply', 'highlight', 'note']);
    const note = optionalText(entry.note, `${where}.note`);
    const step: MessageStep = {
      kind: 'message',
      from: participant(entry.from, `${where}.from`),
      to: participant(entry.to, `${where}.to`),
      say: text(entry.say, `${where}.say`),
      reply: flag(entry.reply, `${where}.reply`),
      highlight: flag(entry.highlight, `${where}.highlight`),
    };
    return note === undefined ? step : { ...step, note };
  });

  if (!steps.some((step) => step.kind === 'message')) {
    refuse('steps', 'a sequence needs at least one message, not only phases');
  }
  return steps;
}

function captionOf(value: unknown): SequenceDiagram['caption'] {
  if (value === undefined) return undefined;
  if (!isObject(value)) refuse('caption', 'must be an object');
  onlyKeys(value, 'caption', ['lead', 'text']);
  return { lead: text(value.lead, 'caption.lead'), text: text(value.text, 'caption.text') };
}

/** Reads one fence's text. Never throws: every problem comes back as a refusal with its path. */
export function readKataDiagram(source: string): KataReading {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (failure) {
    return { ok: false, reason: `(top level): not JSON — ${(failure as Error).message}` };
  }

  try {
    if (!isObject(parsed)) refuse('(top level)', 'the fence must hold one JSON object');
    onlyKeys(parsed, '(top level)', ['kind', 'participants', 'steps', 'caption']);
    if (parsed.kind !== 'sequence') {
      refuse('kind', `only "sequence" is known, found ${JSON.stringify(parsed.kind ?? null)}`);
    }
    const participants = participantsOf(parsed.participants);
    const steps = stepsOf(parsed.steps, participants);
    const caption = captionOf(parsed.caption);
    const diagram: SequenceDiagram = caption
      ? { kind: 'sequence', participants, steps, caption }
      : { kind: 'sequence', participants, steps };
    return { ok: true, diagram };
  } catch (failure) {
    if (failure instanceof Refusal) return { ok: false, reason: failure.message };
    throw failure;
  }
}
