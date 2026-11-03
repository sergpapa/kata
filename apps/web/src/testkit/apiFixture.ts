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
  // Course order 1–8 is module M020; 9–13 restart the lesson number inside M021, exactly as the
  // thirteen-release's manifest keys them. Position and identity must not be conflated — that is
  // the bug the handoff warns about ("do not make lesson 1 of M021 replace the first course lesson").
  const id = order <= 8 ? `LS-M020-0${order}` : `LS-M021-0${order - 8}`;
  return {
    order,
    candidateLessonId: id,
    contentVersion: order === 1 ? '2.0.0-draft' : '1.0.0-draft',
    documentId: `FSSE-HTTP-STUDENT-${String(order).padStart(2, '0')}`,
    module: order <= 8 ? 'M020' : 'M021',
    displayTitle: title,
    manifestTitle: title,
    sourcePath: `lessons/HTTP_Lesson_${String(order).padStart(2, '0')}_Student_Edition_v1.md`,
    sha256: String(order).padStart(2, '0').repeat(32),
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

/** The real titles, so a test that reads the dashboard reads what the owner reads. */
export const fiveLessons = [
  lesson(1, 'Lesson 1: What happens when your browser asks for something?'),
  lesson(2, 'Lesson 2: Give the browser an address—and something to answer'),
  lesson(3, 'Lesson 3: One menu, three ways to carry it'),
  lesson(4, 'Lesson 4: Ask the café directly—and inspect its reply'),
  lesson(5, 'Lesson 5: One page can make several requests'),
];

/** The thirteen-release list, in manifest order across both modules; kept as the fifteen's base. */
const thirteenLessons = [
  ...fiveLessons,
  lesson(6, 'Lesson 6: Follow the code that chooses the reply'),
  lesson(7, 'Lesson 7: Add opening hours—and check the promise'),
  lesson(8, 'Lesson 8: The reply arrived. Why is it the wrong one?'),
  lesson(9, 'Lesson 9: The same address can give you a different answer'),
  lesson(10, 'Lesson 10: Keeping a copy is not permission to reuse it forever'),
  lesson(11, 'Lesson 11: Ask whether your copy still applies'),
  lesson(12, 'Lesson 12: Make the conditional decision precise'),
  lesson(13, 'Lesson 13: What the server sent is not always what the page received'),
];

/** The full fifteen-release list; orders 14–15 are the investigation pair, still inside M021. */
export const fifteenLessons = [
  ...thirteenLessons,
  lesson(14, 'Lesson 14: The notice changed. Why are returning visitors still seeing the old one?'),
  lesson(15, 'Lesson 15: Repair the cause—and make the evidence survive your fix'),
];

export function importedRelease(lessons = fiveLessons) {
  return {
    state: 'imported',
    course: { courseId: 'FSSE', title: 'Full-Stack Software Engineering' },
    release: releaseSummary,
    lessons,
  };
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
