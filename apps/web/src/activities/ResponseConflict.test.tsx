import { describe, expect, it } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/react';
import { panelOf } from '../testkit/activityFixture.js';
import {
  boxOf,
  conflict,
  fieldOf,
  inFlight,
  offline,
  renderPanel,
  saveButton,
  saved,
  stateOf,
  stored,
  stubFetch,
} from '../testkit/responseFieldHarness.js';

/**
 * Criteria C1–C6 in docs/specs/acknowledged-saves.md — the conflict path — with the keyboard and
 * announcement claims that belong to the same controls, and the cases `/code-review` and
 * test-guardian POST found after the implementation landed.
 *
 * Split from ResponseField.test.tsx when that file passed 750 lines. The seam is the one the
 * component itself has: a field that is saving its own text, and a field reconciling somebody
 * else's.
 */
describe('the conflict path', () => {
  async function intoConflict() {
    const { calls, answer } = stubFetch(conflict('because the cache was hot', 5));
    const view = renderPanel({}, [stored({ fieldName: 'explanation', text: 'old', revision: 4 })]);
    fireEvent.change(boxOf(view.container, 'explanation'), {
      target: { value: 'because the header said so' },
    });
    fireEvent.click(saveButton(view.container, 'explanation'));
    await waitFor(() => expect(stateOf(view.container, 'explanation')).toBe('conflict'));
    return { ...view, calls, answer };
  }

  it('is a state of its own, not another way of failing', async () => {
    const { container } = await intoConflict();

    expect(stateOf(container, 'explanation')).toBe('conflict');
    expect(within(fieldOf(container, 'explanation')).getByRole('alert')).toBeTruthy();
  });

  it('shows the stored text and the reader’s text at the same time, each labelled', async () => {
    const { container } = await intoConflict();

    const field = fieldOf(container, 'explanation');
    expect(field.textContent).toContain('because the cache was hot');
    expect(boxOf(container, 'explanation').value).toBe('because the header said so');
    const storedBlock = field.querySelector('.response-conflict-stored');
    expect(storedBlock?.textContent).toContain('because the cache was hot');
    expect(storedBlock?.textContent).not.toContain('because the header said so');
  });

  it('re-sends the reader’s text against the revision the conflict named, on Keep mine', async () => {
    const { container, calls, answer } = await intoConflict();
    answer(saved(6));

    fireEvent.click(
      within(fieldOf(container, 'explanation')).getByRole('button', { name: /keep mine/i }),
    );

    await waitFor(() => expect(stateOf(container, 'explanation')).toBe('saved'));
    expect(calls[1]?.body).toEqual({
      text: 'because the header said so',
      expectedRevision: 5,
    });
    expect(boxOf(container, 'explanation').value).toBe('because the header said so');
  });

  it('takes the stored text at the stored revision, without a request, on Use stored', async () => {
    const { container, calls } = await intoConflict();

    fireEvent.click(
      within(fieldOf(container, 'explanation')).getByRole('button', { name: /use stored/i }),
    );

    expect(stateOf(container, 'explanation')).toBe('saved');
    expect(boxOf(container, 'explanation').value).toBe('because the cache was hot');
    expect(calls).toHaveLength(1);
  });

  it('carries the stored revision into the next save after Use stored', async () => {
    const { container, calls, answer } = await intoConflict();
    fireEvent.click(
      within(fieldOf(container, 'explanation')).getByRole('button', { name: /use stored/i }),
    );
    answer(saved(6));

    fireEvent.change(boxOf(container, 'explanation'), { target: { value: 'my own words now' } });
    fireEvent.click(saveButton(container, 'explanation'));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls[1]?.body).toEqual({ text: 'my own words now', expectedRevision: 5 });
  });

  it('conflicts again rather than overwriting when a third save landed during Keep mine', async () => {
    const { container, answer } = await intoConflict();
    answer(conflict('a third tab won', 6));

    fireEvent.click(
      within(fieldOf(container, 'explanation')).getByRole('button', { name: /keep mine/i }),
    );

    await waitFor(() =>
      expect(fieldOf(container, 'explanation').textContent).toContain('a third tab won'),
    );
    expect(stateOf(container, 'explanation')).toBe('conflict');
    expect(boxOf(container, 'explanation').value).toBe('because the header said so');
  });

  it('never discards either text on its own', async () => {
    const { container } = await intoConflict();

    const field = fieldOf(container, 'explanation');
    expect(field.textContent).toContain('because the cache was hot');
    expect(boxOf(container, 'explanation').value).toBe('because the header said so');
    expect(within(field).getByRole('button', { name: /keep mine/i })).toBeTruthy();
    expect(within(field).getByRole('button', { name: /use stored/i })).toBeTruthy();
  });

  it('does not block the other fields of the same activity', async () => {
    const { container, answer } = await intoConflict();
    answer(saved(1));

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'unrelated' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    expect(stateOf(container, 'explanation')).toBe('conflict');
  });

  it('reports a conflict on a field that had nothing stored, where the box was believed empty', async () => {
    stubFetch(conflict('somebody else got here first', 1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('conflict'));
    expect(fieldOf(container, 'prediction').textContent).toContain('somebody else got here first');
  });
});

describe('keyboard and announcement', () => {
  it('reaches every box and every Save by tabbing, with nothing removed from the tab order', () => {
    const { container } = renderPanel();

    const focusable = [...panelOf(container, 'ACT-A').querySelectorAll('textarea, button')];
    expect(focusable).toHaveLength(8);
    for (const element of focusable) {
      expect(element.getAttribute('tabindex')).not.toBe('-1');
      expect((element as HTMLButtonElement).disabled).toBeFalsy();
    }
  });

  it('announces a save politely and a conflict as an alert', async () => {
    stubFetch(conflict('elsewhere', 2));
    const { container } = renderPanel();
    expect(within(fieldOf(container, 'prediction')).getByRole('status')).toBeTruthy();

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() =>
      expect(within(fieldOf(container, 'prediction')).getByRole('alert')).toBeTruthy(),
    );
  });

  it('saves from the keyboard alone, because the control is a real button', async () => {
    stubFetch(saved(1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'typed and tabbed to' } });
    const button = saveButton(container, 'prediction') as HTMLButtonElement;

    // A `div` with a click handler takes neither Enter nor Space, and no test that fires `click`
    // would notice. The element's own type is what makes the keyboard work.
    expect(button.tagName).toBe('BUTTON');
    expect(button.type).toBe('button');
    button.focus();
    fireEvent.click(button);

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
  });

  it('keeps the save control in the document while a save is in flight, so focus is not dropped', () => {
    stubFetch(inFlight());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });
    const button = saveButton(container, 'prediction');
    button.focus();

    fireEvent.click(button);

    // Removing the button during saving would send a keyboard reader's focus back to `body`, at the
    // top of a page they did not ask to leave.
    expect(button.isConnected).toBe(true);
    expect(document.activeElement).toBe(button);
  });
});

/**
 * The cases `/code-review` found after the implementation landed. Each is a way the page could tell
 * the reader something the server had not done, and none of them had a test.
 */
describe('the review findings', () => {
  const conflictWithNothingStored = () => async () =>
    new Response(
      JSON.stringify({
        error: 'revision_conflict',
        message: 'This field was saved somewhere else since you opened it.',
        // S6: a write naming a revision for a field that has never been written is refused, and
        // the server has nothing to hand back.
        stored: null,
      }),
      { status: 409, headers: { 'content-type': 'application/json' } },
    );

  async function intoConflictOn(fieldName: string) {
    stubFetch(conflict('the other tab wrote this', 5));
    const view = renderPanel({}, [stored({ fieldName, text: 'old', revision: 4 })]);
    fireEvent.change(boxOf(view.container, fieldName), { target: { value: 'mine' } });
    fireEvent.click(saveButton(view.container, fieldName));
    await waitFor(() => expect(stateOf(view.container, fieldName)).toBe('conflict'));
    return view;
  }

  it('never claims a save when the conflict says nothing is stored', async () => {
    stubFetch(conflictWithNothingStored());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('conflict'));

    fireEvent.click(
      within(fieldOf(container, 'prediction')).getByRole('button', { name: /use stored/i }),
    );

    // There is nothing to take, so taking it cannot leave the field looking saved.
    expect(stateOf(container, 'prediction')).not.toBe('saved');
    expect(within(fieldOf(container, 'prediction')).getByRole('status').textContent).not.toMatch(
      /\bsaved at\b/i,
    );
  });

  it('says so when the conflict reports nothing stored, rather than an empty box of text', async () => {
    stubFetch(conflictWithNothingStored());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('conflict'));
    expect(fieldOf(container, 'prediction').textContent).toMatch(/nothing is stored/i);
  });

  it('shows a save that fails while a conflict is open, instead of leaving the page unchanged', async () => {
    const { calls, answer } = stubFetch(conflict('what the other tab wrote', 5));
    const { container } = renderPanel({}, [stored({ text: 'old', revision: 4 })]);
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('conflict'));

    answer(offline());
    fireEvent.click(
      within(fieldOf(container, 'prediction')).getByRole('button', { name: /keep mine/i }),
    );

    await waitFor(() => expect(calls).toHaveLength(2));
    // The request left and came back with nothing. A page that looks identical afterwards tells
    // the reader their click did nothing at all.
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(fieldOf(container, 'prediction').textContent).toContain('Failed to fetch');
    // And the other tab's text is still there to choose from.
    expect(fieldOf(container, 'prediction').textContent).toContain('what the other tab wrote');
  });

  it('encodes the activity and the field into the address, because both are content', async () => {
    const { calls } = stubFetch(saved(1));
    const { container } = renderPanel({
      activityId: 'ACT M020/01',
      responseFields: ['prediction'],
    });
    const field = container.querySelector(
      '.activity-panel[data-activity-id="ACT M020/01"] .response-field',
    ) as HTMLElement;
    fireEvent.change(within(field).getByRole('textbox'), { target: { value: 'work' } });
    fireEvent.click(within(field).getByRole('button', { name: /^save/i }));

    await waitFor(() => expect(calls).toHaveLength(1));
    expect(calls[0]?.url).toBe('/api/courses/FSSE/activities/ACT%20M020%2F01/responses/prediction');
  });

  it('says the importer own words when the release stands refused, not the status code', async () => {
    // A9 has the server answer a refused release at HTTP 200 with its own failure inside, the same
    // shape every other endpoint uses. Reading only `message` finds nothing there.
    stubFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            state: 'failed',
            failure: {
              code: 'hash_mismatch',
              message: 'lessons/lesson-01.md does not match the hash the manifest declares.',
              file: 'lessons/lesson-01.md',
            },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'work' } });

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(fieldOf(container, 'prediction').textContent).toContain(
      'does not match the hash the manifest declares',
    );
    expect(fieldOf(container, 'prediction').textContent).not.toContain('status 200');
  });

  it('names the activity as well as the field on every control and announcement', () => {
    // Three activities per lesson means three "Save prediction" buttons and three regions opening
    // with the same words. Naming the field alone takes the count from twelve to three.
    const { container } = renderPanel();

    expect(saveButton(container, 'prediction').getAttribute('aria-label')).toContain('ACT-A');
    expect(within(fieldOf(container, 'prediction')).getByRole('status').textContent).toContain(
      'ACT-A',
    );
  });

  it('marks the save control busy while a save is in flight, not merely relabelled', () => {
    stubFetch(inFlight());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine' } });

    fireEvent.click(saveButton(container, 'prediction'));

    // Relabelling tells a sighted reader; `aria-disabled` tells everybody else. It stays focusable
    // on purpose: removing it from the tab order mid-save drops the focus of whoever pressed it.
    expect(saveButton(container, 'prediction').getAttribute('aria-disabled')).toBe('true');
  });

  it('names which field each conflict control belongs to', async () => {
    const { container } = await intoConflictOn('explanation');

    const panel = fieldOf(container, 'explanation');
    for (const name of [/keep mine/i, /use stored/i]) {
      expect(within(panel).getByRole('button', { name }).getAttribute('aria-label')).toContain(
        'explanation',
      );
    }
  });

  it('shows a save time that cannot be mistaken for today when it is not today', () => {
    const { container } = renderPanel({}, [
      stored({ text: 'written years ago', updatedAt: '2020-01-02T09:14:00.000Z' }),
    ]);

    // "Saved at 09:14" on an old answer reads as this morning.
    const status = within(fieldOf(container, 'prediction')).getByRole('status').textContent ?? '';
    expect(status).toMatch(/2020/);
  });
});
