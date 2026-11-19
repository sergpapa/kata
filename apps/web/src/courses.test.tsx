import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { CourseScope } from './course.js';
import { LessonMarkdown } from './markdown/LessonMarkdown.js';
import { activity, lessonBody, lessonContext } from './testkit/activityFixture.js';
import { lessonDetail, releaseSummary } from './testkit/apiFixture.js';
import { boxOf, saveButton, saved, stateOf, stubFetch } from './testkit/responseFieldHarness.js';

/**
 * Criteria C10–C14 in docs/specs/multi-course.md: the course list, course-scoped pages, the old
 * lesson address forwarding, and every request a course page makes staying inside its course.
 */

afterEach(() => {
  requests.length = 0;
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

const courseList = {
  courses: [
    {
      courseId: 'FSSE',
      title: 'Full-Stack Software Engineering',
      state: 'imported',
      audience: 'Introductory HTTP learners',
      lessonCount: 15,
    },
    {
      courseId: 'QAAE',
      title: 'QA Automation Engineering',
      state: 'imported',
      audience: 'Experienced manual testers',
      lessonCount: 1,
    },
  ],
};

const qaLesson = {
  order: 1,
  candidateLessonId: 'LS-Q01-01',
  contentVersion: '1.0.0-draft',
  documentId: 'QAAE-STUDENT-01',
  module: 'Q01',
  displayTitle: 'Lesson 1: The test you run by hand',
  manifestTitle: 'Lesson 1: The test you run by hand',
  sourcePath: 'lessons/QAAE_Lesson_01_Student_Edition_v1.md',
  sha256: 'c'.repeat(64),
  labId: null,
};

const qaRelease = {
  state: 'imported',
  course: { courseId: 'QAAE', title: 'QA Automation Engineering' },
  release: {
    ...releaseSummary,
    releaseId: 'QAAE-LESSON-01',
    audience: 'Experienced manual testers',
  },
  lessons: [qaLesson],
};

/**
 * Answers by exact path, recording every URL asked for. Exact rather than by prefix, so that a
 * page asking the wrong course's address gets a 404 here instead of somebody else's answer.
 */
function answerExactly(bodies: Readonly<Record<string, { status?: number; body: unknown }>>) {
  const asked: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      asked.push(url);
      requests.push(`${init?.method ?? 'GET'} ${url}`);
      const answer = bodies[url];
      return new Response(JSON.stringify(answer?.body ?? { error: 'not_found' }), {
        status: answer ? (answer.status ?? 200) : 404,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return asked;
}

/** Every request with its method, for the claims a URL alone cannot make (a PUT versus a GET). */
const requests: string[] = [];

function at(path: string): void {
  window.history.replaceState({}, '', path);
}

function learnLink(): HTMLElement {
  return within(screen.getByRole('navigation', { name: 'Sections' })).getByRole('link', {
    name: /learn/i,
  });
}

describe('the course list at / (C10, C13)', () => {
  it('shows one card per course, with its audience and size, linking to its dashboard', async () => {
    answerExactly({ '/api/courses': { body: courseList } });
    at('/');

    render(<App />);

    const qa = await screen.findByRole('link', { name: /QA Automation Engineering/ });
    expect(qa.getAttribute('href')).toBe('/courses/QAAE');
    expect(
      screen.getByRole('link', { name: /Full-Stack Software Engineering/ }).getAttribute('href'),
    ).toBe('/courses/FSSE');
    expect(screen.getByText('Experienced manual testers')).toBeTruthy();
    expect(screen.getByText(/15 lessons/)).toBeTruthy();
    expect(screen.getByText(/1 lesson\b/)).toBeTruthy();
  });

  it('shows a refused course’s reason in place of its size', async () => {
    answerExactly({
      '/api/courses': {
        body: {
          courses: [
            courseList.courses[0],
            {
              courseId: 'QAAE',
              title: 'QA Automation Engineering',
              state: 'failed',
              failure: {
                code: 'manifest_missing',
                message: 'There is no learning-release.json in the QA release directory.',
                file: null,
              },
            },
          ],
        },
      },
    });
    at('/');

    render(<App />);

    expect(
      await screen.findByText('There is no learning-release.json in the QA release directory.'),
    ).toBeTruthy();
    expect(screen.queryByText(/1 lesson\b/)).toBeNull();
  });

  it('asks for the course list and for no course’s release, so no course note is shown', async () => {
    const asked = answerExactly({ '/api/courses': { body: courseList } });
    at('/');

    render(<App />);
    await screen.findByRole('link', { name: /QA Automation Engineering/ });

    expect(asked).toEqual(['/api/courses']);
    const sidebar = screen.getByRole('navigation', { name: 'Sections' });
    expect(sidebar.textContent).not.toContain('Experienced manual testers');
    expect(sidebar.textContent).not.toContain('QA Automation Engineering');
    expect(learnLink().getAttribute('href')).toBe('/');
    expect(learnLink().getAttribute('aria-current')).toBe('page');
  });

  it('names the page Courses in the breadcrumb', async () => {
    answerExactly({ '/api/courses': { body: courseList } });
    at('/');

    render(<App />);

    const trail = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    await waitFor(() => expect(trail.textContent).toContain('Courses'));
    // B2 in docs/specs/kata-brand.md: the product is called Kata.
    expect(trail.textContent).toContain('Kata');
    expect(trail.textContent).not.toContain('EduCode');
    // On the course list the name is where you are, so it is text, not a link back to itself.
    expect(within(trail).queryByRole('link', { name: 'Kata' })).toBeNull();
  });
});

describe('a course’s own pages (C11, C13, C14)', () => {
  it('draws the QA course’s dashboard from its own release, linking lessons inside the course', async () => {
    const asked = answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': { body: { state: 'none' } },
    });
    at('/courses/QAAE');

    render(<App />);

    const link = await screen.findByRole('link', { name: /The test you run by hand/ });
    expect(link.getAttribute('href')).toBe('/courses/QAAE/lessons/LS-Q01-01');
    expect(asked.every((url) => url.startsWith('/api/courses/QAAE/'))).toBe(true);
  });

  it('points Learn at the course’s dashboard and names the course in the sidebar note', async () => {
    answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': { body: { state: 'none' } },
    });
    at('/courses/QAAE');

    render(<App />);

    const sidebar = screen.getByRole('navigation', { name: 'Sections' });
    await within(sidebar).findByText('QA Automation Engineering');
    expect(learnLink().getAttribute('href')).toBe('/courses/QAAE');
    // The course is named above its release's audience and size (C13).
    const note = sidebar.textContent ?? '';
    expect(note.indexOf('QA Automation Engineering')).toBeLessThan(
      note.indexOf('Experienced manual testers'),
    );
    expect(note).toContain('1 lesson');
  });

  it('reads a lesson through its own course, and links back to that course', async () => {
    const asked = answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/lessons/LS-Q01-01': {
        body: {
          ...lessonDetail(1),
          release: { releaseId: 'QAAE-LESSON-01', version: '1.0.0-draft' },
          lesson: { ...lessonDetail(1).lesson, ...qaLesson },
          activities: [],
          responses: [],
          labKit: null,
          previous: null,
          next: null,
        },
      },
      '/api/courses/QAAE/resume-point': { body: { state: 'set' } },
    });
    at('/courses/QAAE/lessons/LS-Q01-01');

    render(<App />);

    await screen.findByRole('heading', { level: 1, name: /The test you run by hand/ });
    expect(screen.getByRole('link', { name: /all lessons/i }).getAttribute('href')).toBe(
      '/courses/QAAE',
    );
    await waitFor(() => expect(requests).toContain('PUT /api/courses/QAAE/resume-point'));
    expect(asked.every((url) => url.startsWith('/api/courses/QAAE/'))).toBe(true);
  });

  it('answers an unknown course with the no-page page and a way back to the list', async () => {
    const asked = answerExactly({
      '/api/courses/NOPE/release': {
        status: 404,
        body: { error: 'course_not_found', message: 'There is no course NOPE.' },
      },
    });
    at('/courses/NOPE');

    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: /There is no page at this address/ }),
    ).toBeTruthy();
    // Asked, not assumed: the page reads the course as a course and lets the server say it is not.
    expect(asked).toContain('/api/courses/NOPE/release');
    const main = screen.getByRole('main');
    expect(within(main).getByRole('link').getAttribute('href')).toBe('/');
  });

  it('links the resume card to the lesson inside the course', async () => {
    answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': {
        body: {
          state: 'set',
          candidateLessonId: 'LS-Q01-01',
          recordedAt: '2026-11-03T09:00:00.000Z',
        },
      },
    });
    at('/courses/QAAE');

    render(<App />);

    const card = await screen.findByTestId('current-lesson');
    expect(
      within(card)
        .getByRole('link', { name: /continue lesson/i })
        .getAttribute('href'),
    ).toBe('/courses/QAAE/lessons/LS-Q01-01');
  });

  it('keeps every control on a QA lesson page inside the QA course', async () => {
    const secondLesson = {
      ...qaLesson,
      order: 2,
      candidateLessonId: 'LS-Q01-02',
      documentId: 'QAAE-STUDENT-02',
      displayTitle: 'Lesson 2: Set up your workbench',
      manifestTitle: 'Lesson 2: Set up your workbench',
      labId: 'QAAE-LAB-01',
    };
    const asked = answerExactly({
      '/api/courses/QAAE/release': {
        body: { ...qaRelease, lessons: [qaLesson, secondLesson] },
      },
      '/api/courses/QAAE/lessons/LS-Q01-02': {
        body: {
          state: 'lesson',
          release: { releaseId: 'QAAE-LESSON-01', version: '1.0.0-draft' },
          lesson: {
            ...secondLesson,
            facts: [],
            bodyMarkdown: lessonBody,
          },
          activities: [activity({ activityId: 'ACT-A', lessonId: 'LS-Q01-02' })],
          responses: [],
          labKit: {
            labId: 'QAAE-LAB-01',
            version: '1.0.0-draft',
            fileName: 'QAAE_Workbench_Kit_v1.zip',
            byteSize: 1024,
            sha256: 'd'.repeat(64),
            lessons: [{ order: 2, candidateLessonId: 'LS-Q01-02' }],
          },
          previous: {
            order: 1,
            candidateLessonId: 'LS-Q01-01',
            displayTitle: 'Lesson 1: The test you run by hand',
          },
          next: null,
        },
      },
      '/api/courses/QAAE/resume-point': { body: { state: 'set' } },
      '/api/courses/QAAE/activities/ACT-A/responses/prediction': {
        body: { state: 'saved', revision: 1, updatedAt: '2026-11-03T09:01:00.000Z' },
      },
    });
    at('/courses/QAAE/lessons/LS-Q01-02');

    const { container } = render(<App />);
    await screen.findByRole('heading', { level: 1, name: /Set up your workbench/ });

    const between = screen.getByRole('navigation', { name: 'Between lessons' });
    expect(within(between).getByRole('link').getAttribute('href')).toBe(
      '/courses/QAAE/lessons/LS-Q01-01',
    );
    expect(
      screen
        .getByRole('region', { name: /practice kit/i })
        .querySelector('a[href*="/download"]')
        ?.getAttribute('href'),
    ).toBe('/api/courses/QAAE/labs/QAAE-LAB-01/download');

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'It passes.' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    expect(requests).toContain('PUT /api/courses/QAAE/activities/ACT-A/responses/prediction');
    expect(asked.every((url) => url.startsWith('/api/courses/QAAE/'))).toBe(true);
  });

  it('draws the other course’s lessons, not the first’s, after moving between courses', async () => {
    answerExactly({
      '/api/courses/FSSE/release': {
        body: {
          state: 'imported',
          course: { courseId: 'FSSE', title: 'Full-Stack Software Engineering' },
          release: releaseSummary,
          lessons: [
            { ...qaLesson, candidateLessonId: 'LS-M020-01', displayTitle: 'Lesson 1: HTTP' },
          ],
        },
      },
      '/api/courses/FSSE/resume-point': { body: { state: 'none' } },
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': { body: { state: 'none' } },
    });
    at('/courses/FSSE');
    render(<App />);
    await screen.findByRole('link', { name: /Lesson 1: HTTP/ });

    window.history.pushState({}, '', '/courses/QAAE');
    window.dispatchEvent(new PopStateEvent('popstate'));

    await screen.findByRole('link', { name: /The test you run by hand/ });
    expect(screen.queryByRole('link', { name: /Lesson 1: HTTP/ })).toBeNull();
    expect(learnLink().getAttribute('href')).toBe('/courses/QAAE');
  });

  it('names the course in the breadcrumb, which leads back to the course list (design review)', async () => {
    answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': { body: { state: 'none' } },
    });
    at('/courses/QAAE');

    render(<App />);

    const trail = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    await waitFor(() => expect(trail.textContent).toContain('QA Automation Engineering'));
    expect(within(trail).getByRole('link', { name: 'Kata' }).getAttribute('href')).toBe('/');
    expect(within(trail).getAllByRole('listitem').at(-1)?.textContent?.trim()).toBe(
      'Learning workspace',
    );
  });

  it('names the course in a lesson breadcrumb, linking to its dashboard', async () => {
    answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/lessons/LS-Q01-01': {
        body: {
          ...lessonDetail(1),
          release: { releaseId: 'QAAE-LESSON-01', version: '1.0.0-draft' },
          lesson: { ...lessonDetail(1).lesson, ...qaLesson },
          activities: [],
          responses: [],
          labKit: null,
          previous: null,
          next: null,
        },
      },
      '/api/courses/QAAE/resume-point': { body: { state: 'set' } },
    });
    at('/courses/QAAE/lessons/LS-Q01-01');

    render(<App />);

    const trail = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    const course = await within(trail).findByRole('link', { name: 'QA Automation Engineering' });
    expect(course.getAttribute('href')).toBe('/courses/QAAE');
  });

  it('calls the sidebar note the current course, not a release (design review)', async () => {
    answerExactly({
      '/api/courses/QAAE/release': { body: qaRelease },
      '/api/courses/QAAE/resume-point': { body: { state: 'none' } },
    });
    at('/courses/QAAE');

    render(<App />);

    const sidebar = screen.getByRole('navigation', { name: 'Sections' });
    await within(sidebar).findByText('CURRENT COURSE');
    expect(sidebar.textContent).not.toContain('THIS RELEASE');
  });

  it('points Learn at the course list from a page outside any course', async () => {
    answerExactly({});
    at('/practice');

    render(<App />);

    await screen.findByRole('heading', { level: 1 });
    expect(learnLink().getAttribute('href')).toBe('/');
  });

  it('saves an answer under the course whose lesson it is on', async () => {
    // `ACT-A`: the harness's field readers look a panel up by that id.
    const { calls } = stubFetch(saved(1));
    const { container } = render(
      <CourseScope courseId="QAAE">
        <LessonMarkdown
          markdown={lessonBody}
          activities={[activity({ activityId: 'ACT-A' })]}
          responses={[]}
          lessonContext={lessonContext}
        />
      </CourseScope>,
    );
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'It passes.' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    expect(calls[0]?.url).toBe('/api/courses/QAAE/activities/ACT-A/responses/prediction');
  });
});

describe('the old one-course lesson address (C12)', () => {
  it('becomes the full-stack course’s lesson address without adding a history entry', async () => {
    answerExactly({});
    at('/lessons/LS-M020-02');
    const entries = window.history.length;

    render(<App />);

    await waitFor(() => expect(window.location.pathname).toBe('/courses/FSSE/lessons/LS-M020-02'));
    expect(window.history.length).toBe(entries);
  });
});
