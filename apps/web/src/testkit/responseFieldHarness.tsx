import { afterEach, vi } from 'vitest';
import { cleanup, render, within } from '@testing-library/react';
import { LessonMarkdown } from '../markdown/LessonMarkdown.js';
import { activity, lessonBody, lessonContext, panelOf } from './activityFixture.js';
import type { EarlierVersion, StoredResponse } from '../releaseTypes.js';

/**
 * The fixtures the response-field suites share: a strict fake server, the answers it can give, and
 * the readers that turn a rendered panel into something a test can state a claim about.
 *
 * Extracted when ResponseField.test.tsx passed 750 lines. Shared rather than copied because the
 * strictness of `stubFetch` is load-bearing in both files — a second copy that drifted into being
 * lenient would make one suite quietly stop noticing an unexpected request.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  // Not globals, so `unstubAllGlobals` never sees them: these are statics on the `URL` class, which
  // jsdom ships without. Deleting is the restore — there was nothing here to put back.
  const url = URL as unknown as Record<string, unknown>;
  delete url.createObjectURL;
  delete url.revokeObjectURL;
});

export type Answer = () => Promise<Response>;

/**
 * A fetch that answers exactly what the test queued, one answer per call, in order — and throws
 * if the page asks for anything it was not told to expect. That strictness is the point: a field
 * that quietly re-sends, or that sends on a keystroke, shows up here as a failure rather than as a
 * passing test with a surprise request in it.
 */
export function stubFetch(...initial: readonly Answer[]) {
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

export const saved =
  (revision: number, updatedAt = '2026-09-22T14:02:00.000Z') =>
  async () =>
    new Response(JSON.stringify({ state: 'saved', revision, updatedAt }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

/**
 * A save the server accepted, answering with the history it holds afterwards.
 *
 * Separate from `saved` rather than folded into it: `saved` answers without the key at all, which
 * is what an older server does, and the field must be provably different in the two cases.
 */
export const savedWithHistory =
  (
    revision: number,
    earlierVersions: readonly EarlierVersion[],
    updatedAt = '2026-09-22T14:02:00.000Z',
  ) =>
  async () =>
    new Response(JSON.stringify({ state: 'saved', revision, updatedAt, earlierVersions }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

export const earlier = (over: Partial<EarlierVersion> = {}): EarlierVersion => ({
  revision: 1,
  text: 'what I first thought',
  writtenAt: '2020-01-02T09:14:00.000Z',
  contentVersion: '1.0.0-draft',
  ...over,
});

export const conflict = (text: string, revision: number) => async () =>
  new Response(
    JSON.stringify({
      error: 'revision_conflict',
      message: 'This field was saved somewhere else since you opened it.',
      stored: { text, revision, updatedAt: '2026-09-22T14:05:00.000Z' },
    }),
    { status: 409, headers: { 'content-type': 'application/json' } },
  );

export const refused =
  (error: string, message: string, status = 400) =>
  async () =>
    new Response(JSON.stringify({ error, message }), {
      status,
      headers: { 'content-type': 'application/json' },
    });

export const offline = () => async () => {
  throw new TypeError('Failed to fetch');
};

/** Never settles, so a test can look at the page while the request is still in flight. */
export const inFlight = () => () => new Promise<Response>(() => {});

export { lessonContext };

export function renderPanel(
  over: Parameters<typeof activity>[0] = {},
  responses: readonly StoredResponse[] = [],
) {
  return render(
    <LessonMarkdown
      markdown={lessonBody}
      activities={[activity({ activityId: 'ACT-A', ...over })]}
      responses={responses}
      lessonContext={lessonContext}
    />,
  );
}

/**
 * A clipboard that records, so a test can compare what was written character for character.
 *
 * `CopyBlock.test.tsx` keeps its own copy of this on purpose: that file is the proof that pulling
 * the copy state machine into a shared hook changed no behaviour, so nothing it imports may move in
 * the same slice.
 */
export function stubClipboard(): { written: string[]; fail?: boolean } {
  const state: { written: string[]; fail?: boolean } = { written: [] };
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: vi.fn(async (text: string) => {
        if (state.fail) throw new Error('Write permission denied.');
        state.written.push(text);
      }),
    },
  });
  return state;
}

/**
 * A clipboard whose writes the test settles by hand, so two presses can be made to overlap and to
 * land out of order. That ordering is the whole point: the second press is the reader's newer
 * intent, and whatever the first one eventually says must not overwrite what the second reported.
 */
export function stubDeferredClipboard() {
  const pending: { text: string; resolve: () => void; reject: () => void }[] = [];
  vi.stubGlobal('navigator', {
    ...globalThis.navigator,
    clipboard: {
      writeText: vi.fn(
        (text: string) =>
          new Promise<void>((resolve, reject) => {
            pending.push({ text, resolve, reject: () => reject(new Error('refused')) });
          }),
      ),
    },
  });
  return pending;
}

/** A browser with no clipboard at all, which is what plain HTTP gives a page in some browsers. */
export function stubNoClipboard(): void {
  vi.stubGlobal('navigator', { ...globalThis.navigator, clipboard: undefined });
}

export type DownloadMode = 'ok' | 'absent' | 'throws';

/**
 * The file-saving boundary, stood in for.
 *
 * jsdom implements no `URL.createObjectURL`, so every claim here is about the bytes and the name
 * the page hands the browser — never about a file actually reaching a disk. The anchor's own
 * `click` is spied rather than left to fire, because jsdom would navigate on it.
 *
 * `absent` and `throws` are the two ways the real boundary refuses: a browser that never had the
 * method, and one that has it and says no.
 */
export function stubDownloads(mode: DownloadMode = 'ok') {
  const blobs: Blob[] = [];
  const revoked: string[] = [];
  const clicked: { name: string; href: string; connected: boolean }[] = [];

  const url = URL as unknown as Record<string, unknown>;
  if (mode === 'absent') {
    // Both, not just the one the code reaches first: a browser that never had `createObjectURL`
    // does not have its counterpart either, and a stub that keeps one is a kinder boundary than
    // the real one it stands for.
    delete url.createObjectURL;
    delete url.revokeObjectURL;
  } else {
    url.createObjectURL = (blob: Blob) => {
      if (mode === 'throws') throw new Error('This browser refused to make a file.');
      blobs.push(blob);
      return `blob:recovery/${blobs.length}`;
    };
    url.revokeObjectURL = (href: string) => revoked.push(href);
  }

  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    // `isConnected` at the moment of the press, because that is what decides whether a real browser
    // starts the download at all — Firefox and several WebViews ignore a click on an anchor that is
    // not in the document.
    clicked.push({ name: this.download, href: this.href, connected: this.isConnected });
  });

  return {
    clicked,
    revoked,
    click,
    /** What was actually put in the file, read back off the blob the page built. */
    text: async (index = 0): Promise<string | undefined> => blobs[index]?.text(),
    type: (index = 0): string | undefined => blobs[index]?.type,
  };
}

export function fieldOf(container: HTMLElement, fieldName: string): HTMLElement {
  const field = panelOf(container, 'ACT-A').querySelector(
    `.response-field[data-field-name="${fieldName}"]`,
  );
  if (!field) throw new Error(`no ${fieldName} field on the panel`);
  return field as HTMLElement;
}

export function boxOf(container: HTMLElement, fieldName: string): HTMLTextAreaElement {
  return within(fieldOf(container, fieldName)).getByRole('textbox') as HTMLTextAreaElement;
}

export function stateOf(container: HTMLElement, fieldName: string): string {
  return fieldOf(container, fieldName).getAttribute('data-state') ?? '';
}

/** The earlier-versions disclosure on a field, or null where the field offers none. */
export function historyOf(container: HTMLElement, fieldName: string): HTMLDetailsElement | null {
  return fieldOf(container, fieldName).querySelector('details.response-history');
}

export function saveButton(container: HTMLElement, fieldName: string): HTMLElement {
  return within(fieldOf(container, fieldName)).getByRole('button', { name: /^save/i });
}

/** Every button the field offers right now, by its visible word. Order is the row's own. */
export function buttonWords(scope: HTMLElement): string[] {
  return [...scope.querySelectorAll('button')].map((one) => one.textContent?.trim() ?? '');
}

/*
 * Both locators name every word the control can be showing, because the accessible name tracks the
 * state — so a test about the refused outcome has to be able to find the control that refused.
 * These are locators, not claims: what each state *says* is asserted in the tests themselves.
 */
export function copyButton(scope: HTMLElement): HTMLElement {
  return within(scope).getByRole('button', { name: /^(copy|copied|could not copy)\b/i });
}

export function downloadButton(scope: HTMLElement): HTMLElement {
  return within(scope).getByRole('button', {
    name: /^(download|downloaded|could not download)\b/i,
  });
}

export function stored(over: Partial<StoredResponse> = {}): StoredResponse {
  return {
    activityId: 'ACT-A',
    fieldName: 'prediction',
    text: 'what was acknowledged',
    revision: 3,
    updatedAt: '2026-09-22T09:00:00.000Z',
    ...over,
  };
}
