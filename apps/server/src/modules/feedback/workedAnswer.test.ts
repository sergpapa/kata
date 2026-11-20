import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { workedAnswerSection } from './workedAnswer.js';

/**
 * PF2 and PF3 in docs/specs/practice-feedback.md: the author's worked answer is the section under
 * the heading `feedback_source_heading` names, up to the next heading of the same or a higher
 * level, and nothing when that heading is absent or not unique.
 *
 * The bug these catch is Claude coaching against the wrong text: a section that runs on into the
 * next practice hands Claude an answer key for something else, and a section cut at a `##` inside
 * a code fence hands it half an answer. Either way the learner reads confident feedback built on
 * the wrong model answer.
 */

const lesson = [
  '---',
  'candidate_lesson_id: FIX-LS-01',
  '---',
  '',
  '# Lesson 1: the title',
  '',
  '## 9. Practice',
  '',
  '### Practice A: explain one click',
  '',
  'Prompt A.',
  '',
  '### Practice explanations',
  '',
  '**Practice A:** The click requests `/api/menu`.',
  '',
  '```text',
  '## not a heading, inside a fence',
  '```',
  '',
  '#### A smaller heading stays inside',
  '',
  'Still the worked answer.',
  '',
  '### Next practice at the same level',
  '',
  'Not part of the answer.',
  '',
  '## 10. A higher heading',
  '',
  'Also not part of it.',
].join('\n');

describe('the worked-answer section', () => {
  it('runs from the named heading to the next heading of the same level, keeping deeper ones', () => {
    const section = workedAnswerSection(lesson, 'Practice explanations');

    expect(section).not.toBeNull();
    expect(section).toContain('**Practice A:** The click requests `/api/menu`.');
    expect(section).toContain('#### A smaller heading stays inside');
    expect(section).toContain('Still the worked answer.');
    expect(section).not.toContain('Not part of the answer.');
    expect(section).not.toContain('Also not part of it.');
    // The heading itself is the label, not part of the answer.
    expect(section?.startsWith('### Practice explanations')).toBe(false);
  });

  it('does not end the section at a heading-looking line inside a code fence', () => {
    const section = workedAnswerSection(lesson, 'Practice explanations') ?? '';

    expect(section).toContain('## not a heading, inside a fence');
    expect(section).toContain('Still the worked answer.');
  });

  it('stops at a higher-level heading when no same-level one comes first', () => {
    const short = [
      '# Lesson',
      '',
      '### Practice explanations',
      '',
      'The answer.',
      '',
      '## 10. Pause here',
      '',
      'Review prose.',
    ].join('\n');

    expect(workedAnswerSection(short, 'Practice explanations')?.trim()).toBe('The answer.');
  });

  it('runs to the end of the lesson when no heading follows', () => {
    const last = ['# Lesson', '', '## Full explanations', '', 'Line one.', '', 'Line two.'].join(
      '\n',
    );

    const section = workedAnswerSection(last, 'Full explanations') ?? '';
    expect(section).toContain('Line one.');
    expect(section).toContain('Line two.');
  });

  it('matches a heading the author wrote with inline code, by its visible text or as typed', () => {
    const coded = ['# Lesson', '', '## Read the `ETag` reply', '', 'Worked.', '', '## Next'].join(
      '\n',
    );

    expect(workedAnswerSection(coded, 'Read the `ETag` reply')?.trim()).toBe('Worked.');
    expect(workedAnswerSection(coded, 'Read the ETag reply')?.trim()).toBe('Worked.');
  });

  it('answers null when the activity names no heading', () => {
    expect(workedAnswerSection(lesson, null)).toBeNull();
    expect(workedAnswerSection(lesson, undefined)).toBeNull();
    expect(workedAnswerSection(lesson, '')).toBeNull();
  });

  it('answers null when no heading has that name', () => {
    expect(workedAnswerSection(lesson, 'Practice answers')).toBeNull();
  });

  it('answers null when the name is only found inside a code fence', () => {
    expect(workedAnswerSection(lesson, 'not a heading, inside a fence')).toBeNull();
  });

  it('answers null rather than guessing when two headings share the name', () => {
    const twice = [
      '# Lesson',
      '',
      '## Practice explanations',
      '',
      'First.',
      '',
      '## Practice explanations',
      '',
      'Second.',
    ].join('\n');

    expect(workedAnswerSection(twice, 'Practice explanations')).toBeNull();
  });

  it('reads a lesson saved with Windows line endings the same way', () => {
    const crlf = lesson.replace(/\n/g, '\r\n');
    const section = workedAnswerSection(crlf, 'Practice explanations') ?? '';

    expect(section).toContain('Still the worked answer.');
    expect(section).not.toContain('Not part of the answer.');
  });
});

describe('the worked-answer section, at the edges of Markdown', () => {
  it('treats ~~~ fences and longer backtick fences as fences', () => {
    const fenced = [
      '# Lesson',
      '',
      '## Practice explanations',
      '',
      '~~~text',
      '## inside a tilde fence',
      '~~~',
      '',
      '````md',
      '```',
      '## inside a four-backtick fence',
      '```',
      '````',
      '',
      'After both fences.',
      '',
      '## Next',
    ].join('\n');

    const section = workedAnswerSection(fenced, 'Practice explanations') ?? '';
    expect(section).toContain('## inside a tilde fence');
    expect(section).toContain('## inside a four-backtick fence');
    expect(section).toContain('After both fences.');
  });

  it('finds the real heading when a fence earlier in the lesson shows the same text', () => {
    const shown = [
      '# Lesson',
      '',
      '```md',
      '## Practice explanations',
      '```',
      '',
      '## Practice explanations',
      '',
      'The real answer.',
    ].join('\n');

    expect(workedAnswerSection(shown, 'Practice explanations')?.trim()).toBe('The real answer.');
  });

  it('reads a heading written with closing hashes', () => {
    const closed = [
      '# Lesson',
      '',
      '## Practice explanations ##',
      '',
      'Answer.',
      '',
      '## Next',
    ].join('\n');

    expect(workedAnswerSection(closed, 'Practice explanations')?.trim()).toBe('Answer.');
  });

  it('answers null when the same name is a heading at two levels', () => {
    const twoLevels = [
      '# Lesson',
      '',
      '## Practice explanations',
      '',
      '### Practice explanations',
      '',
      'Which one?',
    ].join('\n');

    expect(workedAnswerSection(twoLevels, 'Practice explanations')).toBeNull();
  });
});

describe('the worked answers in the released lessons', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
  const releases = [
    'content/releases/http-first-fifteen-v1_0_1/content',
    'content/releases/qaae-q02-v1_0_1/content',
  ];

  for (const release of releases) {
    it(`finds exactly one section for every activity that names one, in ${release}`, () => {
      const dir = path.join(repoRoot, release);
      const { activities } = JSON.parse(
        fs.readFileSync(path.join(dir, 'trial-activities.json'), 'utf8'),
      ) as {
        activities: {
          activity_id: string;
          lesson_id: string;
          feedback_source_heading?: string | null;
        }[];
      };
      const manifest = JSON.parse(
        fs.readFileSync(path.join(dir, 'learning-release.json'), 'utf8'),
      ) as { lessons: { lesson_id: string; path: string }[] };

      const naming = activities.filter((one) => one.feedback_source_heading);
      expect(naming.length).toBeGreaterThan(0);

      const missing = naming.filter((one) => {
        const entry = manifest.lessons.find(
          (lessonEntry) => lessonEntry.lesson_id === one.lesson_id,
        );
        if (!entry) return true;
        const source = fs.readFileSync(path.join(dir, entry.path), 'utf8');
        const section = workedAnswerSection(source, one.feedback_source_heading);
        return section === null || section.trim() === '';
      });
      expect(missing.map((one) => one.activity_id)).toEqual([]);
    });
  }

  it('gives Lesson 5 Practice C the section that answers A, B and C', () => {
    const dir = path.join(repoRoot, releases[0] as string);
    const source = fs.readFileSync(
      path.join(dir, 'lessons/HTTP_Lesson_05_Student_Edition_v1.md'),
      'utf8',
    );
    const section = workedAnswerSection(source, 'Practice explanations') ?? '';

    expect(section).toContain('**Practice C:** One explanation is that no menu button');
    expect(section).not.toContain('Pause here and review the first five lessons');
  });
});
