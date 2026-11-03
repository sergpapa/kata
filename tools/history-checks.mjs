/**
 * The earlier-versions half of the screenshot gate — criteria V24 and V25 in
 * docs/specs/prediction-history.md (ADR 0012).
 *
 * Why this cannot live in the vitest suite: jsdom applies no stylesheet and measures every box as
 * zero, so "the disclosure does not push the page sideways at 375px" and "an earlier answer wraps
 * inside its own block" pass there vacuously, whatever the CSS says. They are properties of
 * laid-out content and need a real engine.
 *
 * The seeding is deliberate and is named in the spec: without work in the store, every field on
 * every lesson shows no disclosure, and a check that only ever sees the empty case cannot tell a
 * correct app from one that never renders the thing at all.
 */

/**
 * Writes three accepted saves against one field through the app's own API — two distinct texts and
 * one repeat — and answers what the field should then show.
 *
 * Through the API rather than into the database, because the rule under test is the server's: the
 * repeat must append nothing, so the expected count is 2 and not 3. Seeding rows directly would
 * make this a test of the seeding.
 */
export async function seedHistory(baseUrl, courseId, lessonKey) {
  const course = `${baseUrl}/api/courses/${encodeURIComponent(courseId)}`;
  const answer = await fetch(`${course}/lessons/${encodeURIComponent(lessonKey)}`);
  const body = await answer.json();
  const activity = (body.activities ?? [])[0];
  if (!activity) throw new Error(`${lessonKey} carries no activity to seed history against`);
  const fieldName = activity.responseFields?.[0];
  if (!fieldName) throw new Error(`${activity.activityId} declares no response field`);

  const texts = [
    'I think the server answers 404, because the path looks wrong.',
    'It answered 200 — the path was right and I misread the request line.',
    'It answered 200 — the path was right and I misread the request line.',
  ];

  let revision = 0;
  for (const text of texts) {
    const response = await fetch(
      `${course}/activities/${encodeURIComponent(activity.activityId)}/responses/${encodeURIComponent(fieldName)}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text, expectedRevision: revision }),
      },
    );
    const saved = await response.json();
    if (saved.state !== 'saved') {
      throw new Error(
        `seeding ${activity.activityId}/${fieldName} was refused: ${JSON.stringify(saved)}`,
      );
    }
    revision = saved.revision;
  }

  // Two distinct texts written, three saves accepted: the repeat appends nothing (ADR 0012).
  return { activityId: activity.activityId, fieldName, earlierVersions: 1 };
}

/**
 * Whether the seeded field shows its earlier versions and no other field on the page shows any,
 * and whether the opened disclosure stays inside the page at this width — or a sentence saying
 * what is wrong.
 *
 * It opens the disclosure itself. The closed state is the one the gate has always captured, and
 * the previous slice left "open-disclosure captures" as a named deferral; an earlier answer is
 * long free text, which is the content most likely to push a 375px page sideways, so the open
 * state is the one worth the check.
 */
export async function checkEarlierVersions(page, seeded) {
  return page.evaluate(({ activityId, fieldName, earlierVersions }) => {
    const field = document.querySelector(
      `.activity-panel[data-activity-id="${CSS.escape(activityId)}"] .response-field[data-field-name="${CSS.escape(fieldName)}"]`,
    );
    if (!field) return `no ${fieldName} field on ${activityId}`;

    const history = field.querySelector('details.response-history');
    if (!history)
      return `${activityId}/${fieldName} shows no earlier versions, expected ${earlierVersions}`;

    const summary = (history.querySelector('summary')?.textContent ?? '').trim();
    if (!summary.includes(`(${earlierVersions})`)) {
      return `${activityId}/${fieldName} summarises its history as "${summary}", expected a count of ${earlierVersions}`;
    }

    // 44px (WCAG 2.5.8 asks 24, the project's own floor is 44 and .diagram-source summary already
    // clears it). jsdom measures every box as zero, so this can only be asserted here.
    const target = history.querySelector('summary').getBoundingClientRect();
    if (target.height < 44) {
      return `the earlier-versions disclosure is ${Math.round(target.height)}px tall, under the 44px target floor`;
    }

    const elsewhere = [...document.querySelectorAll('.response-field')].filter(
      (one) => one !== field && one.querySelector('details.response-history') !== null,
    );
    if (elsewhere.length > 0) {
      return `${elsewhere.length} fields with nothing superseded still show an earlier-versions disclosure`;
    }

    history.setAttribute('open', '');
    const entries = [...history.querySelectorAll('li')];
    if (entries.length !== earlierVersions) {
      return `opened, it lists ${entries.length} earlier versions, expected ${earlierVersions}`;
    }

    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      return `the opened disclosure makes the page scroll sideways (${root.scrollWidth} > ${root.clientWidth})`;
    }

    const spilling = entries
      .map((entry) => entry.querySelector('pre'))
      .filter((block) => block && block.scrollWidth > block.clientWidth + 1);
    if (spilling.length > 0) {
      return `${spilling.length} earlier answers overflow their own block rather than wrapping`;
    }

    const invisible = entries.filter((entry) => {
      const box = entry.getBoundingClientRect();
      return box.width === 0 || box.height === 0;
    });
    return invisible.length > 0 ? `${invisible.length} earlier versions render with no box` : 'ok';
  }, seeded);
}
