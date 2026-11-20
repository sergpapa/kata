/**
 * Phase A of the acceptance run: the first-five release on a brand-new store. The first-five
 * handoff's §6 checks, except "Update content", which needs the later release (phase D).
 */
import fs from 'node:fs';
import path from 'node:path';
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

const A = 'vs-code-first-five-v1';
/** Written under Lesson 2 1.0.0-draft; phase D checks the export still says so after 1.0.1. */
export const LESSON_2_ANSWER = 'A2 prediction on Lesson 2 under 1.0.0-draft.';

export async function firstFive({ page, boot, downloads }) {
  await boot(A);
  const mA = manifestOf(A);
  const relA = (await api('/courses/FSSE/release')).body;
  note(
    'H1-1 import',
    relA.lessons.length === 5 &&
      relA.lessons.every(
        (l, i) =>
          l.candidateLessonId === mA.lessons[i].lesson_id &&
          l.contentVersion === mA.lessons[i].version &&
          l.sha256 === mA.lessons[i].sha256 &&
          l.order === i + 1,
      ),
    `${relA.lessons.length} lessons: ${relA.lessons.map((l) => `${l.candidateLessonId}@${l.contentVersion}`).join(', ')}; release ${relA.release.releaseId}`,
  );

  // Lesson 2 at 1.0.0-draft carries the CF-001 semicolon defect, so its diagram is not required
  // to draw here; phase D requires it at 1.0.1.
  for (const l of mA.lessons) {
    const r = await renderedVsSource(page, A, l);
    note(`H1-render ${l.lesson_id}`, r.same, `${r.words}; opens "${r.got.firstText.slice(0, 80)}"`);
  }

  for (const id of ['LS-M020-03', 'LS-M020-04', 'LS-M020-05']) {
    const kit = (await api(`/courses/FSSE/lessons/${id}`)).body.labKit;
    const m = mA.lab_downloads.find((k) => k.lab_id === kit?.labId);
    note(
      `H1-4 kit on ${id}`,
      kit?.labId === 'FSSE-HTTP-LAB-03-05' && kit.sha256 === m?.sha256,
      `${kit?.labId} ${kit?.version} ${kit?.sha256?.slice(0, 12)} manifest ${m?.sha256?.slice(0, 12)}`,
    );
  }

  // Work in Lessons 1, 2 and 4, typed and saved through the UI.
  const L1 = (await api('/courses/FSSE/lessons/LS-M020-01')).body.activities[0];
  const L2 = (await api('/courses/FSSE/lessons/LS-M020-02')).body.activities[0];
  const L4 = (await api('/courses/FSSE/lessons/LS-M020-04')).body.activities[0];
  const f4 = L4.responseFields[0];
  await page.goto(lessonUrl('LS-M020-01'), { waitUntil: 'networkidle' });
  const s1 = await typeAndSave(
    page,
    L1.activityId,
    L1.responseFields[0],
    'A1 on Lesson 1 — "quotes" and `ticks`.',
  );
  await page.goto(lessonUrl('LS-M020-02'), { waitUntil: 'networkidle' });
  const s2 = await typeAndSave(page, L2.activityId, 'prediction', LESSON_2_ANSWER);
  await page.goto(lessonUrl('LS-M020-04'), { waitUntil: 'networkidle' });
  const s4 = await typeAndSave(page, L4.activityId, f4, 'A4 prediction on Lesson 4.');
  note(
    'H1-5 saves',
    [s1, s2, s4].every((s) => s.state === 'saved'),
    [s1, s2, s4].map((s) => `${s.state} "${s.words.replace(/\s+/g, ' ')}"`).join('; '),
  );
  const r1 = await responsesOf('LS-M020-01');
  const r2 = await responsesOf('LS-M020-02');
  note(
    'H1-5 tied to own lesson',
    Object.keys(r1).every((k) => k.startsWith('ACT-M020-01')) &&
      Object.keys(r2).every((k) => k.startsWith('ACT-M020-02')),
    `L1 holds ${Object.keys(r1).join(',')}; L2 holds ${Object.keys(r2).join(',')}`,
  );

  await page.reload({ waitUntil: 'networkidle' });
  const field4 = page.locator(
    `.activity-panel[data-activity-id="${L4.activityId}"] .response-field[data-field-name="${f4}"]`,
  );
  const box4 = field4.locator('.response-box');
  note(
    'H1-6 refresh',
    (await box4.inputValue()) === 'A4 prediction on Lesson 4.' &&
      (await field4.getAttribute('data-state')) === 'saved',
    `after reload: "${await box4.inputValue()}", state ${await field4.getAttribute('data-state')}`,
  );

  await box4.fill('A4 edited but not saved.');
  note(
    'H1-6 unsaved label',
    (await field4.getAttribute('data-state')) !== 'saved',
    `edited without Save: state ${await field4.getAttribute('data-state')}`,
  );

  // A save the network refuses: the box keeps the edit, the store keeps the earlier answer.
  await page.route('**/responses/**', (route) => route.abort('connectionrefused'));
  await field4.locator('.response-save').click();
  await page.waitForTimeout(800);
  const failState = await field4.getAttribute('data-state');
  const stillTyped = await box4.inputValue();
  const stored = (await responsesOf('LS-M020-04'))[`${L4.activityId}/${f4}`];
  const failure = (
    await field4
      .locator('.response-failure')
      .innerText()
      .catch(() => '(none)')
  ).trim();
  note(
    'H1-7 save failure',
    failState === 'failed' &&
      stillTyped === 'A4 edited but not saved.' &&
      stored?.text === 'A4 prediction on Lesson 4.',
    `state ${failState}; box keeps "${stillTyped}"; store keeps "${stored?.text}"; failure text: "${failure}"`,
  );
  await page.unroute('**/responses/**');
  await field4.locator('.response-save').click();
  await page.waitForTimeout(800);
  note(
    'H1-7 recover',
    (await field4.getAttribute('data-state')) === 'saved' &&
      (await responsesOf('LS-M020-04'))[`${L4.activityId}/${f4}`]?.text ===
        'A4 edited but not saved.',
    `retry after the network returns: ${await field4.getAttribute('data-state')}`,
  );

  const beforeRestart = await learnerSnapshot();
  await boot(A);
  const afterRestart = await learnerSnapshot();
  note(
    'H1-6 restart',
    stable(beforeRestart) === stable(afterRestart),
    `resume ${afterRestart.resume.candidateLessonId}; ${Object.keys(afterRestart.responses).length} fields identical across a restart`,
  );

  // Answers: no lock, timer or score wording, no disabled disclosure; explanations are lesson text.
  await page.goto(lessonUrl('LS-M020-04'), { waitUntil: 'networkidle' });
  const gate = await page.evaluate(() => ({
    gateWords:
      document.body.innerText.match(
        /\b(unlock|locked|wait \d+|available in|score to|answers? (?:hidden|locked))\b/gi,
      ) ?? [],
    disabled: document.querySelectorAll(
      'details[aria-disabled="true"], summary[aria-disabled="true"]',
    ).length,
    explanations: [...document.querySelectorAll('.lesson-body h2, .lesson-body h3')]
      .map((h) => h.textContent)
      .filter((t) => /explan|answer|solution|worked/i.test(t)),
  }));
  note(
    'H1-8 answers',
    gate.gateWords.length === 0 && gate.disabled === 0 && gate.explanations.length > 0,
    `gate words ${JSON.stringify(gate.gateWords)}; explanation headings: ${gate.explanations.slice(0, 4).join(' | ')}`,
  );

  await page.goto(`${baseUrl}/courses/FSSE`, { waitUntil: 'networkidle' });
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-button').click(),
  ]);
  const exportFile = path.join(downloads, `A-${dl.suggestedFilename()}`);
  await dl.saveAs(exportFile);
  const exp = fs.readFileSync(exportFile, 'utf8');
  note(
    'H1-9 export',
    exp.includes('A4 edited but not saved.') &&
      exp.includes(L4.activityId) &&
      exp.includes('1.0.0-draft') &&
      exp.includes('FSSE-HTTP-FIRST-FIVE'),
    `${dl.suggestedFilename()}: the Lesson 4 answer, ${L4.activityId}, 1.0.0-draft and the release id`,
  );

  const claims = await page.evaluate(
    () =>
      document.body.innerText.match(
        /\b(mastery|mastered|graduat\w*|verified|competen\w*|reviewed by|passed)\b/gi,
      ) ?? [],
  );
  note(
    'H1-11 no mastery claim',
    claims.length === 0,
    `claim words on the dashboard: ${JSON.stringify(claims)}`,
  );
}
