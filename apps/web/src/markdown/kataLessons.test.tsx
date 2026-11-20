import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';
import { readKataDiagram } from './kataDiagram.js';

/**
 * Criteria KD18 and KD19 in docs/specs/kata-diagrams.md, against the lesson files themselves.
 *
 * A migrated lesson carries one diagram twice: the Kata fence the reader sees, and the Mermaid
 * fence that stands in when the Kata fence cannot be drawn. Nothing but this suite stops the two
 * from saying different things, so it compares them message by message.
 */

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), parse: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const LESSON = 'QAAE_Lesson_01_Student_Edition_v1.md';
const source = path.join(repoRoot, 'content/source/qaae/lessons', LESSON);
const served = path.join(repoRoot, 'content/releases/qaae-q02-v1_0_1/content/lessons', LESSON);
const previous = path.join(repoRoot, 'content/releases/qaae-q02-v1/content/lessons', LESSON);

/**
 * A lesson's text with CRLF read as LF. Lesson files keep the line endings they were written with,
 * because a release hashes their bytes (.gitattributes), and QA Lesson 1's are CRLF. The fence
 * and paragraph comparisons below are about what the lesson says, so they read it this way; the
 * served-package check compares raw bytes.
 */
function readLesson(file: string): string {
  return fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
}

/** The text between a fence's opening line and its closing backticks, or undefined. */
function fenceBody(
  text: string,
  language: string,
): { body: string; start: number; end: number } | undefined {
  const opening = '```' + language + '\n';
  const start = text.indexOf(opening);
  if (start < 0) return undefined;
  const bodyStart = start + opening.length;
  const close = text.indexOf('\n```', bodyStart);
  return { body: text.slice(bodyStart, close + 1), start, end: close + '\n```'.length };
}

/** The paragraph that begins "In words:", exactly as written. */
function inWords(text: string): string | undefined {
  return /^In words:.*$/m.exec(text)?.[0];
}

interface Message {
  from: string;
  to: string;
  say: string;
  reply: boolean;
}

/** A Mermaid sequence's messages, with aliases resolved to their labels. */
function mermaidMessages(body: string): Message[] {
  const labels = new Map<string, string>();
  const messages: Message[] = [];
  for (const line of body.split('\n')) {
    const participant = /^\s*participant\s+(\w+)\s+as\s+(.+?)\s*$/.exec(line);
    if (participant) {
      labels.set(participant[1]!, participant[2]!);
      continue;
    }
    const message = /^\s*(\w+)(-->>|->>)(\w+):\s*(.+?)\s*$/.exec(line);
    if (message) {
      messages.push({
        from: labels.get(message[1]!) ?? message[1]!,
        to: labels.get(message[3]!) ?? message[3]!,
        say: message[4]!,
        reply: message[2] === '-->>',
      });
    }
  }
  return messages;
}

describe('QA Lesson 1’s diagram (KD18)', () => {
  const text = readLesson(source);

  it('carries a Kata fence directly before its Mermaid fence', () => {
    const kata = fenceBody(text, 'kata-diagram');
    const fallback = fenceBody(text, 'mermaid');

    expect(kata).toBeDefined();
    expect(fallback).toBeDefined();
    expect(text.slice(kata!.end, fallback!.start).trim()).toBe('');
  });

  it('says exactly what its Mermaid fallback says, message by message', () => {
    const kata = fenceBody(text, 'kata-diagram');
    const reading = readKataDiagram(kata?.body ?? '');
    if (!reading.ok) throw new Error(reading.reason);

    const label = new Map(reading.diagram.participants.map((p) => [p.id, p.label]));
    const drawn = reading.diagram.steps.flatMap((step) =>
      step.kind === 'message'
        ? [{ from: label.get(step.from), to: label.get(step.to), say: step.say, reply: step.reply }]
        : [],
    );

    const fallback = fenceBody(text, 'mermaid')!.body;
    const arrows = fallback.split('\n').filter((line) => line.includes('->>')).length;
    expect(mermaidMessages(fallback)).toHaveLength(arrows);
    expect(drawn).toEqual(mermaidMessages(fallback));
  });

  it('changes nothing else in the lesson but its version and date', () => {
    const kata = fenceBody(text, 'kata-diagram')!;
    const fallback = fenceBody(text, 'mermaid')!;
    const withoutKata = text.slice(0, kata.start) + text.slice(fallback.start);
    const frontMatterDates = (lesson: string) =>
      lesson.replace(/^version: .*$/m, 'version: X').replace(/^date: .*$/m, 'date: X');

    expect(frontMatterDates(withoutKata)).toBe(frontMatterDates(readLesson(previous)));
  });

  it('leaves the Mermaid fence and the "In words:" paragraph byte for byte as they were', () => {
    const before = readLesson(previous);
    expect(fenceBody(before, 'mermaid')).toBeDefined();
    expect(inWords(before)).toBeDefined();

    expect(fenceBody(text, 'mermaid')?.body).toBe(fenceBody(before, 'mermaid')?.body);
    expect(inWords(text)).toBe(inWords(before));
  });

  it('is drawn as a Kata diagram and never asks Mermaid', () => {
    const container = render(<LessonMarkdown markdown={text} />).container;

    const region = within(container).getByRole('region', { name: /^Diagram 1: Sequence diagram/ });
    expect(region.querySelector('iframe')).toBeNull();
    expect(region.textContent).toContain('Test runner');
    expect(mermaid.parse).not.toHaveBeenCalled();
    expect(mermaid.render).not.toHaveBeenCalled();
  });
});

describe('the package the QA course serves (KD19)', () => {
  it('holds QA Lesson 1 exactly as the source has it', () => {
    expect(fs.existsSync(served)).toBe(true);
    expect(fs.readFileSync(served, 'utf8')).toBe(fs.readFileSync(source, 'utf8'));
  });
});
