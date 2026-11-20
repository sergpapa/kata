/**
 * Phases B and C of the acceptance run: the 6–8 and 9–13 releases imported over the store phase A
 * wrote. The 6–8 handoff's "App acceptance checks" and the 9–13 handoff's "Acceptance in your app",
 * except the width checks (the screenshot gate) and the browser rehearsal (rehearse-09-13.mjs).
 */
import { api, baseUrl } from './server.mjs';
import {
  learnerSnapshot,
  lessonUrl,
  manifestOf,
  note,
  renderedVsSource,
  responsesOf,
  stable,
  typeAndSave,
} from './helpers.mjs';

const B = 'http-depth-and-lessons-06-08-v1';
const C = 'http-lessons-09-13-release-v1';

export async function sixToThirteen({ page, boot, kitCheck }) {
  const beforeB = await learnerSnapshot();
  await boot(B);
  const mB = manifestOf(B);
  const relB = (await api('/courses/FSSE/release')).body;
  const afterB = await learnerSnapshot();
  note(
    'H6-1 titles',
    relB.lessons.length === 8 &&
      relB.lessons.every(
        (l, i) =>
          l.displayTitle === mB.lessons[i].title && l.candidateLessonId === mB.lessons[i].lesson_id,
      ),
    relB.lessons.map((l) => l.displayTitle.slice(0, 22)).join(' / '),
  );
  const inNew = ['06', '07', '08'].map(
    (n) => Object.keys(afterB.responses).filter((k) => k.startsWith(`ACT-M020-${n}`)).length,
  );
  note(
    'H6-2 work survives import',
    stable(beforeB) === stable(afterB) && inNew.every((n) => n === 0),
    `resume ${afterB.resume.candidateLessonId}; ${Object.keys(afterB.responses).length} fields unchanged; Lessons 6/7/8 hold ${inNew.join('/')} answers`,
  );

  // Resume at Lesson 4 from the dashboard, then walk to 8 by Next.
  await page.goto(`${baseUrl}/courses/FSSE`, { waitUntil: 'networkidle' });
  const card = (await page.locator('[data-testid="current-lesson"]').innerText()).replace(
    /\s+/g,
    ' ',
  );
  await page.locator('[data-testid="current-lesson"] .lime-button').click();
  await page.waitForLoadState('networkidle');
  const walk = [page.url().split('/').pop()];
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.lesson-neighbours a').last().click();
    await page.waitForLoadState('networkidle');
    walk.push(page.url().split('/').pop());
  }
  note(
    'H6-3 resume and walk',
    walk.join(',') === 'LS-M020-04,LS-M020-05,LS-M020-06,LS-M020-07,LS-M020-08',
    `continue card "${card.slice(0, 60)}"; walked ${walk.join(' → ')}`,
  );

  for (const l of mB.lessons.slice(5)) {
    const r = await renderedVsSource(page, B, l);
    note(`H6-4 render ${l.lesson_id}`, r.same && r.got.drawn === r.want.diagrams, r.words);
  }

  for (const id of ['LS-M020-02', 'LS-M020-03', 'LS-M020-06'])
    await kitCheck(`H6-5 kit ${id}`, B, id);

  // kitCheck left the page on Lesson 6.
  const panels = await page.evaluate(() =>
    [...document.querySelectorAll('.lesson-body .activity-panel')].map((p) => p.dataset.activityId),
  );
  const acts6 = (await api('/courses/FSSE/lessons/LS-M020-06')).body.activities.map(
    (a) => a.activityId,
  );
  note(
    'H6-6 anchors',
    panels.length === acts6.length && acts6.every((id) => panels.includes(id)),
    `Lesson 6: ${panels.length} panels inside the lesson body for ${acts6.length} activities (${panels.join(', ')})`,
  );

  const meta = await page.evaluate(() => {
    const visible = (document.querySelector('main') ?? document.body).innerText;
    return {
      hashVisible: /[0-9a-f]{64}/.test(visible.replace(/SHA-256[\s\S]{0,90}/, '')),
      docIdVisible: /FSSE-HTTP-STUDENT-\d+/.test(visible),
      factsClosed: !document.querySelector('.lesson-facts-panel')?.open,
      kitHashClosed: !document.querySelector('.lab-kit-detail')?.open,
    };
  });
  note('H6-7 metadata kept aside', !meta.hashVisible && !meta.docIdVisible, JSON.stringify(meta));

  // ─── 9–13 ───────────────────────────────────────────────────────────────────────────────────
  const beforeC = await learnerSnapshot();
  await boot(C);
  const mC = manifestOf(C);
  const relC = (await api('/courses/FSSE/release')).body;
  note(
    'H9-1 thirteen in order',
    relC.lessons.length === 13 &&
      relC.lessons.every(
        (l, i) => l.candidateLessonId === mC.lessons[i].lesson_id && l.order === i + 1,
      ),
    relC.lessons.map((l) => l.candidateLessonId).join(','),
  );
  const l8 = (await api('/courses/FSSE/lessons/LS-M020-08')).body;
  const l13 = (await api('/courses/FSSE/lessons/LS-M021-05')).body;
  const planned = await api('/courses/FSSE/lessons/LS-M021-06');
  note(
    'H9-1 8→9, 13→end, no planned pages',
    l8.next?.candidateLessonId === 'LS-M021-01' && l13.next === null && planned.status === 404,
    `8.next=${l8.next?.candidateLessonId}; 13.next=${JSON.stringify(l13.next)}; LS-M021-06 answers ${planned.status}`,
  );
  const afterC = await learnerSnapshot();
  await boot(C);
  const afterC2 = await learnerSnapshot();
  note(
    'H9-2 before/after and re-import',
    stable(beforeC) === stable(afterC) && stable(afterC) === stable(afterC2),
    `${Object.keys(afterC2.responses).length} fields identical before, after the import and after a second identical import`,
  );

  await kitCheck('H9-4 kit 9–13 hash', C, 'LS-M021-01');

  // A prediction, navigate away, then an observation, then a reload.
  const a9 = (await api('/courses/FSSE/lessons/LS-M021-01')).body.activities[0];
  await page.goto(lessonUrl('LS-M021-01'), { waitUntil: 'networkidle' });
  const p9 = await typeAndSave(page, a9.activityId, 'prediction', 'C9 prediction before the run.');
  await page.goto(`${baseUrl}/courses/FSSE`, { waitUntil: 'networkidle' });
  await page.goto(lessonUrl('LS-M021-01'), { waitUntil: 'networkidle' });
  const o9 = await typeAndSave(page, a9.activityId, 'observation', 'C9 observation after the run.');
  await page.reload({ waitUntil: 'networkidle' });
  const r9 = await responsesOf('LS-M021-01');
  const shown = (f) =>
    page
      .locator(
        `.activity-panel[data-activity-id="${a9.activityId}"] .response-field[data-field-name="${f}"] .response-box`,
      )
      .inputValue();
  const after = await learnerSnapshot();
  const earlierKept = Object.keys(afterC2.responses).every(
    (k) => after.responses[k]?.text === afterC2.responses[k].text,
  );
  note(
    'H9-5 prediction + observation',
    p9.state === 'saved' &&
      o9.state === 'saved' &&
      r9[`${a9.activityId}/prediction`]?.text === 'C9 prediction before the run.' &&
      r9[`${a9.activityId}/observation`]?.text === 'C9 observation after the run.' &&
      (await shown('prediction')) === 'C9 prediction before the run.' &&
      earlierKept,
    `${a9.activityId}: prediction "${await shown('prediction')}", observation "${await shown('observation')}"; earlier records unchanged: ${earlierKept}`,
  );
}
