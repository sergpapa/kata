import { useEffect, useId, useRef, useState } from 'react';
import { courseApi } from './course.js';
import { DOWNLOAD_SETTLE_MS, handFileToBrowser } from './download.js';
import { twoDigits } from './format.js';
import type { LessonSummary } from './releaseTypes.js';

/**
 * The dashboard's Export card (docs/specs/export.md EX15–EX17, ADR 0020).
 *
 * The file is the server's; this card only says which lessons and whether conversations go, then
 * hands what arrives to the browser. Its one job beyond that is honesty: "Downloaded" appears only
 * after the browser took the file, every way of not getting one is said in words, and no failure
 * leaves Export stuck disabled.
 */

type Outcome =
  | { readonly state: 'idle' }
  | { readonly state: 'preparing' }
  | { readonly state: 'downloaded' }
  | { readonly state: 'failed'; readonly message: string };

const NOT_ARRIVED = 'The export did not arrive. Nothing was downloaded.';
const NOT_SAVED = 'Your browser did not save the file. Nothing was downloaded.';

/** The conversations choice, in the order shown, with the value the server reads (EC13). */
const CONVERSATION_CHOICES = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Current only' },
  { value: 'all', label: 'Current and earlier' },
] as const;

type ConversationsValue = (typeof CONVERSATION_CHOICES)[number]['value'];

/** The name the server gave the file, or a plain fallback if a proxy dropped the header. */
function fileNameFrom(disposition: string | null, courseId: string): string {
  const quoted = disposition ? /filename="([^"]+)"/.exec(disposition) : null;
  return quoted?.[1] ?? `EduCode_${courseId}_export.md`;
}

/** The refusal's own words when it has some, a status otherwise (EX16). */
async function refusalMessage(response: Response): Promise<string> {
  const fallback = `The app refused the export (status ${response.status}). Nothing was downloaded.`;
  try {
    const body = (await response.json()) as { message?: unknown; failure?: { message?: unknown } };
    const message = body.message ?? body.failure?.message;
    return typeof message === 'string' && message !== '' ? message : fallback;
  } catch {
    return fallback;
  }
}

/** The Export card for one course; `lessons` must be in release order, as the From/To lists show. */
export function ExportCard({
  courseId,
  lessons,
}: {
  readonly courseId: string;
  /** In release order. */
  readonly lessons: readonly LessonSummary[];
}) {
  const ids = useId();
  const [fromId, setFromId] = useState(lessons[0]?.candidateLessonId ?? '');
  const [toId, setToId] = useState(lessons[lessons.length - 1]?.candidateLessonId ?? '');
  const [conversations, setConversations] = useState<ConversationsValue>('0');
  const [outcome, setOutcome] = useState<Outcome>({ state: 'idle' });
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (settle.current !== null) clearTimeout(settle.current);
      inFlight.current?.abort();
    };
  }, []);

  const position = (id: string) => lessons.findIndex((one) => one.candidateLessonId === id);
  const backwards = position(fromId) > position(toId);
  const preparing = outcome.state === 'preparing';

  /**
   * A changed choice makes an earlier "Downloaded" about a different file, so it goes. A failure
   * stays: it is still the reason the last press got nothing.
   */
  function choiceChanged(): void {
    if (outcome.state !== 'downloaded') return;
    if (settle.current !== null) clearTimeout(settle.current);
    setOutcome({ state: 'idle' });
  }

  async function exportWork(): Promise<void> {
    // The ref, not `preparing`: two presses handled before React re-renders both see the same
    // render's `preparing`, and the second would start a second download.
    if (backwards || inFlight.current !== null) return;
    if (settle.current !== null) clearTimeout(settle.current);
    const controller = new AbortController();
    inFlight.current = controller;
    setOutcome({ state: 'preparing' });

    const finish = (next: Outcome) => {
      if (controller.signal.aborted) return;
      inFlight.current = null;
      setOutcome(next);
      if (next.state === 'downloaded') {
        settle.current = setTimeout(() => setOutcome({ state: 'idle' }), DOWNLOAD_SETTLE_MS);
      }
    };

    const query = new URLSearchParams({
      from: fromId,
      to: toId,
      conversations,
    });
    let response: Response;
    let body: string;
    try {
      response = await fetch(`${courseApi(courseId)}/export?${query.toString()}`, {
        signal: controller.signal,
      });
      // A refused course answers 200 with its failure as JSON, the shape every route uses.
      const json = (response.headers.get('content-type') ?? '').includes('application/json');
      if (!response.ok || json) {
        finish({ state: 'failed', message: await refusalMessage(response) });
        return;
      }
      body = await response.text();
    } catch {
      finish({ state: 'failed', message: NOT_ARRIVED });
      return;
    }

    const name = fileNameFrom(response.headers.get('content-disposition'), courseId);
    const taken = handFileToBrowser(name, body, 'text/markdown;charset=utf-8');
    finish(taken ? { state: 'downloaded' } : { state: 'failed', message: NOT_SAVED });
  }

  const option = (lesson: LessonSummary) => (
    <option
      key={lesson.candidateLessonId}
      value={lesson.candidateLessonId}
      title={lesson.displayTitle}
    >
      {twoDigits(lesson.order)} · {lesson.displayTitle}
    </option>
  );
  const rangeError = `${ids}-range-error`;

  return (
    <section className="card export-card" aria-labelledby={`${ids}-heading`}>
      <h2 id={`${ids}-heading`}>Export your work</h2>
      <p className="export-lede">
        One Markdown file of your saved answers, to send with your owner review.
      </p>

      {/* One lesson is no range: two pickers that can only agree are a question with no choice. */}
      {lessons.length === 1 && lessons[0] ? (
        <p className="export-single">
          <span className="export-single-label">Lesson</span>
          {twoDigits(lessons[0].order)} · {lessons[0].displayTitle}
        </p>
      ) : (
        <div className="export-range">
          <div className="export-field">
            <label htmlFor={`${ids}-from`}>From</label>
            <select
              id={`${ids}-from`}
              value={fromId}
              onChange={(event) => {
                setFromId(event.target.value);
                choiceChanged();
              }}
              aria-describedby={backwards ? rangeError : undefined}
              aria-invalid={backwards || undefined}
            >
              {lessons.map(option)}
            </select>
          </div>
          <div className="export-field">
            <label htmlFor={`${ids}-to`}>To</label>
            <select
              id={`${ids}-to`}
              value={toId}
              onChange={(event) => {
                setToId(event.target.value);
                choiceChanged();
              }}
              aria-describedby={backwards ? rangeError : undefined}
              aria-invalid={backwards || undefined}
            >
              {lessons.map(option)}
            </select>
          </div>
        </div>
      )}
      {backwards && (
        <p id={rangeError} className="export-range-error">
          From must be at or before To. Change one of them to export.
        </p>
      )}

      <fieldset className="export-conversations">
        <legend>AI feedback conversations</legend>
        {CONVERSATION_CHOICES.map((choice) => (
          <label key={choice.value} className="export-radio">
            <input
              type="radio"
              name={`${ids}-conversations`}
              value={choice.value}
              checked={conversations === choice.value}
              onChange={() => {
                setConversations(choice.value);
                choiceChanged();
              }}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="export-actions">
        <button
          type="button"
          className="export-button"
          disabled={backwards || preparing}
          onClick={() => void exportWork()}
        >
          Export
        </button>
        <p role="status" className="export-status">
          {preparing ? 'Preparing…' : outcome.state === 'downloaded' ? 'Downloaded' : ''}
        </p>
      </div>
      {outcome.state === 'failed' && (
        <p role="alert" className="notice export-failure">
          {outcome.message}
        </p>
      )}
    </section>
  );
}
