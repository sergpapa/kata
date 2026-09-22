import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { LessonMarkdown } from './LessonMarkdown.js';

/**
 * Criteria N1 and N2 in docs/specs/reader-navigation-and-resume.md: every rendered heading carries
 * a stable, namespaced id, and the contents list is told about exactly the section-level ones.
 *
 * The ids are the contract between the sidebar's anchors and the body they point into, so the
 * exact spellings are pinned here — a changed slug silently breaks every contents link.
 */

afterEach(cleanup);

const sectionedBody = [
  'Opening paragraph.',
  '',
  '## First section',
  '',
  'Prose.',
  '',
  '## Second section',
  '',
  '### A subsection',
  '',
  'More prose.',
].join('\n');

describe('heading anchors', () => {
  it('gives every heading an id derived from its own text', () => {
    const { container } = render(<LessonMarkdown markdown={sectionedBody} />);

    expect(container.querySelector('h2#user-content-first-section')?.textContent).toBe(
      'First section',
    );
    expect(container.querySelector('h2#user-content-second-section')?.textContent).toBe(
      'Second section',
    );
    expect(container.querySelector('h3#user-content-a-subsection')?.textContent).toBe(
      'A subsection',
    );
  });

  it('keeps two same-named headings apart', () => {
    const body = '## Details\n\nFirst.\n\n## Details\n\nSecond.\n';
    const { container } = render(<LessonMarkdown markdown={body} />);

    const ids = [...container.querySelectorAll('h2')].map((heading) => heading.id);
    expect(ids).toEqual(['user-content-details', 'user-content-details-1']);
  });

  it('namespaces every id, so an authored heading cannot clobber the app’s own elements', () => {
    // The shell's skip link targets #main. An un-prefixed heading named "Main" would capture it.
    const { container } = render(<LessonMarkdown markdown={'## Main\n\nProse.\n'} />);

    expect(container.querySelector('#main')).toBeNull();
    expect(container.querySelector('h2#user-content-main')).not.toBeNull();
  });

  it('slugs the text of a heading that carries inline code and punctuation', () => {
    const { container } = render(
      <LessonMarkdown markdown={'## Ask `GET /menu` twice?\n\nProse.\n'} />,
    );

    expect(container.querySelector('h2#user-content-ask-get-menu-twice')).not.toBeNull();
  });

  it('keeps the id on a body-carried H1 that renders demoted to a section heading', () => {
    const body = 'Opening.\n\n# Later note\n\nProse.\n';
    const { container } = render(<LessonMarkdown markdown={body} />);

    const demoted = container.querySelector('h2#user-content-later-note');
    expect(demoted?.textContent).toBe('Later note');
    expect(container.querySelector('h1')).toBeNull();
  });
});

describe('what the contents list is told', () => {
  it('reports the sections — the headings rendered as h2 — in authored order', () => {
    const onOutline = vi.fn();
    render(<LessonMarkdown markdown={sectionedBody} onOutline={onOutline} />);

    expect(onOutline).toHaveBeenCalled();
    expect(onOutline.mock.calls.at(-1)?.[0]).toEqual([
      { id: 'user-content-first-section', text: 'First section' },
      { id: 'user-content-second-section', text: 'Second section' },
    ]);
  });

  it('counts a demoted body H1 as a section, since that is how it renders', () => {
    const onOutline = vi.fn();
    render(
      <LessonMarkdown markdown={'# Later note\n\nProse.\n\n## After it\n'} onOutline={onOutline} />,
    );

    expect(onOutline.mock.calls.at(-1)?.[0]).toEqual([
      { id: 'user-content-later-note', text: 'Later note' },
      { id: 'user-content-after-it', text: 'After it' },
    ]);
  });

  it('reports an empty outline for a body with no sections at all', () => {
    const onOutline = vi.fn();
    render(<LessonMarkdown markdown={'Only prose, no headings.\n'} onOutline={onOutline} />);

    expect(onOutline.mock.calls.at(-1)?.[0]).toEqual([]);
  });
});
