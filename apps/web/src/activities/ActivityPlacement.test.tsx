import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import type { LessonActivity } from '../releaseTypes.js';

/**
 * Criteria P and C in docs/specs/activity-placement.md: an activity's panel lands at the end of
 * the section its `source_heading` names, and says what the activity asks for without offering
 * anywhere to answer it.
 *
 * Placement is asserted as DOM order rather than by looking the panel up on its own: "after the
 * right heading" is the whole claim, and an element that exists somewhere on the page satisfies
 * nothing.
 */

function activity(over: Partial<LessonActivity> = {}): LessonActivity {
  return {
    activityId: 'ACT-FIX-01',
    lessonId: 'LS-FIX-01',
    kind: 'interpretation',
    title: 'Practice A: explain a supplied exchange',
    sourceHeading: 'Practice A: explain a supplied exchange',
    responseFields: ['prediction', 'observation', 'explanation', 'help_used'],
    promptMarkdown: 'The prompt the author wrote, which is already on the page.',
    ...over,
  };
}

const lessonBody = [
  'Opening prose before any section.',
  '',
  '## 9. Try a similar example with less help',
  '',
  'Prose inside the ninth section.',
  '',
  '### Practice A: explain a supplied exchange',
  '',
  'The client sends a request.',
  '',
  '### Practice B: repair an explanation',
  '',
  'A learner writes something wrong.',
  '',
  '### Practice explanations',
  '',
  'The worked answers, which stay readable.',
  '',
  '## 10. What you should be able to explain now',
  '',
  'Closing prose.',
].join('\n');

/** The body's own children in order, with each activity panel named by the activity it carries. */
function bodyOrder(container: HTMLElement): string[] {
  const body = container.querySelector('.lesson-body');
  if (!body) throw new Error('no lesson body rendered');
  return [...body.children].map((element) => {
    if (element.classList.contains('activity-panel')) {
      return `panel:${element.getAttribute('data-activity-id')}`;
    }
    return `${element.tagName.toLowerCase()}:${(element.textContent ?? '').trim()}`;
  });
}

function panelOf(container: HTMLElement, activityId: string): HTMLElement {
  const panel = container.querySelector(`.activity-panel[data-activity-id="${activityId}"]`);
  if (!panel) throw new Error(`no panel for ${activityId}`);
  return panel as HTMLElement;
}

afterEach(cleanup);

describe('where an activity panel lands', () => {
  it('sits at the end of its own section, before the next heading a reader sees as a peer', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({ activityId: 'ACT-A' }),
          activity({
            activityId: 'ACT-B',
            title: 'Practice B: repair an explanation',
            sourceHeading: 'Practice B: repair an explanation',
          }),
        ]}
      />,
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
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({
            activityId: 'ACT-LAST',
            title: '10. What you should be able to explain now',
            sourceHeading: '10. What you should be able to explain now',
          }),
        ]}
      />,
    );

    expect(bodyOrder(container).at(-1)).toBe('panel:ACT-LAST');
  });

  it('ends a deeper section at the next shallower heading, not at the lesson’s end', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({
            activityId: 'ACT-LASTSUB',
            title: 'Practice explanations',
            sourceHeading: 'Practice explanations',
          }),
        ]}
      />,
    );

    const order = bodyOrder(container);
    expect(order.indexOf('panel:ACT-LASTSUB')).toBe(
      order.indexOf('h2:10. What you should be able to explain now') - 1,
    );
  });

  it('renders the authored excerpt exactly once and never repeats the prompt', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({ activityId: 'ACT-A', promptMarkdown: 'A prompt nobody should see twice.' }),
        ]}
      />,
    );

    expect(container.querySelectorAll('.activity-panel')).toHaveLength(1);
    expect(container.textContent).not.toContain('A prompt nobody should see twice.');
    expect(container.textContent?.match(/The client sends a request\./g)).toHaveLength(1);
  });

  it('places nothing and reports nothing when the lesson carries no activities', () => {
    const unplaced = vi.fn();
    const { container } = render(
      <LessonMarkdown markdown={lessonBody} activities={[]} onUnplacedActivities={unplaced} />,
    );

    expect(container.querySelectorAll('.activity-panel')).toHaveLength(0);
    expect(unplaced).toHaveBeenCalledWith([]);
  });

  it('leaves the contents list exactly as it was, with no panel in it', async () => {
    const withActivities = vi.fn();
    const without = vi.fn();
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[activity({ activityId: 'ACT-A' })]}
        onOutline={withActivities}
      />,
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
      <LessonMarkdown
        markdown={body}
        activities={[
          activity({
            activityId: 'ACT-RAW',
            title: 'What kind of action? `GET`',
            sourceHeading: 'What kind of action? `GET`',
          }),
        ]}
      />,
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
      <LessonMarkdown
        markdown={body}
        activities={[
          activity({
            activityId: 'ACT-RENDERED',
            title: 'What kind of action? GET',
            sourceHeading: 'What kind of action? GET',
          }),
        ]}
      />,
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
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({ activityId: 'ACT-A' }),
          activity({
            activityId: 'ACT-GONE',
            title: 'Practice Z: a section the author renamed',
            sourceHeading: 'Practice Z: a section the author renamed',
          }),
        ]}
        onUnplacedActivities={unplaced}
      />,
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
      <LessonMarkdown
        markdown={body}
        activities={[activity({ activityId: 'ACT-TWICE', sourceHeading: 'Practice A' })]}
        onUnplacedActivities={unplaced}
      />,
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
      <LessonMarkdown
        markdown={lessonBody}
        activities={activities}
        onUnplacedActivities={unplaced}
      />,
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

describe('what the panel says', () => {
  it('names the kind in words, and the activity by its id', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[activity({ activityId: 'ACT-A', kind: 'prediction_and_observation' })]}
      />,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).toContain('Prediction and observation');
    expect(text).toContain('ACT-A');
  });

  it('names what the activity asks for, in the file’s own order', () => {
    const { container } = render(
      <LessonMarkdown markdown={lessonBody} activities={[activity({ activityId: 'ACT-A' })]} />,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    const positions = [
      'your prediction',
      'what you observed',
      'your explanation',
      'whether you used help',
    ].map((phrase) => text.indexOf(phrase));
    expect(positions.every((at) => at >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('shows an unrecognised kind or field as the author’s own token', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({ activityId: 'ACT-A', kind: 'sketch_and_defend', responseFields: ['sketch'] }),
        ]}
      />,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).toContain('sketch_and_defend');
    expect(text).toContain('sketch');
  });

  it('says the app cannot record it yet, and claims nothing about saving', () => {
    const { container } = render(
      <LessonMarkdown markdown={lessonBody} activities={[activity({ activityId: 'ACT-A' })]} />,
    );

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).toContain('cannot store');
    expect(text).toMatch(/nowhere/i);
    for (const forbidden of [
      /\bsaved\b/i,
      /\bsubmitted\b/i,
      /\bcompleted?\b/i,
      /\bkept\b/i,
      /\brecorded\b/i,
    ]) {
      expect(text, `the panel must not say ${forbidden}`).not.toMatch(forbidden);
    }
  });

  it('offers nowhere to type, not even a disabled box', () => {
    const { container } = render(
      <LessonMarkdown markdown={lessonBody} activities={[activity({ activityId: 'ACT-A' })]} />,
    );

    const panel = panelOf(container, 'ACT-A');
    expect(
      panel.querySelectorAll('input, textarea, select, button, [contenteditable]'),
    ).toHaveLength(0);
  });

  it('does not repeat the title when it is the heading the panel sits under', () => {
    const { container } = render(
      <LessonMarkdown markdown={lessonBody} activities={[activity({ activityId: 'ACT-A' })]} />,
    );

    expect(panelOf(container, 'ACT-A').textContent).not.toContain(
      'Practice A: explain a supplied exchange',
    );
  });

  it('shows the title when the author gave the activity a different one', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({ activityId: 'ACT-A', title: 'Record your reading of the exchange' }),
        ]}
      />,
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
      <LessonMarkdown
        markdown={richBody}
        activities={[
          activity({
            activityId: 'ACT-WHOLE',
            sourceHeading: '4. Read one request, one piece at a time',
            title: '4. Read one request, one piece at a time',
          }),
        ]}
      />,
    );

    expect(bodyOrder(container)).toEqual([
      'h2:4. Read one request, one piece at a time',
      'p:The first paragraph of the section.',
      'div:httpGET /menu HTTP/1.1',
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
      <LessonMarkdown
        markdown={richBody}
        activities={[
          activity({
            activityId: 'ACT-SUB',
            sourceHeading: 'First subsection',
            title: 'First subsection',
          }),
        ]}
      />,
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
      <LessonMarkdown
        markdown={diagramBody}
        activities={[
          activity({
            activityId: 'ACT-DIAGRAM',
            sourceHeading: 'A section with a diagram',
            title: 'A section with a diagram',
          }),
        ]}
      />,
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
