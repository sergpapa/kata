import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { fiveLessons, importedRelease, releaseSummary } from './testkit/apiFixture.js';

/**
 * Criteria N1–N8 in docs/specs/acknowledged-saves.md.
 *
 * The app already never claims a save it did not make. This is the other half: it must not quietly
 * eat work either. A reader who has typed a prediction and clicks Next has not asked to throw it
 * away, and "unsaved" written beside the box is not an answer once the box is gone.
 *
 * Driven through the whole app rather than the guard module, because the bug this catches lives in
 * the seam: a registry that is correct while the only caller forgets to unregister on unmount will
 * block navigation for ever, and only a real mount and unmount shows that.
 */

const lessonBody = [
  '# Lesson 1: the authored title',
  '',
  '## Practice A',
  '',
  'Authored prose inside Practice A.',
].join('\n');

function activity(over: Record<string, unknown> = {}) {
  return {
    activityId: 'ACT-A',
    lessonId: 'LS-M020-01',
    kind: 'interpretation',
    title: 'Practice A',
    sourceHeading: 'Practice A',
    responseFields: ['prediction'],
    promptMarkdown: 'The authored prompt.',
    ...over,
  };
}

function answerEverything(saveAnswer?: () => Response, activities = [activity()]) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        });

      if (url.startsWith('/api/release')) return json(importedRelease());
      if (url.startsWith('/api/resume-point')) return json({ state: 'none' });
      if (url.startsWith('/api/activities/')) {
        return (
          saveAnswer?.() ??
          json({ state: 'saved', revision: 1, updatedAt: '2026-09-22T14:00:00.000Z' })
        );
      }

      const order = Number(/LS-M020-0(\d)/.exec(url)?.[1] ?? '1');
      return json({
        state: 'lesson',
        release: { releaseId: releaseSummary.releaseId, version: releaseSummary.version },
        lesson: {
          ...fiveLessons[order - 1],
          facts: [{ key: 'status', label: 'Status', kind: 'line', text: 'not yet tested' }],
          bodyMarkdown: lessonBody,
        },
        activities: order === 1 ? activities : [],
        responses: [],
        previous: null,
        next:
          order === 1
            ? { order: 2, candidateLessonId: 'LS-M020-02', displayTitle: 'Lesson 2: next one' }
            : null,
      });
    }),
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/lessons/LS-M020-01');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

/** Opens lesson 1 and types into its prediction box without saving. */
async function typeWithoutSaving(text = 'work I have not saved') {
  const view = render(<App />);
  const box = await screen.findByLabelText(/your prediction/i);
  fireEvent.change(box, { target: { value: text } });
  return { ...view, box: box as HTMLTextAreaElement };
}

function nextLink(): HTMLElement {
  return screen.getByRole('link', { name: /Lesson 2: next one/i });
}

function dialog(): HTMLElement {
  return screen.getByRole('dialog');
}

describe('leaving a lesson with unsaved work', () => {
  it('stops the navigation and says what is unsaved', async () => {
    answerEverything();
    await typeWithoutSaving();

    fireEvent.click(nextLink());

    expect(dialog()).toBeTruthy();
    expect(window.location.pathname).toBe('/lessons/LS-M020-01');
  });

  it('names the field and its activity, not a count', async () => {
    answerEverything();
    await typeWithoutSaving();

    fireEvent.click(nextLink());

    const text = dialog().textContent ?? '';
    expect(text).toMatch(/your prediction/i);
    expect(text).toContain('ACT-A');
  });

  it('leaves the text and the state exactly as they were when the reader stays', async () => {
    answerEverything();
    const { box } = await typeWithoutSaving('a prediction worth keeping');
    fireEvent.click(nextLink());

    fireEvent.click(within(dialog()).getByRole('button', { name: /stay/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.pathname).toBe('/lessons/LS-M020-01');
    expect(box.value).toBe('a prediction worth keeping');
    expect(
      document
        .querySelector('.response-field[data-field-name="prediction"]')
        ?.getAttribute('data-state'),
    ).toBe('unsaved');
  });

  it('performs the navigation that was blocked when the reader leaves anyway', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(nextLink());

    fireEvent.click(within(dialog()).getByRole('button', { name: /leave anyway/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/lessons/LS-M020-02'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not ask again on the next navigation once the reader has left', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(nextLink());
    fireEvent.click(within(dialog()).getByRole('button', { name: /leave anyway/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/lessons/LS-M020-02'));

    fireEvent.click(screen.getByRole('link', { name: /all lessons/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('more than one unsaved field', () => {
  it('names every unsaved field, across every activity that has one', async () => {
    // Each earlier test has exactly one field on one activity, so a dialog that named a single
    // hardcoded label, or collapsed to "2 unsaved fields", would pass all of them. N8 says the
    // reader is told what they are about to lose, by name.
    answerEverything(undefined, [
      activity({
        activityId: 'ACT-A',
        sourceHeading: 'Practice A',
        responseFields: ['prediction', 'observation'],
      }),
      activity({
        activityId: 'ACT-B',
        sourceHeading: 'Practice B',
        responseFields: ['explanation'],
      }),
    ]);
    render(<App />);
    await screen.findByLabelText(/your prediction/i);

    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'one' } });
    fireEvent.change(screen.getByLabelText(/your explanation/i), { target: { value: 'two' } });
    // Left untouched on purpose: it must not be named.
    fireEvent.click(nextLink());

    const text = dialog().textContent ?? '';
    expect(text).toMatch(/your prediction/i);
    expect(text).toMatch(/your explanation/i);
    expect(text).not.toMatch(/what you observed/i);
    expect(text).toContain('ACT-A');
    expect(text).toContain('ACT-B');
  });

  it('stops asking once the last unsaved field is saved, not merely the first', async () => {
    answerEverything(undefined, [
      activity({ activityId: 'ACT-A', responseFields: ['prediction', 'observation'] }),
    ]);
    render(<App />);
    await screen.findByLabelText(/your prediction/i);
    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'one' } });
    fireEvent.change(screen.getByLabelText(/what you observed/i), { target: { value: 'two' } });

    const saves = screen.getAllByRole('button', { name: /^save/i });
    fireEvent.click(saves[0] as HTMLElement);
    await waitFor(() =>
      expect(
        document
          .querySelector('.response-field[data-field-name="prediction"]')
          ?.getAttribute('data-state'),
      ).toBe('saved'),
    );

    // One saved, one still unsaved: the guard must still be holding.
    fireEvent.click(nextLink());
    expect(dialog()).toBeTruthy();
    const text = dialog().textContent ?? '';
    expect(text).toMatch(/what you observed/i);
    expect(text).not.toMatch(/your prediction/i);
  });
});

describe('leaving with nothing unsaved', () => {
  it('navigates straight away when nothing was typed', async () => {
    answerEverything();
    render(<App />);
    await screen.findByLabelText(/your prediction/i);

    fireEvent.click(nextLink());

    await waitFor(() => expect(window.location.pathname).toBe('/lessons/LS-M020-02'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('navigates straight away once the typed work has been saved', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(screen.getByRole('button', { name: /^save/i }));
    await waitFor(() =>
      expect(
        document
          .querySelector('.response-field[data-field-name="prediction"]')
          ?.getAttribute('data-state'),
      ).toBe('saved'),
    );

    fireEvent.click(nextLink());

    await waitFor(() => expect(window.location.pathname).toBe('/lessons/LS-M020-02'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('stops guarding once the page carrying the unsaved field is gone', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(nextLink());
    fireEvent.click(within(dialog()).getByRole('button', { name: /leave anyway/i }));
    await waitFor(() => expect(window.location.pathname).toBe('/lessons/LS-M020-02'));

    // Lesson 2 has no activities, so nothing on this page is unsaved. A registry that never
    // unregistered would still be holding lesson 1's field and would block this.
    fireEvent.click(screen.getByRole('link', { name: /all lessons/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});

describe('the back button', () => {
  it('restores the address it left and asks the same question', async () => {
    answerEverything();
    await typeWithoutSaving();

    window.history.pushState({}, '', '/');
    fireEvent.popState(window);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());
    expect(window.location.pathname).toBe('/lessons/LS-M020-01');
  });

  it('goes where the back button was heading when the reader leaves anyway', async () => {
    answerEverything();
    await typeWithoutSaving();
    window.history.pushState({}, '', '/');
    fireEvent.popState(window);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeNull());

    fireEvent.click(within(dialog()).getByRole('button', { name: /leave anyway/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/'));
  });
});

describe('a refresh or a closed tab', () => {
  it('warns the browser only while something is unsaved', async () => {
    answerEverything();
    render(<App />);
    await screen.findByLabelText(/your prediction/i);

    const before = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(before);
    expect(before.defaultPrevented).toBe(false);

    fireEvent.change(screen.getByLabelText(/your prediction/i), { target: { value: 'typed' } });
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(true);
  });

  it('stops warning once the work is saved', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(screen.getByRole('button', { name: /^save/i }));
    await waitFor(() =>
      expect(
        document
          .querySelector('.response-field[data-field-name="prediction"]')
          ?.getAttribute('data-state'),
      ).toBe('saved'),
    );

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });
});

describe('the dialog itself', () => {
  it('takes focus, and hands it back to where the reader was', async () => {
    answerEverything();
    await typeWithoutSaving();
    const link = nextLink();
    link.focus();

    fireEvent.click(link);
    await waitFor(() => expect(dialog().contains(document.activeElement)).toBe(true));

    fireEvent.click(within(dialog()).getByRole('button', { name: /stay/i }));

    await waitFor(() => expect(document.activeElement).toBe(link));
  });

  it('treats Escape as staying', async () => {
    answerEverything();
    const { box } = await typeWithoutSaving('still here');
    fireEvent.click(nextLink());

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(window.location.pathname).toBe('/lessons/LS-M020-01');
    expect(box.value).toBe('still here');
  });

  it('keeps Tab inside itself', async () => {
    answerEverything();
    await typeWithoutSaving();
    fireEvent.click(nextLink());

    const inside = within(dialog()).getAllByRole('button');
    expect(inside.length).toBeGreaterThanOrEqual(2);

    const last = inside[inside.length - 1] as HTMLElement;
    last.focus();
    fireEvent.keyDown(dialog(), { key: 'Tab' });
    expect(dialog().contains(document.activeElement)).toBe(true);

    // And backwards, which is the half a forward-only trap leaves open: Shift+Tab off the first
    // control lands on the page behind the dialog, where every link still works.
    const first = inside[0] as HTMLElement;
    first.focus();
    fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true });
    expect(dialog().contains(document.activeElement)).toBe(true);
  });

  it('is announced as a modal dialog with a name', async () => {
    answerEverything();
    await typeWithoutSaving();

    fireEvent.click(nextLink());

    expect(dialog().getAttribute('aria-modal')).toBe('true');
    const labelledBy = dialog().getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy as string)?.textContent?.trim()).not.toBe('');
  });
});
