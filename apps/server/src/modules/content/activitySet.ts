/**
 * Reads the release's `trial-activities.json` into the activities a reader is shown.
 *
 * The file's bytes have been hash-verified on every start since slice 1; this turns them into
 * values. Nothing is coerced: a field of the wrong type is a refusal naming that field, because an
 * activity that reaches the page as `"undefined"` is a defect the owner has to discover by reading,
 * where a refusal names the file and the field.
 *
 * Only the fields the reader is shown come out. `prompt_scope`, `grading`, `formal_evidence_award`
 * and `lesson_version` stay in the file: each is either a note to this app's builder or a claim
 * about a surface that does not exist yet, and a field that never leaves here can never leak.
 */

/** One activity, in the shape the lesson answer carries it. */
export interface LessonActivity {
  readonly activityId: string;
  /** The lesson's `candidate_lesson_id` — the release's own `lesson_key_field`. */
  readonly lessonId: string;
  readonly kind: string;
  readonly title: string;
  /** The heading the author wants the recording fields placed beside. */
  readonly sourceHeading: string;
  readonly responseFields: readonly string[];
  /** Rendered only where the authored section is absent; see docs/specs/activity-placement.md. */
  readonly promptMarkdown: string;
}

export type ActivitySetParse =
  | { readonly ok: true; readonly activities: readonly LessonActivity[] }
  /** The parser's own complaint, carried whole: a constant of ours would name nothing. */
  | { readonly ok: false; readonly detail: string };

const REQUIRED_TEXT_FIELDS = [
  'activity_id',
  'lesson_id',
  'kind',
  'title',
  'source_heading',
  'prompt_markdown',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseActivitySet(sourceText: string): ActivitySetParse {
  let raw: unknown;
  try {
    raw = JSON.parse(sourceText);
  } catch (error) {
    return { ok: false, detail: (error as Error).message };
  }

  if (!isRecord(raw) || !Array.isArray(raw.activities)) {
    return {
      ok: false,
      detail: 'the top level is not an object carrying an activities array',
    };
  }

  const activities: LessonActivity[] = [];
  for (const [index, entry] of raw.activities.entries()) {
    if (!isRecord(entry)) {
      return { ok: false, detail: `activity ${index + 1} is not an object` };
    }

    const named = typeof entry.activity_id === 'string' ? entry.activity_id : `${index + 1}`;

    for (const field of REQUIRED_TEXT_FIELDS) {
      const value = entry[field];
      if (typeof value !== 'string' || value === '') {
        return { ok: false, detail: `activity ${named} has no ${field}, or it is not text` };
      }
    }

    const responseFields = entry.response_fields;
    if (!Array.isArray(responseFields) || responseFields.some((one) => typeof one !== 'string')) {
      return {
        ok: false,
        detail: `activity ${named} has response_fields that are not a list of names`,
      };
    }

    activities.push({
      activityId: entry.activity_id as string,
      lessonId: entry.lesson_id as string,
      kind: entry.kind as string,
      title: entry.title as string,
      sourceHeading: entry.source_heading as string,
      responseFields: responseFields as string[],
      promptMarkdown: entry.prompt_markdown as string,
    });
  }

  return { ok: true, activities };
}

/** One lesson's activities, in the order the author's file lists them. */
export function activitiesForLesson(
  activities: readonly LessonActivity[],
  candidateLessonId: string,
): readonly LessonActivity[] {
  return activities.filter((activity) => activity.lessonId === candidateLessonId);
}
