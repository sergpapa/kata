import Database from 'better-sqlite3';

/**
 * The earlier-conversations half of the screenshot gate — the widths in criterion EC9 of
 * docs/specs/earlier-conversations.md.
 *
 * jsdom lays nothing out, so "an opened earlier conversation does not push a 375px page sideways"
 * passes there whatever the CSS says. It needs a real engine and a conversation to open.
 *
 * Seeded straight into the store, not through the feedback route: that route starts the owner's
 * own Claude Code, and the gate must never spend their plan. What is under test here is how the
 * page lays out a stored conversation, so the store is the honest place to put one.
 */

/** A reply long enough to wrap, with Markdown and one unbroken token, the likeliest overflow. */
const REPLY = [
  'You named the status code, which is the right instinct. **What would you check first** if the',
  'page answered 200 but showed nothing? Look at the response body before the headers.',
  '',
  '- The request line: `GET /api/menu/items?category=breakfast&include=allergens HTTP/1.1`',
  '- A link that cannot break: https://example.test/a/very/long/path/that/keeps/going/without/any/space/at/all',
].join('\n');

/**
 * Writes one conversation with a reply on `activityId`, already started over, into the gate's
 * store, and answers what the page should then show.
 */
export function seedEarlierConversation(
  databaseFile,
  { activityId, lessonId, contentVersion, releaseId },
) {
  const db = new Database(databaseFile);
  try {
    db.pragma('busy_timeout = 5000');
    const stamp = [lessonId, contentVersion, releaseId];
    db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO feedback_conversation (activity_id, claude_session_id, started_at, cleared_at)
           VALUES (?, ?, ?, ?)`,
        )
        .run(
          activityId,
          'screenshot-gate-session',
          '2026-11-19T09:00:00.000Z',
          '2026-11-19T09:20:00.000Z',
        );
      const turn = db.prepare(
        `INSERT INTO feedback_turn (conversation_id, turn_number, role, text, sent_fields_json, model,
           outcome, failure, candidate_lesson_id, content_version, release_id, written_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
      );
      turn.run(
        lastInsertRowid,
        1,
        'learner',
        '',
        JSON.stringify([{ fieldName: 'prediction', text: 'I think the server answers 404.' }]),
        null,
        null,
        ...stamp,
        '2026-11-19T09:00:00.000Z',
      );
      turn.run(
        lastInsertRowid,
        2,
        'claude',
        REPLY,
        null,
        'claude-sonnet-5-5',
        'complete',
        ...stamp,
        '2026-11-19T09:00:20.000Z',
      );
    })();
  } finally {
    db.close();
  }
  return { activityId, mustSee: 'What would you check first' };
}

/**
 * Opens the seeded activity's earlier conversations and checks the page did not grow sideways.
 * Answers 'ok' or what went wrong, in words the gate's failure list can carry.
 */
export async function checkEarlierConversations(page, seeded) {
  const details = page.locator(
    `.activity-panel[data-activity-id="${seeded.activityId}"] details.feedback-earlier`,
  );
  if ((await details.count()) !== 1)
    return 'the seeded activity shows no Earlier conversations disclosure';
  await details.locator(':scope > summary').click();
  if (!(await details.evaluate((element) => element.open))) return 'its summary did not open it';
  if (!(await details.innerText()).includes(seeded.mustSee))
    return 'it opened without the seeded reply';
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  return sideways > 0 ? `opening it pushed the page ${sideways}px sideways` : 'ok';
}
