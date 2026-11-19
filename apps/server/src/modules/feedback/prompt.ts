import type { SentField } from './types.js';

/**
 * What Claude is told (docs/specs/practice-feedback.md PF2–PF4).
 *
 * The system prompt replaces Claude Code's own (`--system-prompt-file`), so it is the whole of
 * Claude's instructions for these runs: nothing from the owner's CLAUDE.md or plugins applies
 * (`--safe-mode`). The decisions it encodes are the owner's: coach first, keep the worked answer
 * back until asked, never grade.
 */

export const FEEDBACK_SYSTEM_PROMPT = [
  'You give feedback on a learner’s answers to one practice activity in a lesson they are working through.',
  '',
  'How to respond:',
  '- Coach first. Say what the learner got right, then what is missing or mistaken, and nudge them toward the gap with a question or a pointer to what to look at.',
  '- You are given the author’s worked answer. Do not reveal, quote or paraphrase the worked answer unless the learner asks to see it.',
  '- Never give a grade, a score, a mark or a pass/fail verdict, and never say the learner passed or failed. This is feedback on reasoning, not an assessment.',
  '- Stay inside the lesson: use only the material the activity and the lesson give, and do not bring in problems or tools the lesson has not introduced.',
  '- Use plain language: short sentences, the exact technical term where one is needed, explained once.',
  '- Keep replies short: a few sentences, or a short list when there are several points.',
  '- If a box was left empty, you may say what it would usually hold, without filling it in for them.',
  '- If you are unsure whether something is right, say so rather than guessing.',
].join('\n');

/** The page's own label for each field, so Claude and the learner name a box the same way. */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  prediction: 'Your prediction',
  observation: 'What you observed',
  explanation: 'Your explanation',
  help_used: 'Whether you used help',
};

export function fieldLabel(fieldName: string): string {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

export function firstTurnPrompt(input: {
  readonly title: string;
  readonly promptMarkdown: string;
  readonly workedAnswer: string | null;
  readonly fields: readonly SentField[];
}): string {
  const answers = input.fields.map((field) => {
    const text = field.text.trim() === '' ? '(left empty)' : field.text;
    return `### ${fieldLabel(field.fieldName)}\n\n${text}`;
  });

  const worked =
    input.workedAnswer === null
      ? 'There is no authored answer for this activity. Your feedback is your own reading of the activity; say so if it matters.'
      : `The author’s worked answer (keep it back unless the learner asks to see it; it may also cover neighbouring practices):\n\n${input.workedAnswer}`;

  return [
    `## Activity: ${input.title}`,
    '',
    input.promptMarkdown,
    '',
    '## Worked answer',
    '',
    worked,
    '',
    '## The learner’s answers',
    '',
    answers.join('\n\n'),
    '',
    'Give your feedback on these answers.',
  ].join('\n');
}
