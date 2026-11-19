import { buildApp } from '../../../app.js';
import { testCourse } from '../../content/testkit/courseFixture.js';
import { importRelease } from '../../content/service.js';
import {
  lessonSource,
  makeFixture,
  makeTempDir,
  removeDir,
  replaceActivitySet,
  replaceLessonFile,
  writeFixture,
} from '../../content/testkit/releaseFixture.js';
import { openDatabase, type Db } from '../../lifecycle/database.js';
import type { FeedbackRunner } from '../types.js';
import { testFeedback } from './fakeRunner.js';

/**
 * A one-course app with a lesson that has a worked answer, for the feedback route tests.
 *
 * Lesson 1 carries "Practice A" (the activity's own section) and "Practice explanations" (the
 * worked answer). `ACT-FIX-01` names that worked answer; `ACT-FIX-NONE` names none.
 */

export const WORKED_ANSWER = '**Practice A:** The click requests `/api/menu` using GET.';

const lessonBody = [
  '# Lesson 1: the authored title',
  '',
  '## Practice A',
  '',
  'Explain one click.',
  '',
  '## Practice explanations',
  '',
  WORKED_ANSWER,
  '',
  '## Pause here',
  '',
  'Review prose that is not an answer.',
].join('\n');

export function activityRecord(over: Record<string, unknown> = {}) {
  return {
    activity_id: 'ACT-FIX-01',
    lesson_id: 'FIX-LS-01',
    kind: 'judgment',
    title: 'Practice A: explain one click',
    source_heading: 'Practice A',
    feedback_source_heading: 'Practice explanations',
    response_fields: ['prediction', 'observation', 'explanation', 'help_used'],
    prompt_markdown: 'Explain what the click requests.',
    ...over,
  };
}

export const twoActivities = [
  activityRecord(),
  activityRecord({
    activity_id: 'ACT-FIX-NONE',
    title: 'Practice B',
    source_heading: 'Practice A',
    feedback_source_heading: null,
  }),
];

const cleanup: (() => void)[] = [];

export function cleanUpFeedbackApps(): void {
  while (cleanup.length > 0) (cleanup.pop() as () => void)();
}

/** Builds the app on `db` (a fresh in-memory store unless given one, for restart tests). */
export function feedbackApp(runner: FeedbackRunner, options: { db?: Db; dir?: string } = {}) {
  const db = options.db ?? openDatabase(':memory:');
  let dir = options.dir;
  if (!dir) {
    dir = makeTempDir();
    const made = dir;
    cleanup.push(() => removeDir(made));
    const fixture = makeFixture();
    replaceLessonFile(
      fixture,
      'lessons/lesson-01.md',
      lessonSource(
        [
          'document_id: FIX-DOC-01',
          'version: "1.0.0-draft"',
          'module: M020',
          'candidate_lesson_id: FIX-LS-01',
        ].join('\n'),
        lessonBody,
      ),
    );
    replaceActivitySet(fixture, `${JSON.stringify({ activities: twoActivities }, null, 2)}\n`);
    writeFixture(dir, fixture);
  }
  if (!options.db) cleanup.push(() => db.close());

  const clock = testFeedback(runner);
  const app = buildApp({
    feedback: clock.deps,
    db,
    courses: [testCourse('FIX', dir, importRelease(db, dir))],
  });
  cleanup.push(() => void app.close());
  return { app, db, dir, clock };
}

export const FEEDBACK_URL = '/api/courses/FIX/activities/ACT-FIX-01/feedback';
export const LESSON_URL = '/api/courses/FIX/lessons/FIX-LS-01';

export const someBoxes = {
  prediction: 'The page will request the menu.',
  observation: '',
};

export function startBody(over: Record<string, unknown> = {}) {
  return { action: 'start', model: 'sonnet', fields: someBoxes, ...over };
}

/** One server-sent event, with its data parsed. */
export interface Sse {
  readonly event: string;
  // Parsed JSON the tests read field by field; typing it would restate the contract under test.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly data: any;
}

export function parseSse(payload: string): Sse[] {
  return payload
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block !== '' && !block.startsWith(':'))
    .map((block) => {
      const lines = block.split(/\r?\n/);
      const event =
        lines
          .find((line) => line.startsWith('event:'))
          ?.slice(6)
          .trim() ?? 'message';
      const data = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      return { event, data: JSON.parse(data) };
    });
}

/**
 * The events of a response that must be a stream. Says what came back instead when it is not, so a
 * refusal or a missing route reads as itself rather than as a JSON parse error.
 */
export function streamOf(response: {
  readonly statusCode: number;
  readonly headers: Record<string, unknown>;
  readonly payload: string;
}): Sse[] {
  const type = String(response.headers['content-type'] ?? '');
  if (response.statusCode !== 200 || !type.startsWith('text/event-stream')) {
    throw new Error(
      `Expected a 200 event stream, got ${response.statusCode} ${type}: ${response.payload.slice(0, 300)}`,
    );
  }
  return parseSse(response.payload);
}

type App = ReturnType<typeof feedbackApp>['app'];

export function post(
  app: App,
  payload: unknown,
  url = FEEDBACK_URL,
  headers: Record<string, string> = {},
) {
  return app.inject({
    method: 'POST',
    url,
    headers: { host: '127.0.0.1:8317', 'content-type': 'application/json', ...headers },
    payload: JSON.stringify(payload),
  });
}

export async function lessonFeedbackOf(app: App, activityId = 'ACT-FIX-01') {
  const response = await app.inject({
    method: 'GET',
    url: LESSON_URL,
    headers: { host: '127.0.0.1:8317' },
  });
  const body = response.json();
  return {
    availability: body.feedback?.availability,
    area: body.feedback?.activities?.find(
      (one: { activityId: string }) => one.activityId === activityId,
    ),
    all: body.feedback?.activities,
  };
}
