import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { CourseScope } from '../course.js';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import type { LessonActivity } from '../releaseTypes.js';
import { activity, bodyOrder, lessonBody, lessonContext } from '../testkit/activityFixture.js';

/**
 * Criterion P and U in docs/specs/activity-placement.md: an activity's panel lands at the end of
 * the section its `source_heading` names, or is reported as unplaceable rather than guessed at.
 * What the panel says is ActivityPanelCopy.test.tsx's job.
 *
 * Placement is asserted as DOM order rather than by looking the panel up on its own: "after the
 * right heading" is the whole claim, and an element that exists somewhere on the page satisfies
 * nothing.
 */

afterEach(cleanup);

describe('where an activity panel lands', () => {
  it('sits at the end of its own section, before the next heading a reader sees as a peer', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-A' }),
            activity({
              activityId: 'ACT-B',
              title: 'Practice B: repair an explanation',
              sourceHeading: 'Practice B: repair an explanation',
            }),
          ]}
        />
      </CourseScope>,
    );

    expect(bodyOrder(container)).toEqual([
      'p:Opening prose before any section.',
      'h2:9. Try a similar example with less help',
      'p:Prose inside the ninth section.',
      'h3:Practice A: explain a supplied exchange',
      'p:The client sends a request.',
      'panel:ACT-A',
      'h3:Practice B: repair an explanation',
      'p:A learner writes something wrong.',
      'panel:ACT-B',
      'h3:Practice explanations',
      'p:The worked answers, which stay readable.',
      'h2:10. What you should be able to explain now',
      'p:Closing prose.',
    ]);
  });

  it('sits at the very end when its section is the lesson’s last', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-LAST',
              title: '10. What you should be able to explain now',
              sourceHeading: '10. What you should be able to explain now',
            }),
          ]}
        />
      </CourseScope>,
    );

    expect(bodyOrder(container).at(-1)).toBe('panel:ACT-LAST');
  });

  it('ends a deeper section at the next shallower heading, not at the lesson’s end', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-LASTSUB',
              title: 'Practice explanations',
              sourceHeading: 'Practice explanations',
            }),
          ]}
        />
      </CourseScope>,
    );

    const order = bodyOrder(container);
    expect(order.indexOf('panel:ACT-LASTSUB')).toBe(
      order.indexOf('h2:10. What you should be able to explain now') - 1,
    );
  });

  it('renders the authored excerpt exactly once and never repeats the prompt', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-A', promptMarkdown: 'A prompt nobody should see twice.' }),
          ]}
        />
      </CourseScope>,
    );

    expect(container.querySelectorAll('.activity-panel')).toHaveLength(1);
    expect(container.textContent).not.toContain('A prompt nobody should see twice.');
    expect(container.textContent?.match(/The client sends a request\./g)).toHaveLength(1);
  });

  it('places nothing and reports nothing when the lesson carries no activities', () => {
    const unplaced = vi.fn();
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[]}
          onUnplacedActivities={unplaced}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );

    expect(container.querySelectorAll('.activity-panel')).toHaveLength(0);
    expect(unplaced).toHaveBeenCalledWith([]);
  });

  it('leaves the contents list exactly as it was, with no panel in it', async () => {
    const withActivities = vi.fn();
    const without = vi.fn();
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[activity({ activityId: 'ACT-A' })]}
          onOutline={withActivities}
        />
      </CourseScope>,
    );
    render(<LessonMarkdown markdown={lessonBody} onOutline={without} />);

    expect(container.querySelectorAll('.activity-panel')).toHaveLength(1);
    await waitFor(() => expect(withActivities).toHaveBeenCalled());
    await waitFor(() => expect(without).toHaveBeenCalled());
    expect(withActivities.mock.calls.at(-1)?.[0]).toEqual(without.mock.calls.at(-1)?.[0]);
    expect(JSON.stringify(withActivities.mock.calls.at(-1)?.[0])).not.toContain('ACT-A');
  });

  it('matches a heading carrying inline code, by the markdown the author wrote', () => {
    const body = ['### What kind of action? `GET`', '', 'Prose.', '', '## Next section'].join('\n');
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

    expect(bodyOrder(container)).toEqual([
      'h3:What kind of action? GET',
      'p:Prose.',
      'panel:ACT-RAW',
      'h2:Next section',
    ]);
  });

  it('matches the same heading by the text a reader sees', () => {
    const body = ['### What kind of action? `GET`', '', 'Prose.'].join('\n');
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={body}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-RENDERED',
              title: 'What kind of action? GET',
              sourceHeading: 'What kind of action? GET',
            }),
          ]}
        />
      </CourseScope>,
    );

    expect(bodyOrder(container)).toEqual([
      'h3:What kind of action? GET',
      'p:Prose.',
      'panel:ACT-RENDERED',
    ]);
  });
});

describe('an activity whose section is not there', () => {
  it('is reported as unplaced rather than dropped or guessed at', async () => {
    const unplaced = vi.fn();
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-A' }),
            activity({
              activityId: 'ACT-GONE',
              title: 'Practice Z: a section the author renamed',
              sourceHeading: 'Practice Z: a section the author renamed',
            }),
          ]}
          onUnplacedActivities={unplaced}
        />
      </CourseScope>,
    );

    await waitFor(() => expect(unplaced).toHaveBeenCalled());
    const reported = unplaced.mock.calls.at(-1)?.[0] as {
      activity: LessonActivity;
      reason: string;
    }[];
    expect(reported.map((entry) => entry.activity.activityId)).toEqual(['ACT-GONE']);
    expect(reported[0]?.reason).toBe('heading_missing');
    expect(container.querySelectorAll('.activity-panel')).toHaveLength(1);
  });

  it('refuses to guess when the lesson has two headings of the same name', async () => {
    const unplaced = vi.fn();
    const body = ['## Practice A', '', 'One.', '', '## Practice A', '', 'Two.'].join('\n');
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={body}
          lessonContext={lessonContext}
          activities={[activity({ activityId: 'ACT-TWICE', sourceHeading: 'Practice A' })]}
          onUnplacedActivities={unplaced}
        />
      </CourseScope>,
    );

    await waitFor(() => expect(unplaced).toHaveBeenCalled());
    const reported = unplaced.mock.calls.at(-1)?.[0] as {
      activity: LessonActivity;
      reason: string;
    }[];
    expect(reported.map((entry) => entry.activity.activityId)).toEqual(['ACT-TWICE']);
    expect(reported[0]?.reason).toBe('heading_ambiguous');
    expect(container.querySelectorAll('.activity-panel')).toHaveLength(0);
  });

  it('accounts for every activity it was given, placed or not', async () => {
    const unplaced = vi.fn();
    const activities = [
      activity({ activityId: 'ACT-A' }),
      activity({ activityId: 'ACT-GONE', sourceHeading: 'A heading nobody wrote' }),
      activity({
        activityId: 'ACT-LAST',
        sourceHeading: '10. What you should be able to explain now',
      }),
    ];
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={activities}
          onUnplacedActivities={unplaced}
        />
      </CourseScope>,
    );

    await waitFor(() => expect(unplaced).toHaveBeenCalled());
    const reported = unplaced.mock.calls.at(-1)?.[0] as { activity: LessonActivity }[];
    // The exact partition, not just the totals: a bug that places the wrong one and reports the
    // other as missing keeps the counts and ruins the page.
    expect(
      [...container.querySelectorAll('.activity-panel')].map((panel) =>
        panel.getAttribute('data-activity-id'),
      ),
    ).toEqual(['ACT-A', 'ACT-LAST']);
    expect(reported.map((entry) => entry.activity.activityId)).toEqual(['ACT-GONE']);
  });
});

describe('a section that is more than one paragraph', () => {
  const richBody = [
    '## 4. Read one request, one piece at a time',
    '',
    'The first paragraph of the section.',
    '',
    '```http',
    'GET /menu HTTP/1.1',
    '```',
    '',
    'A closing paragraph after the sample.',
    '',
    '### First subsection',
    '',
    'Prose inside the first subsection.',
    '',
    '### Second subsection',
    '',
    'Prose inside the second subsection.',
    '',
    '## 5. The next section',
    '',
    'Closing prose.',
  ].join('\n');

  it('puts the panel after every block the section holds, not under its heading', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={richBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-WHOLE',
              sourceHeading: '4. Read one request, one piece at a time',
              title: '4. Read one request, one piece at a time',
            }),
          ]}
        />
      </CourseScope>,
    );

    expect(bodyOrder(container)).toEqual([
      'h2:4. Read one request, one piece at a time',
      'p:The first paragraph of the section.',
      'div:GET /menu HTTP/1.1',
      'p:A closing paragraph after the sample.',
      'h3:First subsection',
      'p:Prose inside the first subsection.',
      'h3:Second subsection',
      'p:Prose inside the second subsection.',
      'panel:ACT-WHOLE',
      'h2:5. The next section',
      'p:Closing prose.',
    ]);
  });

  it('ends a subsection at its sibling, not at its parent’s end', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={richBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-SUB',
              sourceHeading: 'First subsection',
              title: 'First subsection',
            }),
          ]}
        />
      </CourseScope>,
    );

    const order = bodyOrder(container);
    expect(order[order.indexOf('panel:ACT-SUB') - 1]).toBe('p:Prose inside the first subsection.');
    expect(order[order.indexOf('panel:ACT-SUB') + 1]).toBe('h3:Second subsection');
  });

  it('leaves a diagram in the section it belongs to, whole', () => {
    const diagramBody = [
      '## A section with a diagram',
      '',
      '```mermaid',
      'sequenceDiagram',
      '  Browser->>Server: GET /menu',
      '```',
      '',
      'The words beneath the diagram.',
      '',
      '## The next section',
    ].join('\n');

    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={diagramBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-DIAGRAM',
              sourceHeading: 'A section with a diagram',
              title: 'A section with a diagram',
            }),
          ]}
        />
      </CourseScope>,
    );

    const order = bodyOrder(container);
    expect(order.indexOf('panel:ACT-DIAGRAM')).toBe(
      order.indexOf('p:The words beneath the diagram.') + 1,
    );
    expect(container.querySelector('.code-block-text')?.textContent).toContain(
      'Browser->>Server: GET /menu',
    );
  });
});

/**
 * The review findings and the paths the POST pass named as unexercised. Each of these is either a
 * defect the first implementation had, or logic that existed with nothing watching it.
 */

describe('the review findings in the renderer', () => {
  it('stacks two activities naming the same section in the file’s order', () => {
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-SECOND', sourceHeading: 'Practice explanations' }),
            activity({ activityId: 'ACT-THIRD', sourceHeading: 'Practice explanations' }),
          ]}
        />
      </CourseScope>,
    );

    const order = bodyOrder(container);
    expect(order.slice(order.indexOf('panel:ACT-SECOND'))).toEqual([
      'panel:ACT-SECOND',
      'panel:ACT-THIRD',
      'h2:10. What you should be able to explain now',
      'p:Closing prose.',
    ]);
  });

  it('places a subsection’s panel before its parent’s when both sections end together', () => {
    // Both resolve to the end of the document. The deeper section closes first, so its panel must
    // come first; the reverse would put the parent's panel inside the child's section.
    const body = ['## Parent', '', 'Parent prose.', '', '### Child', '', 'Child prose.'].join('\n');
    const { container } = render(
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={body}
          lessonContext={lessonContext}
          activities={[
            activity({ activityId: 'ACT-PARENT', sourceHeading: 'Parent' }),
            activity({ activityId: 'ACT-CHILD', sourceHeading: 'Child' }),
          ]}
        />
      </CourseScope>,
    );

    expect(bodyOrder(container)).toEqual([
      'h2:Parent',
      'p:Parent prose.',
      'h3:Child',
      'p:Child prose.',
      'panel:ACT-CHILD',
      'panel:ACT-PARENT',
    ]);
  });
});
