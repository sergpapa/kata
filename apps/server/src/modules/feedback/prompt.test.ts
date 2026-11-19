import { describe, expect, it } from 'vitest';
import { FEEDBACK_SYSTEM_PROMPT, firstTurnPrompt } from './prompt.js';

/**
 * PF2, PF3 and PF4 in docs/specs/practice-feedback.md: what Claude is told.
 *
 * Model behaviour cannot be asserted here, so these pin the instructions and the material. The
 * failures they catch are silent ones: feedback on the wrong box because the labels slipped, a
 * blank box read as an answer, coaching against an answer key that was never sent, or a system
 * prompt that lost the rule against grading.
 */

const fields = [
  { fieldName: 'prediction', text: 'The page will show drinks.' },
  { fieldName: 'observation', text: '' },
  { fieldName: 'explanation', text: '   ' },
  { fieldName: 'help_used', text: 'None.' },
];

const input = {
  title: 'Practice C: choose the next piece of evidence',
  promptMarkdown: 'Give two different explanations consistent with that observation.',
  workedAnswer: '**Practice C:** One explanation is that no menu button has been pressed.',
  fields,
};

describe('the first message', () => {
  it('carries the activity title, its prompt and the worked answer', () => {
    const message = firstTurnPrompt(input);

    expect(message).toContain('Practice C: choose the next piece of evidence');
    expect(message).toContain('Give two different explanations consistent with that observation.');
    expect(message).toContain(
      '**Practice C:** One explanation is that no menu button has been pressed.',
    );
  });

  it('labels every declared box in declared order, as the page names them', () => {
    const message = firstTurnPrompt(input);

    const order = [
      'Your prediction',
      'What you observed',
      'Your explanation',
      'Whether you used help',
    ];
    const positions = order.map((label) => message.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);

    const prediction = message.slice(positions[0], positions[1]);
    expect(prediction).toContain('The page will show drinks.');
    const help = message.slice(positions[3]);
    expect(help).toContain('None.');
  });

  it('marks an empty or blank box as left empty instead of passing nothing', () => {
    const message = firstTurnPrompt(input);
    const observed = message.slice(
      message.indexOf('What you observed'),
      message.indexOf('Your explanation'),
    );
    const explained = message.slice(
      message.indexOf('Your explanation'),
      message.indexOf('Whether you used help'),
    );

    expect(observed).toContain('(left empty)');
    expect(explained).toContain('(left empty)');
    const predicted = message.slice(
      message.indexOf('Your prediction'),
      message.indexOf('What you observed'),
    );
    expect(predicted).not.toContain('(left empty)');
  });

  it('names a field the page has no label for by its own name', () => {
    const message = firstTurnPrompt({
      ...input,
      fields: [{ fieldName: 'strategy_note', text: 'Test the login first.' }],
    });

    expect(message).toContain('strategy_note');
    expect(message).toContain('Test the login first.');
  });

  it('tells Claude when there is no authored answer, and sends none', () => {
    const message = firstTurnPrompt({ ...input, workedAnswer: null });

    expect(message).toMatch(/no (authored|worked) answer/i);
    expect(message).not.toContain('**Practice C:** One explanation');
  });

  it('keeps the learner text exactly as typed, including Markdown and line breaks', () => {
    const typed = 'First line\n\n- a `GET` to /api/menu\n- <b>not html</b>';
    const message = firstTurnPrompt({
      ...input,
      fields: [{ fieldName: 'prediction', text: typed }],
    });

    expect(message).toContain(typed);
  });
});

describe('the coaching rules', () => {
  it('asks Claude to coach first and to hold back the worked answer unless asked', () => {
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/what .*(right|correct)/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/missing/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/(do not|don't|never) (reveal|quote|paraphrase)/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/unless .*ask/i);
  });

  it('forbids a grade, score or pass/fail', () => {
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/grade/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/score/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/pass/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/(no|never|not|don't|do not)[^.]*grade/i);
  });

  it('keeps Claude inside the lesson, in plain language, and short', () => {
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/lesson/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/plain/i);
    expect(FEEDBACK_SYSTEM_PROMPT).toMatch(/short|brief/i);
  });
});
