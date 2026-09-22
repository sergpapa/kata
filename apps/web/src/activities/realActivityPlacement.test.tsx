import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import type { LessonActivity } from '../releaseTypes.js';

/**
 * Criterion P4 in docs/specs/activity-placement.md: all 45 activities, against the author's own
 * fifteen lessons, in the renderer that actually draws them. A fixture proves the placement rule;
 * only this proves the rule holds over what the author wrote — an off-by-one fails an assertion
 * here rather than hoping a reviewer notices a panel under the wrong heading in a screenshot.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const releaseDir = path.join(repoRoot, 'content/releases/http-first-fifteen-v1_0_1/content');

interface ManifestLesson {
  lesson_id: string;
  path: string;
}

const manifest = JSON.parse(
  fs.readFileSync(path.join(releaseDir, 'learning-release.json'), 'utf8'),
) as { lessons: ManifestLesson[] };

const activityFile = JSON.parse(
  fs.readFileSync(path.join(releaseDir, 'trial-activities.json'), 'utf8'),
) as {
  activities: {
    activity_id: string;
    lesson_id: string;
    kind: string;
    title: string;
    source_heading: string;
    prompt_markdown: string;
    response_fields: string[];
  }[];
};

/** The server's own derivation, repeated here for the same reason realLessons.test.tsx repeats it. */
function bodyOf(lessonPath: string): string {
  const source = fs.readFileSync(path.join(releaseDir, lessonPath), 'utf8');
  const closing = source.indexOf('\n---', 4);
  const body = source.slice(source.indexOf('\n', closing + 1) + 1);
  const lines = body.split('\n');
  const title = lines.findIndex((line) => line.startsWith('# '));
  if (title >= 0) lines.splice(title, 1);
  return lines.join('\n');
}

function activitiesFor(lessonId: string): LessonActivity[] {
  return activityFile.activities
    .filter((entry) => entry.lesson_id === lessonId)
    .map((entry) => ({
      activityId: entry.activity_id,
      lessonId: entry.lesson_id,
      kind: entry.kind,
      title: entry.title,
      sourceHeading: entry.source_heading,
      responseFields: entry.response_fields,
      promptMarkdown: entry.prompt_markdown,
    }));
}

const headingDepth = (element: Element): number =>
  /^h[1-6]$/i.test(element.tagName) ? Number(element.tagName[1]) : 0;

afterEach(cleanup);

describe('the author’s own forty-five activities, placed', () => {
  it('has three for every one of the fifteen lessons', () => {
    expect(manifest.lessons).toHaveLength(15);
    for (const lesson of manifest.lessons) {
      expect(activitiesFor(lesson.lesson_id), lesson.lesson_id).toHaveLength(3);
    }
  });

  it.each(manifest.lessons.map((lesson) => [lesson.lesson_id, lesson.path] as const))(
    'places all three of %s at the end of their own sections',
    async (lessonId, lessonPath) => {
      const activities = activitiesFor(lessonId);
      const unplaced = vi.fn();
      const { container } = render(
        <LessonMarkdown
          markdown={bodyOf(lessonPath)}
          activities={activities}
          onUnplacedActivities={unplaced}
        />,
      );

      await waitFor(() => expect(unplaced).toHaveBeenCalled());
      expect(unplaced.mock.calls.at(-1)?.[0], `${lessonId} should place all three`).toEqual([]);

      const children = [...(container.querySelector('.lesson-body') as HTMLElement).children];
      expect(children.filter((child) => child.classList.contains('activity-panel'))).toHaveLength(
        3,
      );

      for (const activity of activities) {
        const panelAt = children.findIndex(
          (child) => child.getAttribute('data-activity-id') === activity.activityId,
        );
        expect(panelAt, `${activity.activityId} has a panel`).toBeGreaterThan(0);

        // The heading that opens this panel's section: the nearest one above it whose text is the
        // heading the author named.
        let openedAt = -1;
        for (let index = panelAt - 1; index >= 0; index -= 1) {
          const child = children[index] as Element;
          if (
            headingDepth(child) > 0 &&
            (child.textContent ?? '').trim() === activity.sourceHeading
          ) {
            openedAt = index;
            break;
          }
        }
        expect(
          openedAt,
          `${activity.activityId} sits under "${activity.sourceHeading}"`,
        ).toBeGreaterThanOrEqual(0);

        const depth = headingDepth(children[openedAt] as Element);

        // Where the section ends: the next heading a reader sees as a peer of this one, or the end
        // of the body. The panel must be the LAST thing inside it — checking only that no shallower
        // heading sits between the heading and the panel would be satisfied by a panel inserted
        // directly under the heading, with the whole section's prose trailing after it.
        let endsAt = children.length;
        for (let index = openedAt + 1; index < children.length; index += 1) {
          const between = headingDepth(children[index] as Element);
          if (between > 0 && between <= depth) {
            endsAt = index;
            break;
          }
        }

        expect(
          panelAt,
          `${activity.activityId} must be the last element of the section "${activity.sourceHeading}", ` +
            `which runs from child ${openedAt} to ${endsAt}`,
        ).toBe(endsAt - 1);

        // And everything the author wrote in that section is above it, in the order they wrote it.
        const authored = children.slice(openedAt + 1, panelAt);
        expect(
          authored.some((child) => child.classList.contains('activity-panel')),
          `${activity.activityId} shares its section with no other panel`,
        ).toBe(false);
      }
    },
  );

  it('never repeats a prompt that is already on the page', async () => {
    const lesson = manifest.lessons[0] as ManifestLesson;
    const activities = activitiesFor(lesson.lesson_id);
    const { container } = render(
      <LessonMarkdown markdown={bodyOf(lesson.path)} activities={activities} />,
    );

    await waitFor(() => expect(container.querySelectorAll('.activity-panel')).toHaveLength(3));
    for (const activity of activities) {
      const firstLine = (activity.promptMarkdown.split('\n')[0] ?? '').trim();
      const panel = container.querySelector(
        `.activity-panel[data-activity-id="${activity.activityId}"]`,
      );
      expect(panel?.textContent ?? '').not.toContain(firstLine);
    }
  });
});
