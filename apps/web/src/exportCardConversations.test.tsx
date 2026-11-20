import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { App } from './App.js';
import { importedRelease } from './testkit/apiFixture.js';
import { stubDownloads } from './testkit/responseFieldHarness.js';

/**
 * EC13 in docs/specs/earlier-conversations.md: the Export card's three-way conversations choice.
 *
 * What these catch: a choice that does not reach the request, a "Current and earlier" that sends
 * what "Current only" sends, and a "Downloaded" left standing for a file the owner has since
 * changed their mind about.
 */

function stubServer() {
  const exportUrls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.startsWith('/api/courses/FSSE/export')) {
        exportUrls.push(url);
        return new Response('# Export\n', {
          status: 200,
          headers: {
            'content-type': 'text/markdown; charset=utf-8',
            'content-disposition': 'attachment; filename="Kata_FSSE_Lessons_01-05_2026-11-19.md"',
          },
        });
      }
      const body = url.startsWith('/api/courses/FSSE/release')
        ? importedRelease()
        : { state: 'none' };
      return new Response(JSON.stringify(body), {
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

async function exportWith(choice: string | null): Promise<string[]> {
  const server = stubServer();
  stubDownloads();
  render(<App />);
  const card = await exportCard();
  if (choice !== null) fireEvent.click(within(card).getByLabelText(choice));
  fireEvent.click(within(card).getByRole('button', { name: 'Export' }));
  await waitFor(() => expect(within(card).getByRole('status').textContent).toBe('Downloaded'));
  return server.exportUrls;
}

describe('the conversations choice (EC13)', () => {
  it.each([
    ['nothing chosen', null, '0'],
    ['None', 'None', '0'],
    ['Current only', 'Current only', '1'],
    ['Current and earlier', 'Current and earlier', 'all'],
  ])('sends conversations=%s as %s', async (_, choice, value) => {
    const urls = await exportWith(choice);

    expect(urls).toEqual([
      `/api/courses/FSSE/export?from=LS-M020-01&to=LS-M020-05&conversations=${value}`,
    ]);
  });

  it('goes back to None when None is chosen after another choice', async () => {
    const server = stubServer();
    stubDownloads();
    render(<App />);
    const card = await exportCard();

    fireEvent.click(within(card).getByLabelText('Current and earlier'));
    fireEvent.click(within(card).getByLabelText('None'));
    fireEvent.click(within(card).getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(server.exportUrls).toHaveLength(1));
    expect(server.exportUrls[0]).toMatch(/conversations=0$/);
  });

  it('clears a Downloaded that was about the previous choice', async () => {
    stubServer();
    stubDownloads();
    render(<App />);
    const card = await exportCard();
    fireEvent.click(within(card).getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(within(card).getByRole('status').textContent).toBe('Downloaded'));

    fireEvent.click(within(card).getByLabelText('Current and earlier'));

    expect(within(card).getByRole('status').textContent).toBe('');
  });

  it('is one group of radios sharing a name, so arrow keys move between them', async () => {
    stubServer();
    render(<App />);
    const card = await exportCard();

    const radios = within(
      within(card).getByRole('group', { name: 'AI feedback conversations' }),
    ).getAllByRole('radio') as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    const names = new Set(radios.map((one) => one.name));
    expect(names.size).toBe(1);
    expect([...names][0]).not.toBe('');
  });
});
