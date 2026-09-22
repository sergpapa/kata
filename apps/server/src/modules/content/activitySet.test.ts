import { describe, expect, it } from 'vitest';
import { activitiesForLesson, parseActivitySet } from './activitySet.js';

/**
 * Criteria I1 and A3 in docs/specs/activity-placement.md: the stored activity file becomes
 * activities, or is refused with the parser's own complaint. Nothing is coerced — a field of the
 * wrong type is a refusal, because an activity that silently becomes `"undefined"` on the page is
 * worse than one the owner is told about.
 */

const oneActivity = {
  activity_id: 'ACT-FIX-01-01',
  lesson_id: 'FIX-LS-01',
  lesson_version: '1.0.0-draft',
  kind: 'interpretation',
  title: 'Practice A: explain a supplied exchange',
  source_heading: 'Practice A: explain a supplied exchange',
  prompt_markdown: 'Explain the exchange in three steps.',
  prompt_scope: 'Exact authored section excerpt.',
  feedback_source_heading: 'Practice explanations',
  response_fields: ['prediction', 'observation', 'explanation', 'help_used'],
  response_fields_required: false,
  grading: null,
  formal_evidence_award: null,
};

function setText(activities: unknown[]): string {
  return JSON.stringify({ schema_version: '1.0.0', activities });
}

describe('reading a stored activity set', () => {
  it('reads an activity into the fields the reader is shown', () => {
    const parsed = parseActivitySet(setText([oneActivity]));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.activities).toEqual([
      {
        activityId: 'ACT-FIX-01-01',
        lessonId: 'FIX-LS-01',
        kind: 'interpretation',
        title: 'Practice A: explain a supplied exchange',
        sourceHeading: 'Practice A: explain a supplied exchange',
        promptMarkdown: 'Explain the exchange in three steps.',
        responseFields: ['prediction', 'observation', 'explanation', 'help_used'],
      },
    ]);
  });

  it('keeps the file order of the activities', () => {
    const parsed = parseActivitySet(
      setText([
        { ...oneActivity, activity_id: 'ACT-FIX-01-03' },
        { ...oneActivity, activity_id: 'ACT-FIX-01-01' },
        { ...oneActivity, activity_id: 'ACT-FIX-01-02' },
      ]),
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.activities.map((activity) => activity.activityId)).toEqual([
      'ACT-FIX-01-03',
      'ACT-FIX-01-01',
      'ACT-FIX-01-02',
    ]);
  });

  it('carries no field the reader is not shown', () => {
    const parsed = parseActivitySet(setText([oneActivity]));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const asJson = JSON.stringify(parsed.activities);
    for (const hidden of [
      'prompt_scope',
      'promptScope',
      'grading',
      'formal_evidence_award',
      'formalEvidenceAward',
      'attempt_provenance',
      'attemptProvenance',
      'lesson_version',
      'lessonVersion',
    ]) {
      expect(asJson).not.toContain(hidden);
    }
  });

  it('refuses text that is not JSON, and says what the parser said', () => {
    const parsed = parseActivitySet('{ not json');

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    // The parser's own complaint, not a constant of ours: a generic "invalid" would satisfy a
    // non-emptiness check and tell the owner nothing about their file.
    expect(parsed.detail).toContain('JSON');
  });

  it('refuses a top level that carries no activities array', () => {
    for (const text of ['[]', '"activities"', '{"activities": {}}', '{}']) {
      const parsed = parseActivitySet(text);
      expect(parsed.ok, `${text} should be refused`).toBe(false);
    }
  });

  it.each([
    ['activity_id', 7],
    ['lesson_id', null],
    ['kind', undefined],
    ['title', {}],
    ['source_heading', ['a heading']],
    ['prompt_markdown', 3],
    ['response_fields', 'prediction'],
  ])('refuses an activity whose %s is not the shape it must be', (field, value) => {
    const broken: Record<string, unknown> = { ...oneActivity };
    if (value === undefined) delete broken[field];
    else broken[field] = value;

    const parsed = parseActivitySet(setText([broken]));

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.detail).toContain(field);
  });

  it('refuses a response_fields entry that is not a string', () => {
    const parsed = parseActivitySet(
      setText([{ ...oneActivity, response_fields: ['prediction', 4] }]),
    );

    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.detail).toContain('response_fields');
  });

  it('accepts an empty activity set, because a release may ship none', () => {
    const parsed = parseActivitySet('{"activities": []}');

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.activities).toEqual([]);
  });
});

describe('selecting one lesson’s activities', () => {
  const activities = [
    { ...oneActivity, activity_id: 'ACT-FIX-01-01', lesson_id: 'FIX-LS-01' },
    { ...oneActivity, activity_id: 'ACT-FIX-02-01', lesson_id: 'FIX-LS-02' },
    { ...oneActivity, activity_id: 'ACT-FIX-01-02', lesson_id: 'FIX-LS-01' },
  ];

  function parsed() {
    const outcome = parseActivitySet(setText(activities));
    if (!outcome.ok) throw new Error(`fixture should parse: ${outcome.detail}`);
    return outcome.activities;
  }

  it('answers only the named lesson’s activities, in file order', () => {
    expect(activitiesForLesson(parsed(), 'FIX-LS-01').map((a) => a.activityId)).toEqual([
      'ACT-FIX-01-01',
      'ACT-FIX-01-02',
    ]);
  });

  it('answers nothing for a lesson that has no activities', () => {
    expect(activitiesForLesson(parsed(), 'FIX-LS-03')).toEqual([]);
  });
});
