import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { activity, lessonBody, panelOf } from '../testkit/activityFixture.js';
import type { StoredResponse } from '../releaseTypes.js';

/**
 * Criteria F1–F11 and C1–C6 in docs/specs/acknowledged-saves.md.
 *
 * Every claim here is about what the reader is told, because the whole point of the slice is that
 * the app never tells them something the server has not done. The sharpest tests are the negative
 * ones: a field must leave the saved state the instant the text stops matching what was
 * acknowledged, and it must never re-enter it on a refusal. Both of those pass trivially if the
 * state is derived from "did I press Save" rather than from the server's answer, so both are
 * written as a sequence that separates the two.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

type Answer = () => Promise<Response>;

/**
 * A fetch that answers exactly what the test queued, one answer per call, in order — and throws
 * if the page asks for anything it was not told to expect. That strictness is the point: a field
 * that quietly re-sends, or that sends on a keystroke, shows up here as a failure rather than as a
 * passing test with a surprise request in it.
 */
function stubFetch(...initial: readonly Answer[]) {
  const calls: { url: string; body: unknown }[] = [];
  const queue: Answer[] = [...initial];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, body: init?.body ? JSON.parse(init.body as string) : undefined });
      const next = queue.shift();
      if (!next) throw new Error(`nothing queued to answer ${url}`);
      return next();
    }),
  );
  return {
    calls,
    answer: (...more: readonly Answer[]) => queue.push(...more),
  };
}

const saved =
  (revision: number, updatedAt = '2026-09-22T14:02:00.000Z') =>
  async () =>
    new Response(JSON.stringify({ state: 'saved', revision, updatedAt }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

const conflict = (text: string, revision: number) => async () =>
  new Response(
    JSON.stringify({
      error: 'revision_conflict',
      message: 'This field was saved somewhere else since you opened it.',
      stored: { text, revision, updatedAt: '2026-09-22T14:05:00.000Z' },
    }),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );

const refused =
  (error: string, message: string, status = 400) =>
  async () =>
    new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'content-type': 'application/json' },
    });

const offline = () => async () => {
  throw new TypeError('Failed to fetch');
};

/** Never settles, so a test can look at the page while the request is still in flight. */
const inFlight = () => () => new Promise<Response>(() => {});

function renderPanel(
  over: Parameters<typeof activity>[0] = {},
  responses: readonly StoredResponse[] = [],
) {
  return render(
    <LessonMarkdown
      markdown={lessonBody}
      activities={[activity({ activityId: 'ACT-A', ...over })]}
      responses={responses}
    />,
  );
}

function fieldOf(container: HTMLElement, fieldName: string): HTMLElement {
  const field = panelOf(container, 'ACT-A').querySelector(
    `.response-field[data-field-name="${fieldName}"]`,
  );
  if (!field) throw new Error(`no ${fieldName} field on the panel`);
  return field as HTMLElement;
}

function boxOf(container: HTMLElement, fieldName: string): HTMLTextAreaElement {
  return within(fieldOf(container, fieldName)).getByRole('textbox') as HTMLTextAreaElement;
}

function stateOf(container: HTMLElement, fieldName: string): string {
  return fieldOf(container, fieldName).getAttribute('data-state') ?? '';
}

function saveButton(container: HTMLElement, fieldName: string): HTMLElement {
  return within(fieldOf(container, fieldName)).getByRole('button', { name: /^save/i });
}

function stored(over: Partial<StoredResponse> = {}): StoredResponse {
  return {
    activityId: 'ACT-A',
    fieldName: 'prediction',
    text: 'what was acknowledged',
    revision: 3,
    updatedAt: '2026-09-22T09:00:00.000Z',
    ...over,
  };
}

describe('the writing surfaces on a panel', () => {
  it('gives one labelled box to each field the author declared, in the author’s order', () => {
    const { container } = renderPanel();

    const fields = [...panelOf(container, 'ACT-A').querySelectorAll('.response-field')];
    expect(fields.map((field) => field.getAttribute('data-field-name'))).toEqual([
      'prediction',
      'observation',
      'explanation',
      'help_used',
    ]);
    for (const field of fields) {
      expect(within(field as HTMLElement).getByRole('textbox')).toBeTruthy();
    }
  });

  it('binds each label to its own box, so clicking the words focuses the right one', () => {
    const { container } = renderPanel();

    for (const name of ['prediction', 'observation', 'explanation', 'help_used']) {
      const field = fieldOf(container, name);
      const label = field.querySelector('label') as HTMLLabelElement;
      const box = within(field).getByRole('textbox');
      expect(label.getAttribute('for')).toBe(box.id);
      expect(box.id).toContain('ACT-A');
      expect(label.textContent?.trim()).not.toBe('');
    }
  });

  it('gives every box on the page a different id', () => {
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({
            activityId: 'ACT-A',
            sourceHeading: 'Practice A: explain a supplied exchange',
          }),
          activity({ activityId: 'ACT-B', sourceHeading: 'Practice B: repair an explanation' }),
        ]}
      />,
    );

    const ids = [...container.querySelectorAll('textarea')].map((box) => box.id);
    expect(ids).toHaveLength(8);
    expect(new Set(ids).size).toBe(8);
  });

  it('names an unrecognised field by the author’s own token rather than guessing at it', () => {
    const { container } = renderPanel({ responseFields: ['sketch'] });

    expect(fieldOf(container, 'sketch').textContent).toContain('sketch');
  });

  it('writes nothing for an activity that declares no fields, while its neighbour still does', () => {
    // The companion activity is the whole point of this test. Asserting "zero boxes when zero
    // fields are declared" on its own passes just as well against an app that renders no boxes at
    // all — which is what the PRE audit caught it doing.
    const { container } = render(
      <LessonMarkdown
        markdown={lessonBody}
        activities={[
          activity({
            activityId: 'ACT-NONE',
            responseFields: [],
            sourceHeading: 'Practice A: explain a supplied exchange',
          }),
          activity({ activityId: 'ACT-SOME', sourceHeading: 'Practice B: repair an explanation' }),
        ]}
      />,
    );

    expect(panelOf(container, 'ACT-NONE').querySelectorAll('.response-field')).toHaveLength(0);
    expect(panelOf(container, 'ACT-NONE').querySelectorAll('textarea')).toHaveLength(0);
    expect(panelOf(container, 'ACT-NONE').textContent).not.toMatch(/\bsaved\b/i);
    expect(panelOf(container, 'ACT-SOME').querySelectorAll('textarea')).toHaveLength(4);
  });

  it('no longer claims the app cannot store an answer', () => {
    const { container } = renderPanel();

    const text = panelOf(container, 'ACT-A').textContent ?? '';
    expect(text).not.toContain('cannot store');
    expect(text).not.toContain('asks for');
  });
});

describe('what a box starts with', () => {
  it('renders stored text already in the box on first paint', () => {
    const { container } = renderPanel({}, [stored({ text: 'saved earlier today' })]);

    expect(boxOf(container, 'prediction').value).toBe('saved earlier today');
    expect(stateOf(container, 'prediction')).toBe('saved');
  });

  it('starts a field with nothing stored empty and unsaved, without sending anything', () => {
    const { calls } = stubFetch(saved(1));
    const { container } = renderPanel();

    expect(boxOf(container, 'prediction').value).toBe('');
    expect(stateOf(container, 'prediction')).toBe('unsaved');
    expect(calls).toHaveLength(0);
  });

  it('fills only the field the stored record names', () => {
    const { container } = renderPanel({}, [
      stored({ fieldName: 'observation', text: 'I saw 404' }),
    ]);

    expect(boxOf(container, 'observation').value).toBe('I saw 404');
    expect(boxOf(container, 'prediction').value).toBe('');
  });

  it('ignores a stored record belonging to another activity', () => {
    const { container } = renderPanel({}, [stored({ activityId: 'ACT-OTHER', text: 'not mine' })]);

    expect(boxOf(container, 'prediction').value).toBe('');
  });
});

describe('the four states', () => {
  it('leaves the saved state on the first character typed, and sends nothing', () => {
    const { calls } = stubFetch(saved(4));
    const { container } = renderPanel({}, [stored({ text: 'acknowledged' })]);
    expect(stateOf(container, 'prediction')).toBe('saved');

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'acknowledged!' } });

    expect(stateOf(container, 'prediction')).toBe('unsaved');
    expect(calls).toHaveLength(0);
  });

  it('returns to saved if the reader types the acknowledged text back, character for character', () => {
    const { container } = renderPanel({}, [stored({ text: 'acknowledged' })]);
    const box = boxOf(container, 'prediction');

    fireEvent.change(box, { target: { value: 'acknowledged!' } });
    fireEvent.change(box, { target: { value: 'acknowledged' } });

    expect(stateOf(container, 'prediction')).toBe('saved');
  });

  it('shows saving while the request is in flight, and refuses a second press', () => {
    const { calls } = stubFetch(inFlight());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'my answer' } });

    fireEvent.click(saveButton(container, 'prediction'));

    expect(stateOf(container, 'prediction')).toBe('saving');
    fireEvent.click(saveButton(container, 'prediction'));
    expect(calls).toHaveLength(1);
  });

  it('sends the text and the revision it believes it is editing', async () => {
    const { calls } = stubFetch(saved(4));
    const { container } = renderPanel({}, [stored({ text: 'acknowledged', revision: 3 })]);
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'a better answer' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    expect(calls[0]?.url).toBe('/api/activities/ACT-A/responses/prediction');
    expect(calls[0]?.body).toEqual({ text: 'a better answer', expectedRevision: 3 });
  });

  it('sends expectedRevision 0 when it believes nothing is stored', async () => {
    const { calls } = stubFetch(saved(1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'first answer' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    expect(calls[0]?.body).toEqual({ text: 'first answer', expectedRevision: 0 });
  });

  it('carries the revision the server handed back into the next save', async () => {
    const { calls } = stubFetch(saved(1), saved(2));
    const { container } = renderPanel();

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'first' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'second' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls[1]?.body).toEqual({ text: 'second', expectedRevision: 1 });
  });

  it('says saved only after the server said so', async () => {
    stubFetch(saved(1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'my answer' } });

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    expect(within(fieldOf(container, 'prediction')).getByRole('status').textContent).toMatch(
      /\bsaved\b/i,
    );
  });

  it.each([
    ['the app not answering at all', offline()],
    ['a refusal the server named', refused('response_too_long', 'That is longer than 100,000.')],
    [
      'an activity the release does not carry',
      refused('activity_not_found', 'No such activity.', 404),
    ],
  ])('moves to failed on %s and keeps the reader’s text in the box', async (_name, answer) => {
    stubFetch(answer);
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'work worth keeping' } });

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(boxOf(container, 'prediction').value).toBe('work worth keeping');
  });

  it('never says the work was saved while the save has failed', async () => {
    // The claim the retired forbidden-word list used to carry, aimed at the one state where the
    // word would be a lie. The old test banned "saved" from the panel outright; this slice makes
    // the word legitimate, so the ban moves to the state that must never use it.
    stubFetch(refused('response_too_long', 'That is longer than the 100,000 allowed.'));
    const { container } = renderPanel({}, [stored({ text: 'acknowledged earlier' })]);
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'far too much' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));

    const status = within(fieldOf(container, 'prediction')).getByRole('status');
    expect(status.textContent).not.toMatch(/\bsaved\b/i);
    expect(status.textContent).not.toMatch(/\bstored\b/i);
    expect(status.textContent).not.toMatch(/\bkept\b/i);
    // And the acknowledgement from before the failure is not left standing beside it either.
    expect(fieldOf(container, 'prediction').textContent).not.toMatch(/\bsaved\b/i);
  });

  it('says why it failed in the server’s own words', async () => {
    stubFetch(refused('response_too_long', 'That is longer than the 100,000 allowed.'));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'too much' } });

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(fieldOf(container, 'prediction').textContent).toContain(
      'That is longer than the 100,000 allowed.',
    );
  });

  it('offers the save again after a failure, and a retry that lands says saved', async () => {
    stubFetch(offline(), saved(1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'work' } });
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));

    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
  });

  it('leaves the revision untouched when a save is refused, so the retry is still a compare-and-set', async () => {
    const { calls } = stubFetch(offline(), saved(4));
    const { container } = renderPanel({}, [stored({ text: 'acknowledged', revision: 3 })]);
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'new work' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(calls).toHaveLength(2));

    expect(calls[1]?.body).toEqual({ text: 'new work', expectedRevision: 3 });
  });

  it('names the field in what it announces, so twelve boxes are not twelve bare "Saved"s', () => {
    const { container } = renderPanel({}, [stored({ text: 'acknowledged' })]);

    const status = within(fieldOf(container, 'prediction')).getByRole('status');
    expect(status.textContent).toContain('prediction');
  });

  it('leaves every other field alone when one is saved', async () => {
    stubFetch(saved(1));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'one' } });
    fireEvent.change(boxOf(container, 'observation'), { target: { value: 'two' } });

    fireEvent.click(saveButton(container, 'prediction'));
    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));

    expect(stateOf(container, 'observation')).toBe('unsaved');
    expect(boxOf(container, 'observation').value).toBe('two');
  });
});

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
