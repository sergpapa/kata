/**
 * Phase D of the acceptance run: the first-fifteen 1.0.1 release over the same store. The 14–15
 * handoff's "Acceptance" (the current 1.0.1 package's eight checks), except the kit's starting
 * state (kits.mjs) and the browser rehearsal (rehearse-14-15.mjs); and the first-five handoff's
 * "Update content", which needs a release that changes a lesson already answered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { api, baseUrl, releaseDir } from './server.mjs';
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
import { LESSON_2_ANSWER } from './phase-first-five.mjs';

const D = 'http-first-fifteen-v1_0_1';

export async function firstFifteen({ page, boot, kitCheck, downloads }) {
  const beforeD = await learnerSnapshot();
  await boot(D);
  const mD = manifestOf(D);
  const relD = (await api('/courses/FSSE/release')).body;
  const versionOf = Object.fromEntries(
    relD.lessons.map((l) => [l.candidateLessonId, l.contentVersion]),
  );
  note(
    'H14-1 fifteen, 2 and 7 patched',
    relD.lessons.length === 15 &&
      versionOf['LS-M020-02'] === '1.0.1-draft' &&
      versionOf['LS-M020-07'] === '1.0.1-draft' &&
      relD.lessons.every(
        (l, i) => l.contentVersion === mD.lessons[i].version && l.sha256 === mD.lessons[i].sha256,
      ),
    relD.lessons.map((l) => `${l.order}:${l.contentVersion.replace('-draft', '')}`).join(' '),
  );
  const l13 = (await api('/courses/FSSE/lessons/LS-M021-05')).body;
  const l14 = (await api('/courses/FSSE/lessons/LS-M021-06')).body;
  const l15 = (await api('/courses/FSSE/lessons/LS-M021-07')).body;
  const planned = await api('/courses/FSSE/lessons/LS-M021-08');
  note(
    'H14-1 13→14→15',
    l13.next?.candidateLessonId === 'LS-M021-06' &&
      l14.next?.candidateLessonId === 'LS-M021-07' &&
      l15.next === null &&
      planned.status === 404,
    `13.next=${l13.next?.candidateLessonId} 14.next=${l14.next?.candidateLessonId} 15.next=${JSON.stringify(l15.next)}; LS-M021-08 answers ${planned.status}`,
  );
  const afterD = await learnerSnapshot();
  await boot(D);
  const afterD2 = await learnerSnapshot();
  note(
    'H14-2 survives import and a second identical import',
    stable(beforeD) === stable(afterD) && stable(afterD) === stable(afterD2),
    `${Object.keys(afterD2.responses).length} fields identical; resume ${afterD2.resume.candidateLessonId}`,
  );

  for (const l of mD.lessons) {
    const r = await renderedVsSource(page, D, l);
    note(`H14-render ${l.lesson_id}`, r.same && r.got.drawn === r.want.diagrams, r.words);
  }

  // CF-001: Lesson 2's diagram draws, not the fallback, with the corrected message.
  await page.goto(lessonUrl('LS-M020-02'), { waitUntil: 'networkidle' });
  const d2 = page.locator('.lesson-body .diagram').first();
  await d2.scrollIntoViewIfNeeded();
  const svg2 = d2.frameLocator('iframe').locator('svg').first();
  await svg2.waitFor({ timeout: 15000 });
  const drawn = (await svg2.textContent()).replace(/\s+/g, ' ');
  const corrected = drawn.includes('Stopped, the file remains');
  const old = drawn.includes('Stopped; the file remains');
  note(
    'H14-8 Lesson 2 diagram drawn with CF-001',
    corrected && !old && (await d2.locator('.diagram-reason').count()) === 0,
    `drawn, no fallback; "Stopped, the file remains": ${corrected}; old semicolon form: ${old}`,
  );

  // Every copy button on Lessons 14 and 15, clipboard against the source. Windows' clipboard
  // stores line ends as CRLF, so LF is restored before comparing.
  for (const lesson of mD.lessons.slice(13)) {
    await page.goto(lessonUrl(lesson.lesson_id), { waitUntil: 'networkidle' });
    const src = fs
      .readFileSync(path.join(releaseDir(D), lesson.path), 'utf8')
      .replace(/\r\n/g, '\n');
    const blocks = page.locator('.lesson-body .code-block');
    const n = await blocks.count();
    let exact = 0;
    let multiLine = 0;
    let quoted = 0;
    const misses = [];
    for (let i = 0; i < n; i += 1) {
      await blocks.nth(i).locator('.code-block-copy').click();
      const clip = (await page.evaluate(() => navigator.clipboard.readText())).replace(
        /\r\n/g,
        '\n',
      );
      if (src.includes(clip.replace(/\n$/, ''))) exact += 1;
      else misses.push(JSON.stringify(clip.slice(0, 80)));
      if (clip.replace(/\n$/, '').includes('\n')) multiLine += 1;
      if (/["'`]/.test(clip)) quoted += 1;
    }
    note(
      `H14-3 copy ${lesson.lesson_id}`,
      n > 0 && exact === n,
      `${exact} of ${n} copied blocks verbatim in the source (${multiLine} multi-line, ${quoted} with quotes or backticks)${misses.length ? `; misses ${misses.join(' ')}` : ''}`,
    );
  }

  await kitCheck('H14-4 kit 14–15 hash', D, 'LS-M021-06');
  for (const id of ['LS-M020-02', 'LS-M020-07', 'LS-M021-01'])
    await kitCheck(`H14-4 earlier kit ${id}`, D, id);

  const a14 = l14.activities[0];
  const second = a14.responseFields.includes('explanation')
    ? 'explanation'
    : a14.responseFields.at(-1);
  await page.goto(lessonUrl('LS-M021-06'), { waitUntil: 'networkidle' });
  const p14 = await typeAndSave(page, a14.activityId, 'prediction', 'D14 prediction.');
  const e14 = await typeAndSave(page, a14.activityId, second, 'D14 explanation.');
  await page.reload({ waitUntil: 'networkidle' });
  const r14 = await responsesOf('LS-M021-06');
  const final = await learnerSnapshot();
  const earlierKept = Object.keys(afterD2.responses).every(
    (k) => final.responses[k]?.text === afterD2.responses[k].text,
  );
  note(
    'H14-5 new activity record',
    p14.state === 'saved' &&
      e14.state === 'saved' &&
      r14[`${a14.activityId}/prediction`]?.text === 'D14 prediction.' &&
      r14[`${a14.activityId}/${second}`]?.text === 'D14 explanation.' &&
      earlierKept,
    `${a14.activityId}: ${Object.entries(r14)
      .map(([k, v]) => `${k.split('/')[1]}="${v.text}"`)
      .join(', ')}; earlier records unchanged: ${earlierKept}`,
  );

  // The whole course exported: the Lesson 2 answer keeps the version it was written against.
  await page.goto(`${baseUrl}/courses/FSSE`, { waitUntil: 'networkidle' });
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('.export-button').click(),
  ]);
  const file = path.join(downloads, `D-${dl.suggestedFilename()}`);
  await dl.saveAs(file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const at = lines.indexOf(LESSON_2_ANSWER);
  const stamp =
    at >= 0 ? (lines.slice(at - 4, at).find((x) => x.startsWith('Current answer')) ?? '') : '';
  const header =
    at >= 0 ? (lines.slice(at - 20, at).find((x) => x.startsWith('- Content version:')) ?? '') : '';
  note(
    'H1-10 history keeps its version',
    stamp.includes('content version 1.0.0-draft of release FSSE-HTTP-FIRST-FIVE') &&
      header.includes('1.0.1-draft'),
    `lesson now "${header}"; the answer: "${stamp}"`,
  );
  note(
    'H1-9 final export',
    lines.includes('D14 prediction.') && lines.includes('C9 observation after the run.'),
    `${dl.suggestedFilename()}: ${lines.length} lines, with answers from all four phases`,
  );
}
