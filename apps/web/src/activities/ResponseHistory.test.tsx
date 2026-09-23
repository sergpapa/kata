import { describe, expect, it } from 'vitest';
import { fireEvent, waitFor, within } from '@testing-library/react';
import {
  boxOf,
  earlier,
  fieldOf,
  historyOf,
  renderPanel,
  saveButton,
  saved,
  savedWithHistory,
  stateOf,
  stored,
  stubFetch,
} from '../testkit/responseFieldHarness.js';
import { hasUnsaved } from '../unsavedGuard.js';

/**
 * Criteria P15–P23 in docs/specs/prediction-history.md (ADR 0012).
 *
 * Two shapes of claim here, and the second is the one that catches real defects. The first is what
 * a field shows for a history the server described. The second is what it shows *after* a save,
 * because that is where a page is tempted to assemble a list of its own — and a list the page
 * invented is exactly as wrong as a save it invented, for the same reason.
 */

const twoEarlier = [
  earlier({ revision: 2, text: 'It answered 200.', writtenAt: '2020-01-02T14:02:00.000Z' }),
  earlier({ revision: 1, text: 'I think it 404s.', writtenAt: '2020-01-02T09:14:00.000Z' }),
];

describe('a field with nothing superseded', () => {
  it('shows no disclosure at all when the server sends an empty list', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: [] })]);

    expect(historyOf(container, 'prediction')).toBeNull();
    expect(fieldOf(container, 'prediction').textContent).not.toMatch(/earlier version/i);
  });

  it('shows no disclosure for a field with nothing stored at all', () => {
    const { container } = renderPanel();

    expect(historyOf(container, 'prediction')).toBeNull();
  });

  it('shows one on a field that does have earlier versions, so the absence above means something', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    expect(historyOf(container, 'prediction')).not.toBeNull();
    expect(historyOf(container, 'observation')).toBeNull();
  });
});

describe('the earlier-versions disclosure', () => {
  it('is a closed disclosure counting what it holds', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    expect(history.hasAttribute('open')).toBe(false);
    expect(history.querySelector('summary')?.textContent).toMatch(/earlier versions\s*\(2\)/i);
  });

  it('is a real disclosure rather than something with a click handler', () => {
    // `details`/`summary` is what makes this operable by keyboard and by a screen reader without
    // this app writing a single key handler. A div that opens on click passes every text
    // assertion in this file and none of that.
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    expect(history.tagName).toBe('DETAILS');
    expect(history.querySelector(':scope > summary')).not.toBeNull();
  });

  it('names its own field and activity, so twelve of them are not twelve identical summaries', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const summary = historyOf(container, 'prediction')?.querySelector('summary');
    expect(summary?.textContent).toContain('prediction');
    expect(summary?.textContent).toContain('ACT-A');
  });

  it('lists every earlier version newest first, with the text exactly as it was written', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const texts = [...(historyOf(container, 'prediction')?.querySelectorAll('pre') ?? [])].map(
      (block) => block.textContent,
    );
    expect(texts).toEqual(['It answered 200.', 'I think it 404s.']);
  });

  it('keeps whitespace and newlines character for character', () => {
    const exact = '  line one\n\n\tline two with a trailing space \n';
    const { container } = renderPanel({}, [
      stored({ earlierVersions: [earlier({ text: exact })] }),
    ]);

    expect(historyOf(container, 'prediction')?.querySelector('pre')?.textContent).toBe(exact);
  });

  it('shows Markdown and HTML an owner typed as the characters they typed', () => {
    const { container } = renderPanel({}, [
      stored({
        earlierVersions: [
          earlier({ text: '# not a heading\n<b>not bold</b>\n<script>x</script>' }),
        ],
      }),
    ]);

    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    expect(history.querySelector('pre')?.textContent).toContain('<b>not bold</b>');
    expect(history.querySelector('h1')).toBeNull();
    expect(history.querySelector('b')).toBeNull();
    expect(history.querySelector('script')).toBeNull();
  });

  it('says when each version was saved, in a way that cannot be mistaken for today', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const entries = [...(historyOf(container, 'prediction')?.querySelectorAll('li') ?? [])];
    expect(entries).toHaveLength(2);
    for (const entry of entries) {
      const when = entry.textContent ?? '';
      expect(when).toMatch(/2020/);
      expect(when).toMatch(/\d{1,2}:\d{2}/);
      // And in words, not in the wire format. test-guardian PRE found that the two assertions
      // above are both satisfied by `2020-01-02T14:02:00.000Z` printed raw — it contains "2020"
      // and it contains "14:02" — so an entry that never reached a formatter at all would have
      // passed a test named for the wording it uses.
      expect(when).not.toContain('2020-01-02T');
      expect(when).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(when).not.toMatch(/\dT\d/);
    }
  });

  it('gives an answer saved today a time and no date, as the saved state does', () => {
    // The other half of P17, which had no fixture at all: `savedWhen` prints "at 14:02" for today
    // and names the day for anything else, and the disclosure has to use the same wording rather
    // than a second formatter of its own that happens to look right on old rows.
    const { container } = renderPanel({}, [
      stored({ earlierVersions: [earlier({ writtenAt: new Date().toISOString() })] }),
    ]);

    const when = historyOf(container, 'prediction')?.querySelector('li')?.textContent ?? '';
    expect(when).toMatch(/\bat \d{1,2}:\d{2}/);
    expect(when).not.toContain(String(new Date().getFullYear()));
  });

  it('names the content version each earlier answer was written against', () => {
    const { container } = renderPanel({}, [
      stored({
        earlierVersions: [
          earlier({ revision: 2, contentVersion: '1.0.1-draft' }),
          earlier({ revision: 1, contentVersion: '1.0.0-draft' }),
        ],
      }),
    ]);

    const entries = [...(historyOf(container, 'prediction')?.querySelectorAll('li') ?? [])];
    expect(entries[0]?.textContent).toContain('1.0.1-draft');
    expect(entries[1]?.textContent).toContain('1.0.0-draft');
  });

  it('offers nothing that would edit, restore or remove an earlier version', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);

    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    expect(within(history).queryAllByRole('button')).toEqual([]);
    expect(within(history).queryAllByRole('textbox')).toEqual([]);
    expect(history.querySelectorAll('[contenteditable]')).toHaveLength(0);
  });

  it('is not an edit: opening it leaves the field saved and the page free to leave', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);
    expect(stateOf(container, 'prediction')).toBe('saved');

    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    fireEvent.click(history.querySelector('summary') as HTMLElement);

    expect(stateOf(container, 'prediction')).toBe('saved');
    expect(hasUnsaved()).toBe(false);
  });
});

describe('the list after a save', () => {
  it('grows by the text that was in the box, without a reload', async () => {
    const { container } = renderPanel({}, [
      stored({ text: 'It answered 200.', revision: 2, earlierVersions: [twoEarlier[1]!] }),
    ]);
    stubFetch(
      savedWithHistory(3, [
        earlier({ revision: 2, text: 'It answered 200.' }),
        earlier({ revision: 1, text: 'I think it 404s.' }),
      ]),
    );

    fireEvent.change(boxOf(container, 'prediction'), {
      target: { value: 'It answered 200 because the path existed.' },
    });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    const history = historyOf(container, 'prediction') as HTMLDetailsElement;
    expect(history.querySelector('summary')?.textContent).toMatch(/\(2\)/);
    expect([...history.querySelectorAll('pre')].map((one) => one.textContent)).toEqual([
      'It answered 200.',
      'I think it 404s.',
    ]);
  });

  it('appears on a field that had none, the first time a save supersedes something', async () => {
    const { container } = renderPanel({}, [
      stored({ text: 'first answer', revision: 1, earlierVersions: [] }),
    ]);
    expect(historyOf(container, 'prediction')).toBeNull();
    stubFetch(savedWithHistory(2, [earlier({ revision: 1, text: 'first answer' })]));

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'second answer' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(historyOf(container, 'prediction')).not.toBeNull());
    expect(historyOf(container, 'prediction')?.querySelector('pre')?.textContent).toBe(
      'first answer',
    );
  });

  it('shows the server’s list, not one assembled from what the page sent', async () => {
    // The page sent one text and the server reports a history it knows nothing about — a second
    // tab's work, which is the case that exists. A field that pushed its own previous text onto a
    // local list would show one entry here and hide the other two.
    const { container } = renderPanel({}, [
      stored({ text: 'mine', revision: 5, earlierVersions: [] }),
    ]);
    stubFetch(
      savedWithHistory(6, [
        earlier({ revision: 5, text: 'mine' }),
        earlier({ revision: 4, text: 'from the other tab' }),
        earlier({ revision: 3, text: 'and before that' }),
      ]),
    );

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine, corrected' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(historyOf(container, 'prediction')).not.toBeNull());
    expect(
      [...(historyOf(container, 'prediction')?.querySelectorAll('pre') ?? [])].map(
        (one) => one.textContent,
      ),
    ).toEqual(['mine', 'from the other tab', 'and before that']);
  });

  it('leaves the list alone when the save repeated the stored text', async () => {
    const { container } = renderPanel({}, [
      stored({ text: 'unchanged', revision: 2, earlierVersions: [twoEarlier[1]!] }),
    ]);
    stubFetch(savedWithHistory(3, [twoEarlier[1]!]));

    // Pressing Save with the text untouched: accepted by the server, and nothing about the work
    // changed, so nothing joins the list (ADR 0012).
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    expect(historyOf(container, 'prediction')?.querySelector('summary')?.textContent).toMatch(
      /\(1\)/,
    );
  });

  it('takes the server’s list from a refusal too, where its own is provably stale', async () => {
    const { container } = renderPanel({}, [
      stored({ text: 'mine', revision: 2, earlierVersions: [] }),
    ]);
    stubFetch(async () => {
      return new Response(
        JSON.stringify({
          error: 'revision_conflict',
          message: 'This field was saved somewhere else since you opened it.',
          stored: { text: 'the other tab’s', revision: 4, updatedAt: '2026-09-22T14:05:00.000Z' },
          earlierVersions: [
            earlier({ revision: 3, text: 'the other tab’s first go' }),
            earlier({ revision: 2, text: 'mine' }),
          ],
        }),
        { status: 409, headers: { 'content-type': 'application/json' } },
      );
    });

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'mine, corrected' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('conflict'));
    expect(
      [...(historyOf(container, 'prediction')?.querySelectorAll('pre') ?? [])].map(
        (one) => one.textContent,
      ),
    ).toEqual(['the other tab’s first go', 'mine']);
  });

  it('keeps the list it has when an answer says nothing about history', async () => {
    // An answer with no `earlierVersions` key is not an answer of "none". Clearing the list there
    // would hide revisions that exist, which is the same class of lie as inventing one.
    const { container } = renderPanel({}, [
      stored({ text: 'current', revision: 2, earlierVersions: twoEarlier }),
    ]);
    stubFetch(saved(3));

    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'newer' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    expect(historyOf(container, 'prediction')?.querySelector('summary')?.textContent).toMatch(
      /\(2\)/,
    );
  });
});
