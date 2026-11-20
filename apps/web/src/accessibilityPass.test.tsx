import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App.js';
import { answerRoutes, importedRelease } from './testkit/apiFixture.js';

/**
 * Criterion AX10 in docs/specs/accessibility-pass.md: the large faded number behind the continue
 * card is decoration, and was a second copy of the lesson number in the card's text — the text a
 * copy-paste picks up, and that axe-core judged for contrast. That it still shows, and is absent
 * from Chromium's accessibility tree, is AX4a in tools/a11y-checks.mjs: jsdom renders no
 * generated content and has no accessibility tree.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});

describe('the continue card’s ghost number (AX10)', () => {
  it('is not text in the card', async () => {
    window.history.replaceState({}, '', '/courses/FSSE');
    answerRoutes({ '/api/courses/FSSE/release': importedRelease() });
    render(<App />);

    const card = await screen.findByTestId('current-lesson');

    // The kicker says "LESSON 01" once; the ghost used to say "01" a second time.
    expect(card.textContent).toContain('LESSON 01');
    expect(card.textContent?.split('01').length).toBe(2);
  });
});
