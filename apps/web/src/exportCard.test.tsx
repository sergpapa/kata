import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { DOWNLOAD_SETTLE_MS } from './download.js';
import { importedRelease } from './testkit/apiFixture.js';
import { stubDownloads } from './testkit/responseFieldHarness.js';

/**
 * Criteria EX15–EX17 in docs/specs/export.md: the Export card on the course dashboard.
 *
 * The page only asks and hands over; what the file says is the server's (export.test.ts). So the
 * claims here are the request the page makes from what the owner chose, and the honesty of what it
 * says afterwards: "Downloaded" only when a file was handed to the browser, the actual reason when
 * one was not, and never a card stuck on "Preparing…".
 */

const MARKDOWN = '# Kata export\n\nThe file body, exactly.\n';
const FILE_NAME = 'Kata_FSSE_Lessons_01-05_2026-11-19.md';

type ExportAnswer = () => Promise<Response>;

const fileAnswer: ExportAnswer = async () =>
  new Response(MARKDOWN, {
    status: 200,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      'content-disposition': `attachment; filename="${FILE_NAME}"`,
    },
  });

/** Answers the dashboard's own questions, and the export with whatever the test chose. */
function stubServer(courseId: string, exportAnswer: ExportAnswer = fileAnswer) {
  const exportUrls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith(`/api/courses/${courseId}/export`)) {
        exportUrls.push(url);
        return exportAnswer();
      }
      if (url.startsWith(`/api/courses/${courseId}/release`)) {
        return new Response(JSON.stringify(importedRelease()), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ state: 'none' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }),
  );
  return { exportUrls };
}

beforeEach(() => {
  window.history.replaceState({}, '', '/courses/FSSE');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/courses/FSSE');
});

async function exportCard(): Promise<HTMLElement> {
  const heading = await screen.findByRole('heading', { name: 'Export your work' });
  return heading.closest('section') as HTMLElement;
}

function select(card: HTMLElement, label: 'From' | 'To'): HTMLSelectElement {
  return within(card).getByLabelText(label) as HTMLSelectElement;
}

function choose(card: HTMLElement, label: 'From' | 'To', titleStart: string): void {
  const control = select(card, label);
  const option = Array.from(control.options).find((one) => one.text.includes(titleStart));
  if (!option) throw new Error(`${label} offers nothing containing "${titleStart}".`);
  fireEvent.change(control, { target: { value: option.value } });
}

function exportButton(card: HTMLElement): HTMLButtonElement {
  return within(card).getByRole('button', { name: 'Export' }) as HTMLButtonElement;
}

function status(card: HTMLElement): HTMLElement {
  return within(card).getByRole('status');
}

const BACKWARDS = 'From must be at or before To.';

describe('the card (EX15)', () => {
  // Re-aimed by docs/specs/earlier-conversations.md EC13: the checkbox became a three-way choice.
  it('replaces the old records text with range pickers, a conversations choice set to None, and Export', async () => {
    stubServer('FSSE');
    render(<App />);
    const card = await exportCard();

    expect(document.body.textContent).not.toContain('are not recorded yet');
    const from = select(card, 'From');
    const to = select(card, 'To');
    expect(Array.from(from.options).map((one) => one.text)).toEqual(
      Array.from(to.options).map((one) => one.text),
    );
    expect(from.options).toHaveLength(5);
    expect(from.selectedOptions[0]?.text).toContain('Lesson 1: What happens');
    expect(to.selectedOptions[0]?.text).toContain('Lesson 5: One page can make several requests');
    const group = within(card).getByRole('group', { name: 'AI feedback conversations' });
    const choices = within(group).getAllByRole('radio') as HTMLInputElement[];
    expect(choices.map((one) => one.labels?.[0]?.textContent)).toEqual([
      'None',
      'Current only',
      'Current and earlier',
    ]);
    expect(choices.map((one) => one.checked)).toEqual([true, false, false]);
    expect(within(card).queryByRole('checkbox')).toBeNull();
    expect(exportButton(card).disabled).toBe(false);
    expect(status(card).textContent).toBe('');
  });
});

describe('pressing Export (EX16)', () => {
  it('asks for the whole course without conversations, and hands over the file it got', async () => {
    const server = stubServer('FSSE');
    const downloads = stubDownloads();
    render(<App />);
    const card = await exportCard();

    fireEvent.click(exportButton(card));

    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));
    expect(server.exportUrls).toEqual([
      '/api/courses/FSSE/export?from=LS-M020-01&to=LS-M020-05&conversations=0',
    ]);
    expect(downloads.clicked).toHaveLength(1);
    expect(downloads.clicked[0]?.name).toBe(FILE_NAME);
    expect(await downloads.text()).toBe(MARKDOWN);
    expect(downloads.type()).toMatch(/^text\/markdown/);
  });

  it('clears Downloaded after the settle time', async () => {
    stubServer('FSSE');
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    fireEvent.click(exportButton(card));
    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));

    await waitFor(() => expect(status(card).textContent).toBe(''), {
      timeout: DOWNLOAD_SETTLE_MS + 1500,
    });
    expect(exportButton(card).disabled).toBe(false);
  });

  // Re-aimed by docs/specs/earlier-conversations.md EC13: "Current only" is what the tick was.
  it('asks for the range chosen, with current conversations when Current only is chosen', async () => {
    const server = stubServer('FSSE');
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    choose(card, 'From', 'Lesson 2:');
    choose(card, 'To', 'Lesson 4:');
    fireEvent.click(within(card).getByLabelText('Current only'));
    fireEvent.click(exportButton(card));

    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));
    expect(server.exportUrls).toEqual([
      '/api/courses/FSSE/export?from=LS-M020-02&to=LS-M020-04&conversations=1',
    ]);
  });

  it('asks the course it is in, not a fixed one', async () => {
    window.history.replaceState({}, '', '/courses/QAAE');
    const server = stubServer('QAAE');
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    fireEvent.click(exportButton(card));

    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));
    expect(server.exportUrls[0]).toMatch(/^\/api\/courses\/QAAE\/export\?/);
  });

  it('says Preparing and holds Export while the file is on its way', async () => {
    let deliver: () => void = () => {};
    const arrived = new Promise<void>((resolve) => {
      deliver = resolve;
    });
    stubServer('FSSE', async () => {
      await arrived;
      return fileAnswer();
    });
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    fireEvent.click(exportButton(card));

    await waitFor(() => expect(status(card).textContent).toBe('Preparing…'));
    expect(exportButton(card).disabled).toBe(true);
    deliver();
    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));
  });
});

describe('when no file is handed over (EX16)', () => {
  const failures: [string, ExportAnswer, 'ok' | 'absent', string][] = [
    [
      'the server refuses with a message',
      async () =>
        new Response(
          JSON.stringify({ error: 'export_range', message: 'This course has no lesson X.' }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      'ok',
      'This course has no lesson X.',
    ],
    [
      'the server fails with a page that is not JSON',
      async () => new Response('<h1>Internal error</h1>', { status: 500 }),
      'ok',
      'The app refused the export (status 500). Nothing was downloaded.',
    ],
    [
      'the server refuses with JSON that has no message',
      async () =>
        new Response(JSON.stringify({ error: 'x' }), {
          status: 400,
          headers: { 'content-type': 'application/json' },
        }),
      'ok',
      'The app refused the export (status 400). Nothing was downloaded.',
    ],
    [
      'the app does not answer',
      async () => {
        throw new TypeError('Failed to fetch');
      },
      'ok',
      'The export did not arrive. Nothing was downloaded.',
    ],
    [
      'the body stops arriving',
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('# Half a file'));
              controller.error(new TypeError('network error'));
            },
          }),
          {
            status: 200,
            headers: {
              'content-type': 'text/markdown; charset=utf-8',
              'content-disposition': `attachment; filename="${FILE_NAME}"`,
            },
          },
        ),
      'ok',
      'The export did not arrive. Nothing was downloaded.',
    ],
    [
      'the browser will not take the file',
      fileAnswer,
      'absent',
      'Your browser did not save the file. Nothing was downloaded.',
    ],
  ];

  it.each(failures)(
    'says so when %s, claims nothing, and lets Export be pressed again',
    async (_, answer, browser, message) => {
      stubServer('FSSE', answer);
      const downloads = stubDownloads(browser);
      render(<App />);
      const card = await exportCard();

      fireEvent.click(exportButton(card));

      const alert = await within(card).findByRole('alert');
      expect(alert.textContent).toContain(message);
      expect(downloads.clicked).toHaveLength(0);
      expect(card.textContent).not.toContain('Downloaded');
      expect(status(card).textContent).not.toContain('Preparing…');
      expect(exportButton(card).disabled).toBe(false);
    },
  );
});

describe('a range that runs backwards (EX17)', () => {
  it('says From must come first when To is moved before it, and holds Export', async () => {
    const server = stubServer('FSSE');
    render(<App />);
    const card = await exportCard();

    choose(card, 'From', 'Lesson 4:');
    choose(card, 'To', 'Lesson 2:');

    expect(card.textContent).toContain(BACKWARDS);
    expect(exportButton(card).disabled).toBe(true);
    fireEvent.click(exportButton(card));
    expect(server.exportUrls).toHaveLength(0);

    choose(card, 'To', 'Lesson 4:');
    await waitFor(() => expect(exportButton(card).disabled).toBe(false));
    expect(card.textContent).not.toContain(BACKWARDS);
  });

  it('says so too when From is moved past To', async () => {
    stubServer('FSSE');
    render(<App />);
    const card = await exportCard();

    choose(card, 'To', 'Lesson 2:');
    expect(card.textContent).not.toContain(BACKWARDS);
    choose(card, 'From', 'Lesson 4:');

    expect(card.textContent).toContain(BACKWARDS);
    expect(exportButton(card).disabled).toBe(true);
  });

  it('accepts one lesson, From equal to To', async () => {
    const server = stubServer('FSSE');
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    choose(card, 'From', 'Lesson 3:');
    choose(card, 'To', 'Lesson 3:');

    expect(card.textContent).not.toContain(BACKWARDS);
    expect(exportButton(card).disabled).toBe(false);
    fireEvent.click(exportButton(card));
    await waitFor(() => expect(status(card).textContent).toBe('Downloaded'));
    expect(server.exportUrls).toEqual([
      '/api/courses/FSSE/export?from=LS-M020-03&to=LS-M020-03&conversations=0',
    ]);
  });
});
