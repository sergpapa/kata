import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { CourseScope } from '../course.js';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { activity, lessonBody, lessonContext, panelOf } from '../testkit/activityFixture.js';

/**
 * Criterion C in docs/specs/activity-placement.md: what an activity panel says, and what it must
 * never say. Where the panel goes is ActivityPlacement.test.tsx's job; this file only reads one.
 */

afterEach(cleanup);

describe('what the panel says', () => {
  it('names the kind in words, and the activity by its id', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[activity({ activityId: 'ACT-A', kind: 'prediction_and_observation' })]}
        />
      </CourseScope>,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).toContain('Prediction and observation');
    expect(text).toContain('ACT-A');
  });

  it('puts a box for each field the activity asks for, in the file’s own order', () => {
    // Re-aimed by docs/specs/acknowledged-saves.md F1. It asserted the order of a sentence listing
    // the fields; that sentence is gone, and the claim lands on the labelled controls the reader
    // actually meets, which is where the order matters.
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[activity({ activityId: 'ACT-A' })]}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );

    const labels = [...panelOf(container, 'ACT-A').querySelectorAll('.response-field label')].map(
      (label) => (label.textContent ?? '').trim().toLowerCase(),
    );
    expect(labels).toEqual([
      'your prediction',
      'what you observed',
      'your explanation',
      'whether you used help',
    ]);
  });

  it('shows an unrecognised kind or field as the author’s own token', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-A',
              kind: 'sketch_and_defend',
              responseFields: ['sketch'],
            }),
          ]}
        />
      </CourseScope>,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).toContain('sketch_and_defend');
    expect(text).toContain('sketch');
  });

  it('claims nothing about submitting, completing or grading the work', () => {
    // What survives of the retired "says the app cannot record it yet" test. Its ban on the word
    // *saved* is exactly what this slice makes obsolete, and F3/F5/F6 replace it with something
    // stronger: the word is tied to a server acknowledgement rather than forbidden outright. The
    // other words stay forbidden — nothing in this app submits, completes or grades anything.
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[activity({ activityId: 'ACT-A' })]}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    for (const forbidden of [
      /\bsubmitted\b/i,
      /\bcompleted?\b/i,
      /\bgraded\b/i,
      /\bmarked\b/i,
      /\bpassed\b/i,
    ]) {
      expect(text, `the panel must not say ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('offers somewhere to type for every field, which is what slice 9 deliberately withheld', () => {
    // The inverse of what this file asserted through slice 9, and the point of this one. A box that
    // keeps nothing was the dishonesty worth refusing; a box backed by an acknowledged write is the
    // thing Milestone 2 exists to build.
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[activity({ activityId: 'ACT-A' })]}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );

    const panel = panelOf(container, 'ACT-A');
    expect(panel.querySelectorAll('textarea')).toHaveLength(4);
    expect(panel.querySelectorAll('[contenteditable]')).toHaveLength(0);
  });

  it('does not repeat the title when it is the heading the panel sits under', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[activity({ activityId: 'ACT-A' })]}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );

    expect(panelOf(container, 'ACT-A').textContent).not.toContain(
      'Practice A: explain a supplied exchange',
    );
  });

  it('shows the title when the author gave the activity a different one', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-A', title: 'Record your reading of the exchange' }),
          ]}
        />
      </CourseScope>,
    );

    expect(panelOf(container, 'ACT-A').textContent).toContain(
      'Record your reading of the exchange',
    );
  });
});

/**
 * The cases test-guardian's PRE pass found unguarded: a section with more than one block of
 * authored content, and a section with a subsection inside it. In the shipped release 16 of the 45
 * activities sit in multi-block sections, so "insert directly under the heading" and "insert at the
 * section's end" are different pages for a third of the content — and the simple fixtures above
 * cannot tell them apart.
 */

/**
 * The review findings that are about what the panel says rather than where it goes.
 */
describe('the review findings in the panel', () => {
  it('does not reprint the heading when the match came from the markdown spelling', () => {
    // The marker carried only the heading's rendered text, and the title is hidden only when it
    // equals that — so an activity matched by the authored spelling printed the section's own
    // name back, backticks and all, one line under the heading it sits beneath.
    const body = ['### What kind of action? `GET`', '', 'Prose.'].join('\n');
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={body}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-RAW',
              title: 'What kind of action? `GET`',
              sourceHeading: 'What kind of action? `GET`',
            }),
          ]}
        />
      </CourseScope>,
    );

    expect(panelOf(container, 'ACT-RAW').textContent).not.toContain('What kind of action?');
  });

  it('offers nowhere to write when the activity declares no fields', () => {
    // Re-aimed by F1. The sentence whose absence this asserted is gone; the absence that matters
    // now is the boxes themselves.
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[activity({ activityId: 'ACT-NONE', responseFields: [] })]}
        />
      </CourseScope>,
    );

    const panel = panelOf(container, 'ACT-NONE');
    expect(panel.querySelectorAll('.response-field')).toHaveLength(0);
    expect(panel.querySelectorAll('textarea')).toHaveLength(0);
  });

  it('names each panel for a screen reader, so three of them are not three unnamed regions', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[activity({ activityId: 'ACT-A', kind: 'prediction_and_observation' })]}
        />
      </CourseScope>,
    );

    const label = panelOf(container, 'ACT-A').getAttribute('aria-label') ?? '';
    expect(label).toContain('Prediction and observation');
    expect(label).toContain('ACT-A');
  });
});
