import { describe, expect, it } from 'vitest';
import { recoveryDocument, recoveryFileName, type RecoverySubject } from './recoveryFile.js';

/**
 * Criteria F4 and F5 in docs/specs/save-failure-recovery.md.
 *
 * The file a reader downloads when a save was refused. Two claims carry the weight, and both are
 * about what the builder must *not* do to the text.
 *
 * The first is that the answer survives byte for byte. This is somebody's work leaving the app at
 * the moment the app has failed them, and a builder that trims a trailing newline or escapes a
 * character hands back something that is not what they wrote. So the assertions below compare the
 * tail of the document against the input string itself rather than against a re-typed copy.
 *
 * The second is that the text is never fenced. Fencing reads like the safe choice until a reader
 * whose answer quotes a code sample — which is most of this release's activities — downloads a file
 * that ends in the middle of their own backticks.
 */

const lesson = {
  order: 4,
  candidateLessonId: 'LS-M020-04',
  displayTitle: 'How a request is shaped',
  contentVersion: '1.0.0-draft',
  releaseId: 'FSSE-HTTP-FIRST-FIFTEEN',
  releaseVersion: '1.0.1-draft',
};

function subject(over: Partial<RecoverySubject> = {}): RecoverySubject {
  return {
    lesson,
    activityId: 'ACT-M020-04-02',
    fieldName: 'prediction',
    label: 'Your prediction',
    text: 'I think it answers 304, because the etag matches.',
    ...over,
  };
}

const writtenAt = new Date('2026-09-23T14:12:03.000Z');

/** Everything after the rule, which is the reader's own text and nothing else. */
function bodyOf(document: string): string {
  const rule = document.indexOf('\n---\n\n');
  if (rule === -1) throw new Error('the document carries no rule separating context from text');
  return document.slice(rule + '\n---\n\n'.length);
}

describe('what the recovery file says about where the text came from', () => {
  it('names the lesson by number and title, and the lesson key', () => {
    const document = recoveryDocument(subject(), writtenAt);

    expect(document).toContain('Lesson 04: How a request is shaped');
    expect(document).toContain('LS-M020-04');
  });

  it('names the activity, and the field by both its label and its authored name', () => {
    const document = recoveryDocument(subject(), writtenAt);

    expect(document).toContain('ACT-M020-04-02');
    // Both, because the label is what the reader recognises and the authored name is what the
    // release and any future export key on. A file carrying only one of them cannot be placed back.
    expect(document).toContain('Your prediction');
    expect(document).toContain('prediction');
  });

  it('names the content version and the release the text was written against', () => {
    const document = recoveryDocument(subject(), writtenAt);

    expect(document).toContain('1.0.0-draft');
    expect(document).toContain('FSSE-HTTP-FIRST-FIFTEEN');
    expect(document).toContain('1.0.1-draft');
  });

  it('names when the file was written, as an instant rather than in this machine’s locale', () => {
    const document = recoveryDocument(subject(), writtenAt);

    // A file the owner may send to the content author is read on a machine that is not this one.
    // `storedWhen`'s locale wording is right beside a box and wrong inside a file that travels.
    expect(document).toContain('2026-09-23T14:12:03.000Z');
  });

  it('says in a sentence that nothing was stored, so the file cannot be mistaken for a save', () => {
    const document = recoveryDocument(subject(), writtenAt);

    expect(document).toMatch(/never acknowledged/i);
  });
});

describe('the reader’s own text inside the file', () => {
  it('appears after the rule, character for character', () => {
    const text = 'I think it answers 304.';

    expect(bodyOf(recoveryDocument(subject({ text }), writtenAt))).toBe(text);
  });

  it('keeps leading and trailing whitespace, blank lines and runs of spaces', () => {
    const text = '  first line\n\n\n    indented   with   runs\ntrailing spaces   \n';

    expect(bodyOf(recoveryDocument(subject({ text }), writtenAt))).toBe(text);
  });

  it('is not fenced, so an answer containing three backticks survives whole', () => {
    const text = 'I would send:\n\n```\nGET / HTTP/1.1\n```\n\nand expect 200.';

    const document = recoveryDocument(subject({ text }), writtenAt);

    expect(bodyOf(document)).toBe(text);
    // Exactly the two the reader typed, and none of our own wrapped around them.
    expect(document.split('```')).toHaveLength(3);
  });

  it('escapes nothing, so Markdown the reader typed stays as they typed it', () => {
    const text = '# Not a heading I want rewritten\n- [ ] not a checkbox of ours\n<b>literal</b>';

    expect(bodyOf(recoveryDocument(subject({ text }), writtenAt))).toBe(text);
  });

  it('carries an empty answer as an empty body rather than inventing a placeholder', () => {
    expect(bodyOf(recoveryDocument(subject({ text: '' }), writtenAt))).toBe('');
  });

  it('puts nothing after the text', () => {
    const text = 'the last thing I wrote';

    expect(recoveryDocument(subject({ text }), writtenAt).endsWith(text)).toBe(true);
  });
});

describe('what the file is called', () => {
  it('names the lesson, the activity and the field, and ends .md', () => {
    expect(recoveryFileName(subject())).toBe(
      'unsaved-lesson-04-ACT-M020-04-02-prediction.md',
    );
  });

  it('pads the lesson number, so a folder of fifteen sorts the way they are read', () => {
    expect(recoveryFileName(subject({ lesson: { ...lesson, order: 9 } }))).toContain('lesson-09');
    expect(recoveryFileName(subject({ lesson: { ...lesson, order: 15 } }))).toContain('lesson-15');
  });

  it('replaces every character a file name cannot safely carry', () => {
    // An activity id and a field name are both content: nothing in the release format promises
    // either is free of a slash, a space or a colon, and a slash in particular would write the file
    // into a directory nobody asked for.
    const name = recoveryFileName(
      subject({ activityId: 'ACT/M020 04:02', fieldName: 'help used?' }),
    );

    expect(name).toBe('unsaved-lesson-04-ACT-M020-04-02-help-used.md');
    expect(name).not.toMatch(/[/\\:*?"<>| ]/);
  });

  it('collapses runs and trims, so no name ends in a dangling dash', () => {
    const name = recoveryFileName(subject({ activityId: '  ACT -- 07  ', fieldName: 'prediction' }));

    expect(name).toBe('unsaved-lesson-04-ACT-07-prediction.md');
  });

  it('still produces a usable name when the ids carry nothing safe at all', () => {
    const name = recoveryFileName(subject({ activityId: '///', fieldName: '???' }));

    expect(name).toMatch(/^unsaved-lesson-04[a-z0-9.-]*\.md$/);
    expect(name.endsWith('.md')).toBe(true);
    expect(name).not.toContain('--');
  });
});
