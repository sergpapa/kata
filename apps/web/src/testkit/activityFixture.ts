import type { LessonActivity } from '../releaseTypes.js';

/**
 * The fixtures the activity tests share: one activity, one lesson body with the shapes that matter,
 * and the two readers that turn a rendered body into something a test can state a claim about.
 *
 * Shared rather than duplicated because `lessonBody`'s exact headings are load-bearing in both
 * files — a copy that drifted by one word would make one suite quietly assert nothing.
 */

export function activity(over: Partial<LessonActivity> = {}): LessonActivity {
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

export const lessonBody = [
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
export function bodyOrder(container: HTMLElement): string[] {
  const body = container.querySelector('.lesson-body');
  if (!body) throw new Error('no lesson body rendered');
  return [...body.children].map((element) => {
    if (element.classList.contains('activity-panel')) {
      return `panel:${element.getAttribute('data-activity-id')}`;
    }
    return `${element.tagName.toLowerCase()}:${(element.textContent ?? '').trim()}`;
  });
}

export function panelOf(container: HTMLElement, activityId: string): HTMLElement {
  const panel = container.querySelector(`.activity-panel[data-activity-id="${activityId}"]`);
  if (!panel) throw new Error(`no panel for ${activityId}`);
  return panel as HTMLElement;
}
