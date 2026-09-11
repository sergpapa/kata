import { vi } from 'vitest';

/**
 * The local server, stood in for. `fetch` is the only boundary the client has, so it is the only
 * thing worth faking — every page under test still runs its own real parsing of what comes back.
 *
 * Routed by URL rather than by call order: the shell and a page can both be in flight at once, and
 * a queue of answers would then hand the wrong body to whichever asked first.
 */
export function answerRoutes(bodies: Readonly<Record<string, unknown>>, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const body = Object.entries(bodies).find(([path]) => url.startsWith(path))?.[1];
      return new Response(JSON.stringify(body ?? { state: 'failed' }), {
        status: body === undefined ? 404 : status,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
}

export function lesson(order: number, title: string) {
  const id = `LS-M020-0${order}`;
  return {
    order,
    candidateLessonId: id,
    contentVersion: order === 1 ? '2.0.0-draft' : '1.0.0-draft',
    documentId: `FSSE-HTTP-STUDENT-0${order}`,
    module: 'M020',
    displayTitle: title,
    manifestTitle: title,
    sourcePath: `lessons/HTTP_Lesson_0${order}_Student_Edition_v1.md`,
    sha256: `${order}`.repeat(64),
    labId: order === 1 ? null : 'FSSE-HTTP-LAB-03-05',
  };
}

export const releaseSummary = {
  releaseId: 'FSSE-HTTP-FIRST-FIVE',
  version: '1.0.0-draft',
  date: '2026-09-11',
  status: 'owner-review candidate; not approved for public release',
  audience: 'Introductory HTTP learners',
  manifestSha256: 'f'.repeat(64),
  importedAt: '2026-09-11T10:00:00.000Z',
};

/** The five real titles, so a test that reads the dashboard reads what the owner reads. */
export const fiveLessons = [
  lesson(1, 'Lesson 1: What happens when your browser asks for something?'),
  lesson(2, 'Lesson 2: Give the browser an address—and something to answer'),
  lesson(3, 'Lesson 3: One menu, three ways to carry it'),
  lesson(4, 'Lesson 4: Ask the café directly—and inspect its reply'),
  lesson(5, 'Lesson 5: One page can make several requests'),
];

export function importedRelease(lessons = fiveLessons) {
  return { state: 'imported', release: releaseSummary, lessons };
}

export function lessonDetail(order: number, bodyMarkdown = '## A heading\n\nSome prose.\n') {
  return {
    state: 'lesson',
    release: { releaseId: releaseSummary.releaseId, version: releaseSummary.version },
    lesson: {
      ...(fiveLessons[order - 1] as ReturnType<typeof lesson>),
      facts: [
        { key: 'status', label: 'Status', kind: 'line', text: 'not yet learner-tested' },
        { key: 'audience', label: 'Audience', kind: 'line', text: 'Introductory HTTP learners' },
      ],
      bodyMarkdown,
    },
  };
}
