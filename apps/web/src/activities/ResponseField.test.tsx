import { describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import { CourseScope } from '../course.js';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { activity, lessonBody, lessonContext, panelOf } from '../testkit/activityFixture.js';
import {
  boxOf,
  fieldOf,
  inFlight,
  offline,
  refused,
  renderPanel,
  saveButton,
  saved,
  stateOf,
  stored,
  stubFetch,
} from '../testkit/responseFieldHarness.js';

/**
 * Criteria F1–F11 in docs/specs/acknowledged-saves.md: the writing surfaces and the states.
 *
 * Every claim here is about what the reader is told, because the whole point of the slice is that
 * the app never tells them something the server has not done. The sharpest tests are the negative
 * ones: a field must leave the saved state the instant the text stops matching what was
 * acknowledged, and it must never re-enter it on a refusal. Both of those pass trivially if the
 * state is derived from "did I press Save" rather than from the server's answer, so both are
 * written as a sequence that separates the two.
 */
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
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-A',
              sourceHeading: 'Practice A: explain a supplied exchange',
            }),
            activity({ activityId: 'ACT-B', sourceHeading: 'Practice B: repair an explanation' }),
          ]}
        />
      </CourseScope>,
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
      <CourseScope courseId="FSSE">
        <LessonMarkdown
          markdown={lessonBody}
          lessonContext={lessonContext}
          activities={[
            activity({
              activityId: 'ACT-NONE',
              responseFields: [],
              sourceHeading: 'Practice A: explain a supplied exchange',
            }),
            activity({ activityId: 'ACT-SOME', sourceHeading: 'Practice B: repair an explanation' }),
          ]}
        />
      </CourseScope>,
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

    expect(calls[0]?.url).toBe('/api/courses/FSSE/activities/ACT-A/responses/prediction');
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
