/**
 * What the acceptance run measures with: the result log, learner-state snapshots read through the
 * API, a save typed through the UI, and the rendered-against-source structure comparison.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { api, baseUrl, releaseDir } from './server.mjs';

export const results = [];

/** Records one observation; `ok` true, false, or null for information only. */
export function note(check, ok, evidence) {
  results.push({ check, ok, evidence });
  console.log(`${ok === true ? 'PASS' : ok === false ? 'FAIL' : 'INFO'} ${check}: ${evidence}`);
}

export const manifestOf = (rel) =>
  JSON.parse(fs.readFileSync(path.join(releaseDir(rel), 'learning-release.json'), 'utf8'));
export const sha = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
export const lessonUrl = (id) => `${baseUrl}/courses/FSSE/lessons/${id}`;

/** Every saved response the API reports for one lesson, keyed `activity/field`. */
export async function responsesOf(id) {
  const body = (await api(`/courses/FSSE/lessons/${id}`)).body;
  const out = {};
  for (const r of body.responses ?? []) out[`${r.activityId}/${r.fieldName}`] = r;
  return out;
}

/** All learner state the API exposes: every saved field and the resume point. */
export async function learnerSnapshot() {
  const release = (await api('/courses/FSSE/release')).body;
  const snap = { resume: (await api('/courses/FSSE/resume-point')).body, responses: {} };
  for (const l of release.lessons) {
    Object.assign(snap.responses, await responsesOf(l.candidateLessonId));
  }
  return snap;
}

/** A snapshot as a string that is equal exactly when the stored text and revisions are. */
export const stable = (snap) =>
  JSON.stringify({
    resume: snap.resume,
    responses: Object.fromEntries(
      Object.entries(snap.responses)
        .sort()
        .map(([k, v]) => [k, { text: v.text, revision: v.revision, updatedAt: v.updatedAt }]),
    ),
  });

/** Types into one field through the UI and presses Save; answers the field's state afterwards. */
export async function typeAndSave(page, activityId, field, text) {
  const box = page.locator(
    `.activity-panel[data-activity-id="${activityId}"] .response-field[data-field-name="${field}"]`,
  );
  await box.locator('.response-box').fill(text);
  await box.locator('.response-save').click();
  await page.waitForFunction(
    (el) => el && el.getAttribute('data-state') !== 'saving',
    await box.elementHandle(),
  );
  await page.waitForTimeout(300);
  return {
    state: await box.getAttribute('data-state'),
    words: (await box.locator('.response-state').innerText()).trim(),
  };
}

/**
 * Counts headings, tables, code blocks and Mermaid blocks in the source (front matter removed) and
 * in the rendered lesson body outside the activity panels, and how many diagrams actually drew.
 */
export async function renderedVsSource(page, rel, lesson) {
  const src = fs
    .readFileSync(path.join(releaseDir(rel), lesson.path), 'utf8')
    .replace(/^---[\s\S]*?\n---\n/, '');
  const fences = [...src.matchAll(/^```(\S*)/gm)].map((m) => m[1]);
  const opens = fences.filter((_, i) => i % 2 === 0);
  const want = {
    headings: (src.match(/^#{2,4} /gm) ?? []).length,
    tables: (src.match(/^\|?\s*:?-{3,}:?\s*\|/gm) ?? []).length,
    code: opens.filter((l) => l !== 'mermaid').length,
    diagrams: opens.filter((l) => l === 'mermaid').length,
  };
  await page.goto(lessonUrl(lesson.lesson_id), { waitUntil: 'networkidle' });
  const got = await page.evaluate(() => {
    const body = document.querySelector('.lesson-body');
    const all = (sel) =>
      [...body.querySelectorAll(sel)].filter((el) => !el.closest('.activity-panel'));
    return {
      headings: all('h2, h3, h4').length,
      tables: all('table').length,
      // A diagram's own source block is a code block too; it is counted with the diagram.
      code: all('.code-block').filter((el) => !el.closest('.diagram')).length,
      diagrams: all('.diagram').length,
      drawn: 0,
      firstText: body.innerText.slice(0, 160).replace(/\s+/g, ' '),
    };
  });
  // Drawn inside a sandboxed iframe, and only once the diagram scrolls into view.
  const diagrams = page.locator('.lesson-body .diagram');
  for (let i = 0; i < got.diagrams; i += 1) {
    await diagrams.nth(i).scrollIntoViewIfNeeded();
    try {
      await diagrams
        .nth(i)
        .frameLocator('iframe')
        .locator('svg')
        .first()
        .waitFor({ timeout: 15000 });
      got.drawn += 1;
    } catch {
      // Not drawn: reported through the count.
    }
  }
  const same =
    want.headings === got.headings &&
    want.tables === got.tables &&
    want.code === got.code &&
    want.diagrams === got.diagrams;
  const words = `source h=${want.headings} t=${want.tables} code=${want.code} mermaid=${want.diagrams}; rendered h=${got.headings} t=${got.tables} code=${got.code} diagrams=${got.diagrams} drawn=${got.drawn}`;
  return { want, got, same, words };
}
