import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { learnerFacingFacts, lessonBodyBelowTitle } from './lessonView.js';
import { lessonSource } from './testkit/releaseFixture.js';
import { splitFrontMatter } from './frontMatter.js';

/**
 * The reader's view of a stored lesson: the Markdown below its title, and the front-matter facts a
 * learner is meant to see. Criteria A1, T2–T5 in docs/specs/markdown-rendering.md.
 */

describe('the body a reader is given', () => {
  it('drops the front-matter block entirely, so no YAML can reach the renderer', () => {
    const source = lessonSource(
      ['document_id: FIX-DOC-01', 'candidate_lesson_id: FIX-LS-01', 'module: M020'].join('\n'),
      '# The authored title\n\nAuthored prose.',
    );

    const body = lessonBodyBelowTitle(source);

    expect(body).not.toContain('document_id');
    expect(body).not.toContain('candidate_lesson_id');
    expect(body).not.toContain('---');
  });

  it('removes the first H1 line and keeps every other line in its authored order', () => {
    const source = lessonSource(
      'candidate_lesson_id: FIX-LS-01',
      ['# The authored title', '', 'First paragraph.', '', '## A section', '', 'More prose.'].join(
        '\n',
      ),
    );

    const body = lessonBodyBelowTitle(source);

    expect(body.split('\n').filter((line) => line !== '')).toEqual([
      'First paragraph.',
      '## A section',
      'More prose.',
    ]);
  });

  it('leaves a later H1 alone: only the first one is the display title', () => {
    const source = lessonSource(
      'candidate_lesson_id: FIX-LS-01',
      ['# The authored title', '', 'Prose.', '', '# A second top-level heading'].join('\n'),
    );

    expect(lessonBodyBelowTitle(source)).toContain('# A second top-level heading');
  });

  it('does not mistake a # inside a fenced block for the title', () => {
    const source = lessonSource(
      'candidate_lesson_id: FIX-LS-01',
      [
        '```sh',
        '# a shell comment, not a heading',
        'node server.mjs',
        '```',
        '',
        '# The real title',
        '',
        'Prose.',
      ].join('\n'),
    );

    const body = lessonBodyBelowTitle(source);

    expect(body).toContain('# a shell comment, not a heading');
    expect(body).not.toContain('# The real title');
  });

  it('removes both lines of an underlined (setext) H1', () => {
    const source = lessonSource(
      'candidate_lesson_id: FIX-LS-01',
      ['The authored title', '==================', '', 'Prose.'].join('\n'),
    );

    const body = lessonBodyBelowTitle(source);

    expect(body).not.toContain('The authored title');
    expect(body).not.toContain('====');
    expect(body).toContain('Prose.');
  });

  it('treats a file with no front matter as all body, rather than swallowing its first lines', () => {
    expect(lessonBodyBelowTitle('# A title\n\nProse.\n')).toBe('\nProse.\n');
  });

  it('returns the body unchanged when there is no H1 to remove', () => {
    const source = lessonSource('candidate_lesson_id: FIX-LS-01', '## Only a section\n\nProse.');

    expect(lessonBodyBelowTitle(source)).toContain('## Only a section');
  });
});

describe('the front-matter facts a learner is shown', () => {
  const lessonOne = {
    document_id: 'FSSE-HTTP-STUDENT-01',
    version: '2.0.0-draft',
    date: '2026-09-11',
    audience: 'A learner new to web development',
    module: 'M020',
    candidate_lesson_id: 'LS-M020-01',
    adapted_from: 'LS-HTTP-01 in UNIT-HTTP-001@1.0.0',
    status: 'Student-facing rewrite for review; not yet learner-tested',
    prerequisites: ['Have used a browser to open a web page'],
    learning_outcomes: ['Explain the roles of browser, client, and server'],
    assessment_scope: 'Introductory interpretation and explanation',
    examples: 'Fictional teaching examples, not captured traffic',
  };

  it('shows the author-facing keys a learner needs, in one fixed order', () => {
    const facts = learnerFacingFacts(lessonOne);

    expect(facts.map((fact) => fact.key)).toEqual([
      'audience',
      'status',
      'prerequisites',
      'learning_outcomes',
      'assessment_scope',
      'examples',
    ]);
  });

  it('keeps the internal identifiers out: those belong to provenance, not to the lesson', () => {
    const keys = learnerFacingFacts(lessonOne).map((fact) => fact.key);

    for (const internal of [
      'document_id',
      'version',
      'module',
      'candidate_lesson_id',
      'date',
      'adapted_from',
      'exercise_kit',
    ]) {
      expect(keys).not.toContain(internal);
    }
  });

  it('carries the author\u2019s own status caveat through to the reader', () => {
    const status = learnerFacingFacts(lessonOne).find((fact) => fact.key === 'status');

    expect(status).toMatchObject({
      kind: 'line',
      text: 'Student-facing rewrite for review; not yet learner-tested',
    });
  });

  it('renders a YAML list as a list and a scalar as a single line', () => {
    const facts = learnerFacingFacts(lessonOne);

    expect(facts.find((fact) => fact.key === 'prerequisites')).toMatchObject({
      kind: 'list',
      items: ['Have used a browser to open a web page'],
    });
    expect(facts.find((fact) => fact.key === 'audience')).toMatchObject({ kind: 'line' });
  });

  it('produces nothing for a key the lesson does not carry', () => {
    const keys = learnerFacingFacts({
      candidate_lesson_id: 'LS-M020-02',
      introduced_concepts: ['Loopback address'],
      runtime_target: 'Node.js 24.x',
      deferred: ['DNS mechanics'],
    }).map((fact) => fact.key);

    expect(keys).toEqual(['introduced_concepts', 'runtime_target', 'deferred']);
    expect(keys).not.toContain('learning_outcomes');
  });

  it('labels each fact in words, never with the raw YAML key', () => {
    for (const fact of learnerFacingFacts(lessonOne)) {
      expect(fact.label).not.toBe(fact.key);
      expect(fact.label).not.toContain('_');
      expect(fact.label.length).toBeGreaterThan(0);
    }
  });

  it('shows a value of an unexpected shape as readable text, not as [object Object]', () => {
    const facts = learnerFacingFacts({
      runtime_target: 24,
      deferred: [{ topic: 'TLS setup' }],
    });

    const text = facts.map((fact) => ('text' in fact ? fact.text : fact.items.join(' '))).join(' ');
    expect(text).not.toContain('[object Object]');
    expect(text).toContain('24');
    expect(text).toContain('TLS setup');
  });

  it('ignores a front matter that is empty rather than inventing facts', () => {
    expect(learnerFacingFacts({})).toEqual([]);
  });
});

/**
 * The same two functions against the author's own files. The fixture proves the rules; only the
 * real bytes prove the rules survive contact with a 549-line lesson carrying tables, fenced
 * HTTP messages and a Mermaid diagram.
 *
 * The file list comes from the release manifest rather than being written out here, so this suite
 * cannot quietly cover less than the release: a fourteenth lesson joins it on arrival.
 */
const releaseDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../..',
  'HTTP_Caching_Lessons_09_13_v1/http-lessons-09-13-release-v1/content',
);
const lessonsDir = path.join(releaseDir, 'lessons');

const realLessonFiles = (
  JSON.parse(fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8')) as {
    lessons: { path: string }[];
  }
).lessons.map((entry) => path.basename(entry.path));

function readLesson(file: string): string {
  return fs.readFileSync(path.join(lessonsDir, file), 'utf8');
}

describe('the thirteen authored lessons, read from the release directory', () => {
  it('covers every lesson the release carries', () => {
    expect(realLessonFiles).toHaveLength(13);
  });

  it.each(realLessonFiles)('leaves %s byte-identical below the cut', (file) => {
    const source = readLesson(file);

    const body = lessonBodyBelowTitle(source);

    // The strongest statement available without re-deriving the cut: the body is a literal tail of
    // the authored file. Any trim, any collapsed blank line, any CRLF normalisation breaks it —
    // and a collapsed blank line is exactly what would eat the header/body separator in an HTTP
    // sample.
    expect(source.endsWith(body)).toBe(true);
    expect(body.length).toBeGreaterThan(1000);
  });

  it.each(realLessonFiles)('cuts the front matter and the one title heading out of %s', (file) => {
    const source = readLesson(file);

    const body = lessonBodyBelowTitle(source);

    expect(body).not.toContain('candidate_lesson_id');
    expect(body).not.toContain('document_id');
    expect(body.split('\n').filter((line) => line.startsWith('# '))).toEqual([]);
  });

  it.each(realLessonFiles)('keeps the first authored sentence of %s', (file) => {
    const source = readLesson(file);
    const lines = source.split('\n');
    const titleIndex = lines.findIndex((line) => line.startsWith('# '));
    const firstProse = lines.slice(titleIndex + 1).find((line) => line.trim() !== '') as string;

    expect(
      lessonBodyBelowTitle(source)
        .split('\n')
        .find((line) => line.trim() !== ''),
    ).toBe(firstProse);
  });

  it('keeps the blank line inside Lesson 1\u2019s request sample, up against the closing fence', () => {
    const body = lessonBodyBelowTitle(readLesson('HTTP_Lesson_01_Student_Edition_v2.md'));

    expect(body).toContain('GET /menu HTTP/1.1\nHost: cafe.example\n\n```');
  });
});

describe('the front-matter facts of the authored lessons', () => {
  function frontMatterOf(file: string): Record<string, unknown> {
    const split = splitFrontMatter(readLesson(file));
    if (!split.ok) throw new Error(`${file} has no readable front matter`);
    return split.value.frontMatter;
  }

  it('shows Lesson 1 the keys it carries, in the fixed order', () => {
    const keys = learnerFacingFacts(frontMatterOf('HTTP_Lesson_01_Student_Edition_v2.md')).map(
      (fact) => fact.key,
    );

    expect(keys).toEqual([
      'audience',
      'status',
      'prerequisites',
      'learning_outcomes',
      'assessment_scope',
      'examples',
    ]);
  });

  it('shows Lesson 2 its own keys, and keeps its exercise_kit filename out', () => {
    const keys = learnerFacingFacts(frontMatterOf('HTTP_Lesson_02_Student_Edition_v1.md')).map(
      (fact) => fact.key,
    );

    // exercise_kit is in most of the authored files. A deny-list with a gap ships the zip
    // filename into the facts panel on all four; only an allow-list keeps it out.
    expect(keys).toEqual([
      'audience',
      'status',
      'prerequisites',
      'introduced_concepts',
      'runtime_target',
      'assessment_scope',
      'deferred',
    ]);
  });

  /**
   * Aimed at what the app controls: the identity and ingestion fields of the lesson being shown.
   * Not a blanket "no ID-shaped text anywhere" — Lesson 7's authored prerequisites mention
   * LS-M020-06 in prose, and showing the author's own words is the contract, not a leak. Whether
   * that wording should say "Lesson 6" instead is CF-002 in docs/content-feedback.md, the owner's
   * call.
   */
  it.each(realLessonFiles)('never leaks %s’s own identity fields into the facts', (file) => {
    const frontMatter = frontMatterOf(file);
    const facts = learnerFacingFacts(frontMatter);

    const identityFields = [
      'candidate_lesson_id',
      'document_id',
      'module',
      'version',
      'date',
      'exercise_kit',
      'lab_id',
    ];
    expect(facts.map((fact) => fact.key).filter((key) => identityFields.includes(key))).toEqual([]);

    const shown = JSON.stringify(facts);
    expect(shown).not.toContain(String(frontMatter.candidate_lesson_id));
    expect(shown).not.toContain(String(frontMatter.document_id));
    expect(shown).not.toContain('.zip');
  });
});
