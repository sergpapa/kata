import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  readKataDiagram,
  type MessageStep,
  type Participant,
  type SequenceDiagram,
  type Step,
} from './kataDiagram.js';

/**
 * One authored `kata-diagram` fence, drawn from this page's own elements (ADR 0025).
 *
 * The contract is docs/specs/kata-diagrams.md. Everything here is ordinary React elements holding
 * the author's text as text, so ADR 0007's guarantee holds without a frame: markup in a label is
 * shown as the characters typed. The geometry is CSS in kata-diagram.css, which switches between
 * participant columns and one row per step on the diagram's own width; nothing in this component
 * knows which layout the reader will see.
 *
 * `children` is the fence as a labelled code block, as for a Mermaid diagram: it is the source
 * behind the disclosure when the diagram is drawn, and what the reader sees when it cannot be.
 */
export function KataDiagram({
  source,
  describedBy,
  number,
  place,
  hasFallback,
  children,
}: {
  readonly source: string;
  /** The id of the author's "In words:" paragraph after the diagram (or its fallback), if any. */
  readonly describedBy?: string | undefined;
  /** "Diagram <n>": the region is named "<number>: Sequence diagram<place>" (KD17). */
  readonly number: string;
  readonly place: string;
  /** A Mermaid fence straight after this one will draw instead if this one cannot (KD15). */
  readonly hasFallback: boolean;
  readonly children: ReactNode;
}) {
  const reading = useMemo(() => readKataDiagram(source), [source]);

  if (!reading.ok) {
    // The Mermaid fallback draws itself straight after this; all that is left to say is why.
    if (hasFallback) {
      return (
        <details className="diagram-reason">
          <summary>Why this diagram is shown in its fallback form</summary>
          <p className="diagram-reason-lead">The diagram reader said:</p>
          <pre className="code-block-text" tabIndex={0}>
            {reading.reason}
          </pre>
          {children}
        </details>
      );
    }
    return (
      <div className="diagram">
        <p role="status" className="notice diagram-notice">
          This diagram could not be drawn, so its source is shown below.
        </p>
        {children}
        <details className="diagram-reason">
          <summary>Why it could not be drawn</summary>
          <p className="diagram-reason-lead">The diagram reader said:</p>
          <pre className="code-block-text" tabIndex={0}>
            {reading.reason}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="diagram">
      <div
        className="kata-diagram"
        role="region"
        aria-label={`${number}: Sequence diagram${place}`}
        aria-describedby={describedBy}
      >
        <Sequence diagram={reading.diagram} />
      </div>
      <details className="diagram-source">
        <summary>Show diagram source</summary>
        {children}
      </details>
    </div>
  );
}

/** A run of steps under one phase label, or under none before the first phase. */
interface Group {
  readonly label: string | undefined;
  readonly start: number;
  readonly steps: readonly MessageStep[];
}

/** Splits the authored steps at each phase, numbering messages from 1 across the groups (KD6). */
function groupsOf(steps: readonly Step[]): Group[] {
  const groups: { label: string | undefined; start: number; steps: MessageStep[] }[] = [];
  let count = 0;
  for (const step of steps) {
    if (step.kind === 'phase') {
      groups.push({ label: step.label, start: count + 1, steps: [] });
      continue;
    }
    if (groups.length === 0) groups.push({ label: undefined, start: 1, steps: [] });
    groups[groups.length - 1]!.steps.push(step);
    count += 1;
  }
  // A phase the author closed with no steps under it draws nothing.
  return groups.filter((group) => group.steps.length > 0);
}

/** The custom properties the stylesheet places a step's arrow and label with. */
function placement(step: MessageStep, lane: ReadonlyMap<string, number>, lanes: number) {
  const from = lane.get(step.from) ?? 0;
  const to = lane.get(step.to) ?? 0;
  // The grid has two columns per participant, so lane i's lifeline is the line between columns
  // 2i+1 and 2i+2 — grid line 2i+2. A message runs from one lifeline to the other.
  let start = 2 * Math.min(from, to) + 2;
  let end = 2 * Math.max(from, to) + 2;
  if (from === to) {
    // A step on its own sits beside its lifeline: to the right, or to the left of the last one.
    [start, end] = from === lanes - 1 ? [start - 2, start] : [start, start + 2];
  }
  return {
    '--kd-start': start,
    '--kd-end': end,
  } as CSSProperties;
}

/**
 * Which way a step's arrow points. A step a participant takes on its own loops to the right of
 * its lifeline, or to the left on the last lane, where there is no room to the right.
 */
type Towards = 'left' | 'right' | 'self' | 'self-left';

function towardsOf(step: MessageStep, lane: ReadonlyMap<string, number>, lanes: number): Towards {
  const from = lane.get(step.from) ?? 0;
  const to = lane.get(step.to) ?? 0;
  if (from === to) return from === lanes - 1 ? 'self-left' : 'self';
  return to < from ? 'left' : 'right';
}

function Sequence({ diagram }: { readonly diagram: SequenceDiagram }) {
  const lanes = diagram.participants.length;
  const lane = new Map(diagram.participants.map((participant, at) => [participant.id, at]));
  const label = new Map(diagram.participants.map((participant) => [participant.id, participant]));
  const nameOf = (id: string) => label.get(id)?.label ?? id;

  return (
    <figure className="kd-figure" style={{ '--kd-lanes': lanes } as CSSProperties}>
      <ul className="kd-participants" aria-label="Participants">
        {diagram.participants.map((participant) => (
          <ParticipantCard key={participant.id} participant={participant} />
        ))}
      </ul>
      <div className="kd-steps">
        {/* The lifelines, behind the steps. Decorative: who talks to whom is in each step's text. */}
        <div className="kd-lifelines" aria-hidden="true">
          {diagram.participants.map((participant, at) => (
            <span
              key={participant.id}
              className="kd-lifeline"
              style={{ left: `${((2 * at + 1) / (2 * lanes)) * 100}%` }}
            />
          ))}
        </div>
        {groupsOf(diagram.steps).map((group) => {
          const list = (
            <ol className="kd-list" start={group.start === 1 ? undefined : group.start}>
              {group.steps.map((step, at) => (
                <StepRow
                  key={at}
                  number={group.start + at}
                  step={step}
                  from={nameOf(step.from)}
                  to={nameOf(step.to)}
                  towards={towardsOf(step, lane, lanes)}
                  style={placement(step, lane, lanes)}
                />
              ))}
            </ol>
          );
          return group.label === undefined ? (
            <div key={group.start} className="kd-phase kd-phase-unlabelled">
              {list}
            </div>
          ) : (
            <div key={group.start} className="kd-phase" role="group" aria-label={group.label}>
              {/* The group's name is its aria-label; the visible label would only repeat it. */}
              <p className="kd-phase-label" aria-hidden="true">
                {group.label}
              </p>
              {list}
            </div>
          );
        })}
      </div>
      {diagram.caption ? (
        <figcaption className="kd-caption">
          <strong>{diagram.caption.lead}</strong> {diagram.caption.text}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ParticipantCard({ participant }: { readonly participant: Participant }) {
  return (
    <li className="kd-participant">
      <span className="kd-participant-label">{participant.label}</span>
      {participant.note ? <span className="kd-participant-note">{participant.note}</span> : null}
    </li>
  );
}

/**
 * One step. Its text says everything the arrow shows — sender, receiver, reply, key step — so the
 * step reads the same in either layout and to a screen reader, which never sees the arrow.
 */
function StepRow({
  number,
  step,
  from,
  to,
  towards,
  style,
}: {
  readonly number: number;
  readonly step: MessageStep;
  readonly from: string;
  readonly to: string;
  readonly towards: Towards;
  readonly style: CSSProperties;
}) {
  const who = step.from === step.to ? `${from}, on its own` : `${from} → ${to}`;
  return (
    <li
      className="kd-step"
      style={style}
      data-reply={step.reply ? '' : undefined}
      data-highlight={step.highlight ? '' : undefined}
      data-towards={towards}
    >
      <span className="kd-label">
        {/* The list already numbers the step for assistive technology. */}
        <span className="kd-number" aria-hidden="true">
          {number}
        </span>
        <span className="kd-who">
          {who}
          {step.reply ? ' (reply)' : ''}
        </span>
        {step.highlight ? <span className="kd-key">Key step</span> : null}
        <span className="kd-say">{step.say}</span>
        {step.note ? <span className="kd-note">{step.note}</span> : null}
      </span>
      <span className="kd-arrow" aria-hidden="true" />
    </li>
  );
}
