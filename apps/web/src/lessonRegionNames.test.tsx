import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LessonPage } from './LessonPage.js';
import { fiveLessons, releaseSummary } from './testkit/apiFixture.js';
import { area, claudeTurn, conversation, learnerTurn } from './testkit/feedbackFixture.js';

/**
 * Criteria AX6–AX8 in docs/specs/accessibility-pass.md across one whole lesson page.
 *
 * A lesson renders Markdown in three kinds of place: the body, an activity's prompt (when its
 * authored section is missing), and each of Claude's replies. Numbering inside each place alone
 * would give the page two regions called "Code sample 1, ts" — the duplicate-name defect this slice
 * removes, back again the moment a reply quotes code. So each place beside the body says where it
 * is, and every region name on the page is checked for uniqueness at once.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TABLE_AND_CODE = [
  '| Method | Path |',
  '| --- | --- |',
  '| GET | / |',
  '',
  '```ts',
  'const a = 1;',
  '```',
  '',
  // A diagram too: its source block is a region, and must say where it is like the others. It is
  // not drawn here (Mermaid cannot load in jsdom); its source block is shown either way.
  '```mermaid',
  'sequenceDiagram',
  '    A->>B: hello',
  '```',
];

const BODY = [
  '# Lesson 1: the authored title',
  '',
  '## Practice A',
  '',
  'Explain one click.',
  '',
  ...TABLE_AND_CODE,
].join('\n');

const activity = (id: string, title: string, promptMarkdown: string) => ({
  activityId: id,
  lessonId: 'LS-M020-01',
  kind: 'judgment',
  title,
  sourceHeading: title,
  responseFields: ['prediction'],
  promptMarkdown,
});

function serveTwoActivities(): void {
  const json = (value: unknown) =>
    new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (!url.startsWith('/api/courses/FSSE/lessons/')) return json({ state: 'none' });
      return json({
        state: 'lesson',
        release: { releaseId: releaseSummary.releaseId, version: releaseSummary.version },
        lesson: { ...fiveLessons[0], facts: [], bodyMarkdown: BODY },
        activities: [
          activity('ACT-A', 'Practice A', 'Explain one click.'),
          // No "## Practice B" in the body, so its prompt is shown in its panel.
          activity('ACT-B', 'Practice B', ['Trace this.', '', ...TABLE_AND_CODE].join('\n')),
        ],
        responses: [],
        feedback: {
          availability: { state: 'ready' },
          activities: [
            area({
              activityId: 'ACT-A',
              conversation: conversation([
                learnerTurn(1),
                claudeTurn(2, { text: ['Compare these:', '', ...TABLE_AND_CODE].join('\n') }),
                learnerTurn(3),
                // Claude's second reply is turn 4: the name says the turn, not "reply 2".
                claudeTurn(4, { text: ['And these:', '', ...TABLE_AND_CODE].join('\n') }),
              ]),
            }),
            area({ activityId: 'ACT-B' }),
          ],
        },
        labKit: null,
        previous: null,
        next: null,
      });
    }),
  );
}

describe('region names across one lesson page (AX6, AX7)', () => {
  it('gives every region on the page its own name, saying where each one is', async () => {
    serveTwoActivities();
    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);
    await screen.findByRole('region', { name: 'Feedback from Claude on Practice B' });

    const regionNames = screen.getAllByRole('region').map((one) => {
      const label = one.getAttribute('aria-label');
      if (label) return label;
      const by = one.getAttribute('aria-labelledby') ?? '';
      return by
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ');
    });
    expect(regionNames.length).toBeGreaterThan(12);
    expect(new Set(regionNames).size).toBe(regionNames.length);

    for (const name of [
      'Table 1: Method, Path',
      'Code sample 1, ts',
      'Source of diagram 1',
      'Table 1: Method, Path in the prompt for Practice B',
      'Code sample 1, ts in the prompt for Practice B',
      'Source of diagram 1 in the prompt for Practice B',
      'Table 1: Method, Path in Claude’s reply 2 on Practice A',
      'Code sample 1, ts in Claude’s reply 2 on Practice A',
      'Source of diagram 1 in Claude’s reply 2 on Practice A',
      'Table 1: Method, Path in Claude’s reply 4 on Practice A',
      'Code sample 1, ts in Claude’s reply 4 on Practice A',
      'Source of diagram 1 in Claude’s reply 4 on Practice A',
    ]) {
      expect(regionNames, name).toContain(name);
    }
  });
});

describe('the feedback area’s name (AX8)', () => {
  it('names the practice each area belongs to, and keeps its visible title', async () => {
    serveTwoActivities();
    render(<LessonPage courseId="FSSE" candidateLessonId="LS-M020-01" />);

    const a = await screen.findByRole('region', { name: 'Feedback from Claude on Practice A' });
    // Practice B's section is missing, so its panel is placed after the first render: wait for it.
    const b = await screen.findByRole('region', { name: 'Feedback from Claude on Practice B' });

    for (const area of [a, b]) {
      expect(area.querySelector('.feedback-title')?.textContent).toBe('Feedback from Claude');
    }
  });
});
