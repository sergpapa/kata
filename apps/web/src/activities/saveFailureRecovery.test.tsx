import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import {
  boxOf,
  buttonWords,
  copyButton,
  downloadButton,
  earlier,
  fieldOf,
  historyOf,
  inFlight,
  lessonContext,
  offline,
  refused,
  renderPanel,
  saveButton,
  saved,
  stateOf,
  stored,
  stubClipboard,
  stubDownloads,
  stubFetch,
  stubNoClipboard,
  stubDeferredClipboard,
  conflict as conflictAnswer,
} from '../testkit/responseFieldHarness.js';
import { activity, lessonBody } from '../testkit/activityFixture.js';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';

/**
 * Criteria F1–F7, C1, H1–H2, A2, D1 and D3 in docs/specs/save-failure-recovery.md.
 *
 * ADR 0004 promised four states "with the learner's text still present **and recoverable** in the
 * failed state". Slice 10 built *present*. This is *recoverable*, and the acceptance row it answers
 * is "Simulate a save failure | Existing acknowledged work remains intact; the learner can recover
 * or export the unsaved text".
 *
 * Two shapes of claim, and the second is where the defects live. The first is that the controls are
 * there when a save has failed. The second is that what leaves the app is **the text in the box at
 * the moment of the press** — not the text the last request carried, not the acknowledged text, and
 * not the stored text the conflict panel is showing alongside. A recovery control that hands back
 * the wrong text is worse than none, because the reader stops looking for the right one.
 */

afterEach(() => {
  // Scoped here rather than in the shared harness: `stubDownloads` spies on the anchor prototype,
  // and restoring mocks wholesale from a helper every response suite imports would reach further
  // than this file.
  vi.restoreAllMocks();
});

/** Drive a field into `failed` and leave it there. */
async function failASave(text = 'what I typed and nearly lost') {
  const fetch = stubFetch(offline());
  const view = renderPanel();
  fireEvent.change(boxOf(view.container, 'prediction'), { target: { value: text } });
  fireEvent.click(saveButton(view.container, 'prediction'));
  await waitFor(() => expect(stateOf(view.container, 'prediction')).toBe('failed'));
  return { ...view, fetch, field: fieldOf(view.container, 'prediction') };
}

describe('F1 — a refused save offers a way out, and no other state does', () => {
  it('offers Copy and Download beside Save once a save has failed', async () => {
    const { field } = await failASave();

    expect(buttonWords(field)).toEqual(['Save', 'Copy', 'Download']);
  });

  it('offers neither on a field nobody has touched', () => {
    const { container } = renderPanel();

    expect(buttonWords(fieldOf(container, 'prediction'))).toEqual(['Save']);
  });

  it('offers neither on a field with typed text that has not been refused yet', () => {
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'typed, not sent' } });

    // The recovery for this state is the Save button an inch away. Two more controls under all
    // twelve boxes is height on a page where nothing has gone wrong.
    expect(buttonWords(fieldOf(container, 'prediction'))).toEqual(['Save']);
  });

  it('offers neither while a save is in flight', () => {
    stubFetch(inFlight());
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'on its way' } });
    fireEvent.click(saveButton(container, 'prediction'));

    expect(stateOf(container, 'prediction')).toBe('saving');
    expect(buttonWords(fieldOf(container, 'prediction'))).toEqual(['Saving…']);
  });

  it('offers neither once the save that failed has been retried and accepted', async () => {
    const { container, fetch } = await failASave();
    fetch.answer(saved(1));
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('saved'));
    expect(buttonWords(fieldOf(container, 'prediction'))).toEqual(['Save']);
  });

  it('offers them on a field refused by the server, not only by a dropped connection', async () => {
    stubFetch(refused('text_too_long', 'That answer is longer than this app stores.', 400));
    const { container } = renderPanel();
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'a very long answer' } });
    fireEvent.click(saveButton(container, 'prediction'));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(buttonWords(fieldOf(container, 'prediction'))).toEqual(['Save', 'Copy', 'Download']);
  });
});

describe('F2, F7 — Copy takes exactly what is in the box', () => {
  it('writes the text character for character', async () => {
    const clipboard = stubClipboard();
    const { field } = await failASave('I think it answers 304.');

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(clipboard.written).toEqual(['I think it answers 304.']));
  });

  it('keeps leading and trailing whitespace, blank lines and runs of spaces', async () => {
    const clipboard = stubClipboard();
    const messy = '  first\n\n\n    indented   runs\ntrailing   \n';
    const { field } = await failASave(messy);

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(clipboard.written).toEqual([messy]));
  });

  it('takes the text as it is at the press, not as it was when the save was refused', async () => {
    const clipboard = stubClipboard();
    const { container, field } = await failASave('what the failed save carried');
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'what I typed after' } });

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(clipboard.written).toEqual(['what I typed after']));
  });

  it('takes this field’s text, not another field’s on the same activity', async () => {
    const clipboard = stubClipboard();
    const { container, field } = await failASave('the prediction');
    fireEvent.change(boxOf(container, 'observation'), { target: { value: 'the observation' } });

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(clipboard.written).toEqual(['the prediction']));
  });
});

describe('F3 — a copy that cannot happen says so', () => {
  it('says so when the browser gave the page no clipboard', async () => {
    stubNoClipboard();
    const { field } = await failASave();

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(copyButton(field).textContent).toMatch(/could not copy/i));
  });

  it('says so when the write is refused', async () => {
    const clipboard = stubClipboard();
    clipboard.fail = true;
    const { field } = await failASave();

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(copyButton(field).textContent).toMatch(/could not copy/i));
  });

  it('says Copied when it worked, so the two outcomes are told apart', async () => {
    stubClipboard();
    const { field } = await failASave();

    fireEvent.click(copyButton(field));

    await waitFor(() => expect(copyButton(field).textContent).toMatch(/copied/i));
  });
});

describe('F4, F5 — Download hands over the text with its provenance', () => {
  it('writes the reader’s text into the file, character for character', async () => {
    const downloads = stubDownloads();
    const { field } = await failASave('I think it answers 304.\n\n  and then nothing.\n');

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    const file = await downloads.text();
    expect(file?.endsWith('I think it answers 304.\n\n  and then nothing.\n')).toBe(true);
  });

  it('names the lesson, activity, field, version and release in the file', async () => {
    const downloads = stubDownloads();
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    const file = (await downloads.text()) ?? '';
    expect(file).toContain(lessonContext.candidateLessonId);
    expect(file).toContain(lessonContext.contentVersion);
    expect(file).toContain(lessonContext.releaseId);
    expect(file).toContain('ACT-A');
    expect(file).toContain('Your prediction');
    expect(file).toMatch(/never acknowledged/i);
  });

  it('names the file for the lesson, activity and field, as Markdown', async () => {
    const downloads = stubDownloads();
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    expect(downloads.clicked[0]?.name).toBe('unsaved-lesson-04-ACT-A-prediction.md');
  });

  it('hands the browser a Markdown blob rather than an untyped one', async () => {
    const downloads = stubDownloads();
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    expect(downloads.type()).toMatch(/^text\/markdown/);
  });

  it('takes the text as it is at the press, not as it was when the save was refused', async () => {
    const downloads = stubDownloads();
    const { container, field } = await failASave('what the failed save carried');
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'what I typed after' } });

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    expect(await downloads.text()).toContain('what I typed after');
    expect(await downloads.text()).not.toContain('what the failed save carried');
  });
});

describe('F6 — a download that cannot happen says so, and one that can leaves nothing behind', () => {
  it('says so when the browser has no way to make a file, and claims no file', async () => {
    const downloads = stubDownloads('absent');
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloadButton(field).textContent).toMatch(/could not download/i));
    // Both halves of F6. A button that says it failed while still firing the anchor hands the
    // reader an empty file and a red word, and they will believe the word over the file.
    expect(downloads.clicked).toHaveLength(0);
  });

  it('says so when making the file is refused, and claims no file', async () => {
    const downloads = stubDownloads('throws');
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloadButton(field).textContent).toMatch(/could not download/i));
    expect(downloads.clicked).toHaveLength(0);
  });

  it('revokes the object URL it made, so a lesson of failed saves leaks none', async () => {
    // Fake timers because the revoke is deliberately a long way after the press: revoking beside
    // the click races the browser still reading the blob (review finding 2), so the hand-back waits
    // out any possible read rather than guessing at one. The claim is unchanged — the URL is given
    // back — only the clock is.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const downloads = stubDownloads();
      const { field } = await failASave();

      fireEvent.click(downloadButton(field));
      await waitFor(() => expect(downloads.clicked).toHaveLength(1));
      await vi.advanceTimersByTimeAsync(120_000);

      expect(downloads.revoked).toEqual([downloads.clicked[0]?.href]);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('C1 — the conflict panel lets the reader take their own text out first', () => {
  async function conflicted() {
    const fetch = stubFetch(conflictAnswer('what another tab stored', 4));
    const view = renderPanel({}, [stored({ text: 'the original', revision: 3 })]);
    fireEvent.change(boxOf(view.container, 'prediction'), { target: { value: 'my own answer' } });
    fireEvent.click(saveButton(view.container, 'prediction'));
    await waitFor(() => expect(stateOf(view.container, 'prediction')).toBe('conflict'));
    const panel = view.container.querySelector('.response-conflict') as HTMLElement;
    return { ...view, fetch, panel };
  }

  it('offers Copy and Download alongside the two choices', async () => {
    const { panel } = await conflicted();

    expect(buttonWords(panel)).toEqual(['Copy', 'Download', 'Keep mine', 'Use stored']);
  });

  it('copies what the reader typed, not the text stored elsewhere', async () => {
    const clipboard = stubClipboard();
    const { panel } = await conflicted();

    fireEvent.click(copyButton(panel));

    // The panel is showing both texts. The one at risk is the reader's: Use stored replaces it.
    await waitFor(() => expect(clipboard.written).toEqual(['my own answer']));
  });

  it('downloads what the reader typed, not the text stored elsewhere', async () => {
    const downloads = stubDownloads();
    const { panel } = await conflicted();

    fireEvent.click(downloadButton(panel));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    expect(await downloads.text()).toContain('my own answer');
    expect(await downloads.text()).not.toContain('what another tab stored');
  });

  it('copies the box as it is at the press, not as it was when the conflict arrived', async () => {
    const clipboard = stubClipboard();
    const { container, panel } = await conflicted();
    // The box stays mounted and editable through a conflict — only the row below it changes. A
    // reader who reads the stored text and then improves their own answer before taking it out is
    // the ordinary case, and capturing their text when the conflict arrived would quietly hand
    // them the older one. Same claim as F7, on the surface where the stakes are highest.
    fireEvent.change(boxOf(container, 'prediction'), {
      target: { value: 'edited while deciding' },
    });

    fireEvent.click(copyButton(panel));

    await waitFor(() => expect(clipboard.written).toEqual(['edited while deciding']));
  });

  it('downloads the box as it is at the press, not as it was when the conflict arrived', async () => {
    const downloads = stubDownloads();
    const { container, panel } = await conflicted();
    fireEvent.change(boxOf(container, 'prediction'), {
      target: { value: 'edited while deciding' },
    });

    fireEvent.click(downloadButton(panel));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    expect(await downloads.text()).toContain('edited while deciding');
    expect(await downloads.text()).not.toContain('my own answer');
  });

  it('puts the way out above the choice that discards, not below it', async () => {
    const { panel } = await conflicted();

    const buttons = [...panel.querySelectorAll('button')];
    const copy = buttons.findIndex((one) => /^cop/i.test(one.textContent ?? ''));
    const useStored = buttons.findIndex((one) => /use stored/i.test(one.textContent ?? ''));
    expect(copy).toBeGreaterThanOrEqual(0);
    expect(copy).toBeLessThan(useStored);
  });
});

describe('H1, H2 — every earlier version can be copied, and none downloaded', () => {
  const twoEarlier = [
    earlier({ revision: 2, text: 'It answered 200.' }),
    earlier({ revision: 1, text: 'I think it 404s.' }),
  ];

  it('gives each entry a Copy and nothing else', () => {
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);
    const entries = [
      ...(historyOf(container, 'prediction')?.querySelectorAll('.response-version') ?? []),
    ];

    expect(entries).toHaveLength(2);
    // No Download: this text is on the server already and is the one text on the page that cannot
    // be lost. Decision 5 in the spec.
    for (const entry of entries) expect(buttonWords(entry as HTMLElement)).toEqual(['Copy']);
  });

  it('copies the entry’s own text, not the box’s and not the other entry’s', async () => {
    const clipboard = stubClipboard();
    const { container } = renderPanel({}, [
      stored({ text: 'what is in the box now', earlierVersions: twoEarlier }),
    ]);
    const entries = [
      ...(historyOf(container, 'prediction')?.querySelectorAll('.response-version') ?? []),
    ] as HTMLElement[];

    fireEvent.click(copyButton(entries[1] as HTMLElement));

    await waitFor(() => expect(clipboard.written).toEqual(['I think it 404s.']));
  });

  it('copies the newest superseded entry when that is the one pressed', async () => {
    const clipboard = stubClipboard();
    const { container } = renderPanel({}, [stored({ earlierVersions: twoEarlier })]);
    const entries = [
      ...(historyOf(container, 'prediction')?.querySelectorAll('.response-version') ?? []),
    ] as HTMLElement[];

    fireEvent.click(copyButton(entries[0] as HTMLElement));

    await waitFor(() => expect(clipboard.written).toEqual(['It answered 200.']));
  });
});

describe('A2 — recovery sends nothing', () => {
  it('makes no request when Copy is pressed', async () => {
    stubClipboard();
    const { field, fetch } = await failASave();
    const before = fetch.calls.length;

    fireEvent.click(copyButton(field));

    // `stubFetch` throws on anything it was not queued to answer, so an unexpected request fails
    // this rather than passing quietly.
    await waitFor(() => expect(fetch.calls).toHaveLength(before));
  });

  it('makes no request when Download is pressed', async () => {
    stubDownloads();
    const { field, fetch } = await failASave();
    const before = fetch.calls.length;

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(fetch.calls).toHaveLength(before));
  });

  it('leaves the field failed and the text in the box after both', async () => {
    stubClipboard();
    stubDownloads();
    const { container, field } = await failASave('still mine');

    fireEvent.click(copyButton(field));
    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(stateOf(container, 'prediction')).toBe('failed'));
    expect(boxOf(container, 'prediction').value).toBe('still mine');
  });
});

describe('D1, D3 — reachable, named and announced', () => {
  it('names the field and the activity on both controls, not a bare “Copy”', async () => {
    const { field } = await failASave();

    // Twelve boxes on a lesson can each show these. A bare "Copy" says nothing about which answer.
    expect(copyButton(field).getAttribute('aria-label')).toMatch(/prediction/i);
    expect(copyButton(field).getAttribute('aria-label')).toMatch(/ACT-A/);
    expect(downloadButton(field).getAttribute('aria-label')).toMatch(/prediction/i);
    expect(downloadButton(field).getAttribute('aria-label')).toMatch(/ACT-A/);
  });

  it('names which earlier version a history Copy belongs to', () => {
    const { container } = renderPanel({}, [
      stored({ earlierVersions: [earlier({ revision: 2, text: 'It answered 200.' })] }),
    ]);
    const entry = historyOf(container, 'prediction')?.querySelector(
      '.response-version',
    ) as HTMLElement;

    const label = copyButton(entry).getAttribute('aria-label') ?? '';
    expect(label).toMatch(/prediction/i);
    expect(label).toMatch(/ACT-A/);
  });

  it('reaches both controls by keyboard, as real buttons rather than clickable text', async () => {
    const { field } = await failASave();

    for (const control of [copyButton(field), downloadButton(field)]) {
      expect(control.tagName).toBe('BUTTON');
      expect(control.getAttribute('type')).toBe('button');
      expect(control.getAttribute('tabindex')).not.toBe('-1');
    }
  });

  it('announces the outcome of a copy rather than only drawing it', async () => {
    stubClipboard();
    const { field } = await failASave();

    fireEvent.click(copyButton(field));

    await waitFor(() => {
      const announced = [...field.querySelectorAll('[role="status"]')]
        .map((one) => one.textContent ?? '')
        .join(' ');
      expect(announced).toMatch(/copied/i);
    });
  });

  it('announces the outcome of a download rather than only drawing it', async () => {
    stubDownloads();
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => {
      const announced = [...field.querySelectorAll('[role="status"]')]
        .map((one) => one.textContent ?? '')
        .join(' ');
      expect(announced).toMatch(/download/i);
    });
  });

  it('says nothing in the live region before either has been pressed', async () => {
    const { field } = await failASave();

    const announced = [...field.querySelectorAll('[role="status"]')]
      .map((one) => one.textContent ?? '')
      .join(' ');
    expect(announced).not.toMatch(/copied|downloaded/i);
  });

  it('keeps the failure sentence, so the reader is told why before how to recover', async () => {
    const { field } = await failASave();

    expect(within(field).getByText(/your text is still here/i)).toBeTruthy();
  });
});

/**
 * The review findings, pinned before they were fixed.
 *
 * Four of these came out of `/code-review` and test-guardian POST at the end of this slice, and
 * every one of them is a way for a control to *say* it worked when it did not — which is the exact
 * dishonesty ADR 0004 forbids of a save, in the machinery meant to rescue one.
 */
describe('the review findings', () => {
  it('clicks an anchor that is actually in the document, or no browser starts the download', async () => {
    const downloads = stubDownloads();
    const { field } = await failASave();

    fireEvent.click(downloadButton(field));

    await waitFor(() => expect(downloads.clicked).toHaveLength(1));
    // Chromium obliges a detached anchor; Firefox and several WebViews ignore it and the reader
    // gets "Downloaded" and no file. Found by `/code-review`, invisible to every other test here
    // because the jsdom stub records the press either way.
    expect(downloads.clicked[0]?.connected).toBe(true);
  });

  it('leaves no anchor of its own behind on the page', async () => {
    stubDownloads();
    const { field, container } = await failASave();
    const before = container.ownerDocument.querySelectorAll('a[download]').length;

    fireEvent.click(downloadButton(field));
    fireEvent.click(downloadButton(field));

    await waitFor(() =>
      expect(container.ownerDocument.querySelectorAll('a[download]')).toHaveLength(before),
    );
  });

  it('does not revoke the file’s URL while the browser could still be reading it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const downloads = stubDownloads();
      const { field } = await failASave();

      fireEvent.click(downloadButton(field));

      // Revoking beside the click, or a single task after it, races the browser still reading the
      // blob: the reader gets an empty file and a button that says Downloaded.
      expect(downloads.revoked).toEqual([]);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(downloads.revoked).toEqual([]);

      await vi.advanceTimersByTimeAsync(120_000);
      expect(downloads.revoked).toEqual([downloads.clicked[0]?.href]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports the press the reader made last, not the one that answers last', async () => {
    const pending = stubDeferredClipboard();
    const { container, field } = await failASave('first text');

    fireEvent.click(copyButton(field));
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'second text' } });
    fireEvent.click(copyButton(field));
    await waitFor(() => expect(pending).toHaveLength(2));

    // The newer press succeeds; the older one then fails. Without a guard the stale answer lands
    // last and writes "Could not copy" over a copy that worked — the reader re-copies text that is
    // already on their clipboard, or worse, believes the one that failed.
    pending[1]?.resolve();
    await waitFor(() => expect(copyButton(field).textContent).toMatch(/copied/i));
    pending[0]?.reject();

    await new Promise((settle) => setTimeout(settle, 0));
    expect(copyButton(field).textContent).toMatch(/copied/i);
    expect(copyButton(field).textContent).not.toMatch(/could not/i);
  });

  it('does not let a stale success overwrite a fresher refusal either', async () => {
    const pending = stubDeferredClipboard();
    const { field } = await failASave();

    fireEvent.click(copyButton(field));
    fireEvent.click(copyButton(field));
    await waitFor(() => expect(pending).toHaveLength(2));

    pending[1]?.reject();
    await waitFor(() => expect(copyButton(field).textContent).toMatch(/could not copy/i));
    pending[0]?.resolve();

    await new Promise((settle) => setTimeout(settle, 0));
    expect(copyButton(field).textContent).toMatch(/could not copy/i);
  });

  it('does not let an earlier press’s settle timer cut short a later press’s outcome', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      stubClipboard();
      const { field } = await failASave();

      fireEvent.click(copyButton(field));
      await waitFor(() => expect(copyButton(field).textContent).toMatch(/copied/i));
      await vi.advanceTimersByTimeAsync(1500);

      fireEvent.click(copyButton(field));
      await waitFor(() => expect(copyButton(field).textContent).toMatch(/copied/i));
      // 2100ms after the first press, 600ms after the second. The first press's timer is due here
      // and must have been cleared: left running it resets the button while the second press's
      // "Copied" is still the truth. `clipboard.ts` clears on the way out for exactly this, and
      // test-guardian POST found that deleting that line broke no test in the repo.
      await vi.advanceTimersByTimeAsync(600);

      expect(copyButton(field).textContent).toMatch(/copied/i);
    } finally {
      vi.useRealTimers();
    }
  });
});

/**
 * The defect this slice found in somebody else's code, kept so it cannot come back.
 *
 * `LessonMarkdown` builds the component map it hands react-markdown inside a `useMemo`. React
 * compares elements by their component's *identity*, so a rebuilt map is a different component
 * type: the activity panels are unmounted and mounted afresh, and every box on the lesson drops the
 * text in it. Until this slice that map's inputs were stable by accident, because `toLessonView`
 * returned the parsed body itself; the moment it derived anything the accident ended.
 *
 * Memoising the view fixed the trigger. It does not fix the hazard — React documents a `useMemo`
 * cache as discardable, and an eviction of *either* memo brings the whole thing back — so the claim
 * is written here as what the reader must never see, not as which cache holds.
 */
describe('a re-render never costs the reader what they have typed', () => {
  const panel = (context = lessonContext) => (
    <LessonMarkdown
      markdown={lessonBody}
      activities={[activity({ activityId: 'ACT-A' })]}
      responses={[]}
      lessonContext={context}
    />
  );

  it('keeps typed text when the same lesson is handed over again in fresh objects', () => {
    const { container, rerender } = render(panel());
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'nearly lost' } });

    // Fresh arrays and a fresh context object carrying the identical lesson — which is exactly what
    // re-deriving the view produces, and what a discarded memo would hand down.
    rerender(panel({ ...lessonContext }));

    expect(boxOf(container, 'prediction').value).toBe('nearly lost');
  });

  it('keeps the very same box on the page rather than replacing it', () => {
    const { container, rerender } = render(panel());
    const before = boxOf(container, 'prediction');
    fireEvent.change(before, { target: { value: 'nearly lost' } });

    rerender(panel({ ...lessonContext }));

    // The sharper half: a remount that happened to restore the text would still drop focus and
    // scroll position mid-sentence, and would still have discarded any state the field holds.
    expect(boxOf(container, 'prediction')).toBe(before);
    expect(before.isConnected).toBe(true);
  });

  it('keeps it across several such re-renders, not just the first', () => {
    const { container, rerender } = render(panel());
    fireEvent.change(boxOf(container, 'prediction'), { target: { value: 'nearly lost' } });

    for (let pass = 0; pass < 3; pass += 1) rerender(panel({ ...lessonContext }));

    expect(boxOf(container, 'prediction').value).toBe('nearly lost');
  });
});
